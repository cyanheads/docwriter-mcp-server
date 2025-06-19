/**
 * @fileoverview Core logic for the docwriter_update_document_block tool.
 * This module handles updating a specific content block within an existing LaTeX document.
 * @module src/mcp-server/tools/updateDocumentBlock/logic
 */

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";
import { sanitization } from "../../../utils/security/index.js";

/**
 * Zod schema for validating input arguments for the `docwriter_update_document_block` tool.
 */
export const UpdateDocumentBlockInputSchema = z.object({
  documentId: z
    .string()
    .describe(
      "The unique identifier for the document to be updated. This corresponds to the filename without the .tex extension.",
    ),
  blocks: z
    .array(
      z.object({
        blockName: z
          .string()
          .describe(
            "The name of the block to update (e.g., 'abstract', 'introduction'). Must match a defined block in the document.",
          ),
        content: z
          .string()
          .describe(
            "The new LaTeX content for the block. All content will be sanitized to prevent injection attacks.",
          ),
      }),
    )
    .min(1)
    .describe("An array of one or more blocks to update in the document."),
});

/**
 * TypeScript type inferred from `UpdateDocumentBlockInputSchema`.
 */
export type UpdateDocumentBlockInput = z.infer<
  typeof UpdateDocumentBlockInputSchema
>;

/**
 * Defines the structure of the JSON payload returned by the `updateDocumentBlockLogic` tool handler.
 */
export interface UpdateDocumentBlockResponse {
  status: "updated";
  documentId: string;
  blocksUpdated: string[];
}

/**
 * Processes the core logic for the `docwriter_update_document_block` tool.
 * @param {UpdateDocumentBlockInput} params - The validated input parameters for the tool.
 * @param {RequestContext} context - The request context for logging and tracing.
 * @returns {Promise<UpdateDocumentBlockResponse>} A promise that resolves to an object containing the update status.
 * @throws {McpError} If the document or block is not found, or a file system error occurs.
 */
export async function updateDocumentBlockLogic(
  params: UpdateDocumentBlockInput,
  context: RequestContext,
): Promise<UpdateDocumentBlockResponse> {
  logger.debug("Processing update_document_block logic.", {
    ...context,
    toolInput: params,
  });

  const { documentId, blocks } = params;
  const docPath = path.join(config.docwriterDataPath, `${documentId}.tex`);

  // 1. Read the document content
  let docContent: string;
  try {
    docContent = await fs.readFile(docPath, "utf-8");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new McpError(
        BaseErrorCode.NOT_FOUND,
        `Document with ID '${documentId}' not found.`,
        { documentId, context },
      );
    }
    throw new McpError(
      BaseErrorCode.FILE_SYSTEM_ERROR,
      "Failed to read document.",
      { originalError: error, context },
    );
  }

  let updatedDocContent = docContent;
  const updatedBlocks: string[] = [];

  // 2. Iterate over the blocks and update them
  for (const block of blocks) {
    const { blockName, content } = block;
    const sanitizedContent = sanitization.sanitizeLatex(content);
    const blockRegex = new RegExp(
      `(%% -- BLOCK: ${blockName} -- %%)(.*?)(%% -- ENDBLOCK: ${blockName} -- %%)`,
      "s",
    );

    if (!blockRegex.test(updatedDocContent)) {
      throw new McpError(
        BaseErrorCode.BLOCK_NOT_FOUND,
        `Block '${blockName}' not found in document '${documentId}'.`,
        { documentId, blockName, context },
      );
    }

    updatedDocContent = updatedDocContent.replace(
      blockRegex,
      `$1\n${sanitizedContent}\n$3`,
    );
    updatedBlocks.push(blockName);
  }

  // 3. Save the updated content back to the file
  try {
    await fs.writeFile(docPath, updatedDocContent, "utf-8");
    logger.info(
      `Blocks '${updatedBlocks.join(", ")}' in document '${documentId}' updated successfully.`,
      context,
    );
  } catch (error) {
    throw new McpError(
      BaseErrorCode.FILE_SYSTEM_ERROR,
      `Failed to write updated document to path: ${docPath}`,
      { originalError: error, context },
    );
  }

  const toolResponse: UpdateDocumentBlockResponse = {
    status: "updated",
    documentId,
    blocksUpdated: updatedBlocks,
  };

  logger.notice("Document blocks updated successfully.", {
    ...context,
    documentId: toolResponse.documentId,
    blocksUpdated: toolResponse.blocksUpdated,
  });

  return toolResponse;
}
