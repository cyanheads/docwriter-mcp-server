/**
 * @fileoverview Core logic for the docwriter_compile_latex_to_pdf tool.
 * This module handles compiling a LaTeX document to a PDF.
 * @module src/mcp-server/tools/compileLatexToPdf/logic
 */

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Zod schema for validating input arguments for the `docwriter_compile_latex_to_pdf` tool.
 */
export const CompileLatexToPdfInputSchema = z.object({
  documentId: z.string().describe("The ID of the document to compile."),
});

/**
 * TypeScript type inferred from `CompileLatexToPdfInputSchema`.
 */
export type CompileLatexToPdfInput = z.infer<
  typeof CompileLatexToPdfInputSchema
>;

/**
 * Defines the structure of the JSON payload returned by the `compileLatexToPdfLogic` tool handler.
 */
export interface CompileLatexToPdfResponse {
  status: "compiled";
  pdfPath: string;
  log: string;
}

/**
 * Processes the core logic for the `docwriter_compile_latex_to_pdf` tool.
 * @param {CompileLatexToPdfInput} params - The validated input parameters for the tool.
 * @param {RequestContext} context - The request context for logging and tracing.
 * @returns {Promise<CompileLatexToPdfResponse>} A promise that resolves to an object containing the compilation status.
 * @throws {McpError} If the document is not found, compilation fails, or a file system error occurs.
 */
export async function compileLatexToPdfLogic(
  params: CompileLatexToPdfInput,
  context: RequestContext,
): Promise<CompileLatexToPdfResponse> {
  logger.debug("Processing compile_latex_to_pdf logic.", {
    ...context,
    toolInput: params,
  });

  const { documentId } = params;
  const docPath = path.join(config.docwriterDataPath, `${documentId}.tex`);
  const pdfPath = path.join(config.docwriterDataPath, `${documentId}.pdf`);
  const logPath = path.join(config.docwriterDataPath, `${documentId}.log`);

  // 1. Check if document exists
  try {
    await fs.access(docPath);
  } catch (error) {
    throw new McpError(
      BaseErrorCode.NOT_FOUND,
      `Document with ID '${documentId}' not found.`,
      { documentId, context },
    );
  }

  // 2. Compile the document
  const compileCommand = `pdflatex -interaction=nonstopmode -output-directory=${config.docwriterDataPath} ${docPath}`;
  try {
    // Run compilation 3 times to resolve cross-references
    for (let i = 0; i < 3; i++) {
      await execAsync(compileCommand);
    }
  } catch (error: any) {
    let log = "";
    try {
      log = await fs.readFile(logPath, "utf-8");
    } catch (logError) {
      // Log file might not exist if pdflatex failed very early
      log = "Could not read log file.";
    }
    throw new McpError(
      BaseErrorCode.COMPILATION_FAILED,
      `Failed to compile document '${documentId}'.`,
      { originalError: error, log, context },
    );
  }

  // 3. Read the log file
  let logContent = "";
  try {
    logContent = await fs.readFile(logPath, "utf-8");
  } catch (error) {
    logger.warning(
      `Could not read log file for document '${documentId}'.`,
      context,
    );
  }

  // 4. Clean up auxiliary files
  const auxPath = path.join(config.docwriterDataPath, `${documentId}.aux`);
  const tocPath = path.join(config.docwriterDataPath, `${documentId}.toc`);
  try {
    await fs.unlink(logPath);
    await fs.unlink(auxPath);
    await fs.unlink(tocPath);
  } catch (error) {
    // Ignore errors if files don't exist
  }

  const toolResponse: CompileLatexToPdfResponse = {
    status: "compiled",
    pdfPath,
    log: logContent,
  };

  logger.notice("Document compiled successfully.", {
    ...context,
    documentId,
  });

  return toolResponse;
}
