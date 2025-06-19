/**
 * @fileoverview Core logic for the docwriter_list_latex_documents tool.
 * This module handles listing all LaTeX documents in the data directory.
 * @module src/mcp-server/tools/listLatexDocuments/logic
 */

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";

/**
 * Zod schema for validating input arguments for the `docwriter_list_latex_documents` tool.
 */
export const ListLatexDocumentsInputSchema = z.object({});

/**
 * TypeScript type inferred from `ListLatexDocumentsInputSchema`.
 */
export type ListLatexDocumentsInput = z.infer<
  typeof ListLatexDocumentsInputSchema
>;

/**
 * Defines the structure of the JSON payload returned by the `listLatexDocumentsLogic` tool handler.
 */
export interface ListLatexDocumentsResponse {
  documents: string[];
}

/**
 * Processes the core logic for the `docwriter_list_latex_documents` tool.
 * @param {ListLatexDocumentsInput} params - The validated input parameters for the tool.
 * @param {RequestContext} context - The request context for logging and tracing.
 * @returns {Promise<ListLatexDocumentsResponse>} A promise that resolves to an object containing the list of documents.
 * @throws {McpError} If a file system error occurs.
 */
export async function listLatexDocumentsLogic(
  params: ListLatexDocumentsInput,
  context: RequestContext,
): Promise<ListLatexDocumentsResponse> {
  logger.debug("Processing list_latex_documents logic.", { ...context, toolInput: params });

  try {
    const files = await fs.readdir(config.docwriterDataPath);
    const documents = files
      .filter(file => file.endsWith(".tex"))
      .map(file => file.replace(".tex", ""));

    const toolResponse: ListLatexDocumentsResponse = {
      documents,
    };

    logger.notice("Listed LaTeX documents successfully.", {
      ...context,
      documentCount: documents.length,
    });

    return toolResponse;
  } catch (error) {
    throw new McpError(
      BaseErrorCode.FILE_SYSTEM_ERROR,
      "Failed to list documents.",
      { originalError: error, context },
    );
  }
}
