/**
 * @fileoverview Core logic for the docwriter_create_latex_document tool.
 * This module handles the creation of a new LaTeX document from a template,
 * replacing placeholders and saving it to the configured data path.
 * @module src/mcp-server/tools/docwriter_create_latex_document/logic
 */

import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";

/**
 * Zod schema for validating input arguments for the `docwriter_create_latex_document` tool.
 */
export const CreateLatexDocumentInputSchema = z.object({
  title: z.string().describe("The main title for the document."),
  author: z.string().describe("The name of the primary author."),
  documentId: z
    .string()
    .optional()
    .describe(
      "An optional unique ID for the document. If not provided, a UUID will be generated.",
    ),
  template: z
    .enum(["simple_report", "ieee_article"])
    .default("simple_report")
    .describe(
      "The base template to use. The tool will return the full content of the template file, including all defined content blocks so you have a complete document structure.",
    ),
});

/**
 * TypeScript type inferred from `CreateLatexDocumentInputSchema`.
 */
export type CreateLatexDocumentInput = z.infer<
  typeof CreateLatexDocumentInputSchema
>;

/**
 * Defines the structure of the JSON payload returned by the `createLatexDocumentLogic` tool handler.
 */
export interface CreateLatexDocumentResponse {
  status: "created";
  documentId: string;
  documentContent: string;
}

/**
 * Processes the core logic for the `docwriter_create_latex_document` tool.
 * @param {CreateLatexDocumentInput} params - The validated input parameters for the tool.
 * @param {RequestContext} context - The request context for logging and tracing.
 * @returns {Promise<CreateLatexDocumentResponse>} A promise that resolves to an object containing the creation status and document details.
 * @throws {McpError} If the template is not found, the document already exists, or a file system error occurs.
 */
export async function createLatexDocumentLogic(
  params: CreateLatexDocumentInput,
  context: RequestContext,
): Promise<CreateLatexDocumentResponse> {
  logger.debug("Processing create_latex_document logic.", { ...context, toolInput: params });

  const documentId = params.documentId || uuidv4();
  const docPath = path.join(config.docwriterDataPath, `${documentId}.tex`);

  // 1. Check if document already exists
  try {
    await fs.access(docPath);
    throw new McpError(
      BaseErrorCode.DOCUMENT_ALREADY_EXISTS,
      `Document with ID '${documentId}' already exists.`,
      { documentId, context },
    );
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw new McpError(
        BaseErrorCode.FILE_SYSTEM_ERROR,
        "Failed to check for existing document.",
        { originalError: error, context },
      );
    }
    // File doesn't exist, which is the desired state.
  }

  // 2. Load the template file
  const templatePath = path.resolve(
    process.cwd(),
    "templates",
    `${params.template}.tex`,
  );
  let templateContent: string;
  try {
    templateContent = await fs.readFile(templatePath, "utf-8");
    logger.info(`Template '${params.template}' loaded successfully.`, context);
  } catch (error) {
    throw new McpError(
      BaseErrorCode.TEMPLATE_NOT_FOUND,
      `Template '${params.template}' not found at path: ${templatePath}`,
      { originalError: error, context },
    );
  }

  // 3. Replace placeholders
  const documentContent = templateContent
    .replace(/{{TITLE}}/g, params.title)
    .replace(/{{AUTHOR}}/g, params.author);

  // 4. Save the new content to a file
  try {
    await fs.writeFile(docPath, documentContent, "utf-8");
    logger.info(`Document '${documentId}' created successfully at ${docPath}`, context);
  } catch (error) {
    throw new McpError(
      BaseErrorCode.FILE_SYSTEM_ERROR,
      `Failed to write document to path: ${docPath}`,
      { originalError: error, context },
    );
  }

  const toolResponse: CreateLatexDocumentResponse = {
    status: "created",
    documentId,
    documentContent,
  };

  logger.notice("LaTeX document created and processed successfully.", {
    ...context,
    documentId: toolResponse.documentId,
  });

  return toolResponse;
}
