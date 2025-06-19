/**
 * @fileoverview Core logic for the docwriter_search_replace tool.
 * This module handles searching for and replacing text within a LaTeX document.
 * @module src/mcp-server/tools/searchAndReplace/logic
 */

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";
import { sanitization } from "../../../utils/security/index.js";

/**
 * Zod schema for validating input arguments for the `docwriter_search_replace` tool.
 */
export const SearchAndReplaceInputSchema = z.object({
  documentId: z.string().describe("The ID of the document to update."),
  searchTerm: z.string().describe("The text to search for."),
  replacementText: z
    .string()
    .describe("The text to replace the search term with."),
});

/**
 * TypeScript type inferred from `SearchAndReplaceInputSchema`.
 */
export type SearchAndReplaceInput = z.infer<typeof SearchAndReplaceInputSchema>;

/**
 * Defines the structure of the JSON payload returned by the `searchAndReplaceLogic` tool handler.
 */
export interface SearchAndReplaceResponse {
  status: "replaced";
  documentId: string;
  occurrences: number;
}

/**
 * Processes the core logic for the `docwriter_search_replace` tool.
 * @param {SearchAndReplaceInput} params - The validated input parameters for the tool.
 * @param {RequestContext} context - The request context for logging and tracing.
 * @returns {Promise<SearchAndReplaceResponse>} A promise that resolves to an object containing the replacement status.
 * @throws {McpError} If the document is not found or a file system error occurs.
 */
export async function searchAndReplaceLogic(
  params: SearchAndReplaceInput,
  context: RequestContext,
): Promise<SearchAndReplaceResponse> {
  logger.debug("Processing search_and_replace logic.", {
    ...context,
    toolInput: params,
  });

  const { documentId, searchTerm, replacementText } = params;
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

  // 2. Sanitize the replacement text
  const sanitizedReplacement = sanitization.sanitizeLatex(replacementText);

  // 3. Perform the search and replace
  const regex = new RegExp(searchTerm, "g");
  const occurrences = (docContent.match(regex) || []).length;
  const updatedContent = docContent.replace(regex, sanitizedReplacement);

  if (occurrences === 0) {
    logger.warning(
      `Search term "${searchTerm}" not found in document '${documentId}'.`,
      context,
    );
  }

  // 4. Save the updated content back to the file
  try {
    await fs.writeFile(docPath, updatedContent, "utf-8");
    logger.info(`Document '${documentId}' updated successfully.`, context);
  } catch (error) {
    throw new McpError(
      BaseErrorCode.FILE_SYSTEM_ERROR,
      `Failed to write updated document to path: ${docPath}`,
      { originalError: error, context },
    );
  }

  const toolResponse: SearchAndReplaceResponse = {
    status: "replaced",
    documentId,
    occurrences,
  };

  logger.notice("Document updated successfully.", {
    ...context,
    documentId: toolResponse.documentId,
    occurrences: toolResponse.occurrences,
  });

  return toolResponse;
}
