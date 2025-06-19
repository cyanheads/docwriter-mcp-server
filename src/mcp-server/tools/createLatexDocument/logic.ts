/**
 * @fileoverview Core logic for the docwriter_create_latex_document tool.
 * This module handles the creation of a new LaTeX document from a template,
 * replacing placeholders and saving it to the configured data path.
 * @module src/mcp-server/tools/docwriter_create_latex_document/logic
 */

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { config, projectRootPath } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";
import { sanitization } from "../../../utils/security/index.js";

/**
 * Zod schema for validating input arguments for the `docwriter_create_latex_document` tool.
 */
export const CreateLatexDocumentInputSchema = z.object({
  title: z
    .string()
    .describe(
      "The main title for the document. This will be sanitized and placed in the 'title' placeholder of the template.",
    ),
  author: z
    .string()
    .describe(
      "The name of the primary author. This will be sanitized and placed in the 'author' placeholder of the template.",
    ),
  filename: z
    .string()
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Filename must be alphanumeric, with optional underscores or hyphens.",
    )
    .describe(
      "The unique, URL-safe filename for the document, without the .tex extension. This will be used as the documentId. Example: 'q1-research-summary-2024-06-19'",
    ),
  template: z
    .enum(["simple_report", "ieee_article", "research_report"])
    .default("simple_report")
    .describe(
      "The base template to use. The tool returns the full content of the created file, giving you a complete view of the document's structure and all its named content blocks for future updates.",
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
  logger.debug("Processing create_latex_document logic.", {
    ...context,
    toolInput: params,
  });

  const documentId = params.filename;
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
  const templatePath = path.join(
    projectRootPath,
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

  // 3. Sanitize and replace placeholders
  const sanitizedTitle = sanitization.sanitizeLatex(params.title);
  const sanitizedAuthor = sanitization.sanitizeLatex(params.author);

  const documentContent = templateContent
    .replace(/{{TITLE}}/g, sanitizedTitle)
    .replace(/{{AUTHOR}}/g, sanitizedAuthor);

  // 4. Save the new content to a file
  try {
    await fs.writeFile(docPath, documentContent, "utf-8");
    logger.info(
      `Document '${documentId}' created successfully at ${docPath}`,
      context,
    );
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
