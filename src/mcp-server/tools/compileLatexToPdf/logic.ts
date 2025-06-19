/**
 * @fileoverview Core logic for the docwriter_compile_latex_to_pdf tool.
 * This module handles compiling a LaTeX document to a PDF, with automatic
 * support for bibliography processing via Biber.
 * @module src/mcp-server/tools/compileLatexToPdf/logic
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";

/**
 * Zod schema for validating input arguments for the `docwriter_compile_latex_to_pdf` tool.
 */
export const CompileLatexToPdfInputSchema = z.object({
  documentId: z
    .string()
    .describe(
      "The unique identifier of the document to compile. The tool automatically detects if a bibliography is present and runs the necessary compilation steps (e.g., Biber).",
    ),
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
 * Spawns and manages a child process for compilation steps.
 * @param {string} command - The command to run (e.g., 'lualatex', 'biber').
 * @param {string[]} args - The arguments for the command.
 * @param {string} cwd - The working directory for the process.
 * @returns {Promise<void>} A promise that resolves on successful execution or rejects on failure.
 */
const runProcess = (
  command: string,
  args: string[],
  cwd: string,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(command, args, { cwd });
    let stdout = "";
    let stderr = "";
    process.stdout.on("data", (data) => (stdout += data.toString()));
    process.stderr.on("data", (data) => (stderr += data.toString()));
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} process exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`,
          ),
        );
      }
    });
    process.on("error", (err) => reject(err));
  });
};

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

  // 1. Check if document exists and read its content
  let docContent: string;
  try {
    docContent = await fs.readFile(docPath, "utf-8");
  } catch (error) {
    throw new McpError(
      BaseErrorCode.NOT_FOUND,
      `Document with ID '${documentId}' not found.`,
      { documentId, context },
    );
  }

  // 2. Detect if there is a bibliography to process and prepare the file
  const bibBlockRegex =
    /%% -- BLOCK: bibliography -- %%(.*?)%% -- ENDBLOCK: bibliography -- %%/s;
  const bibMatch = docContent.match(bibBlockRegex);
  const hasBibliography = bibMatch
    ? bibMatch[1].trim().replace(/%.*/g, "").trim() !== ""
    : false;

  if (hasBibliography) {
    const bibContent = bibMatch![1];
    // Use filecontents to dynamically create the .bib file during compilation
    const newDocContent = docContent.replace(
      bibBlockRegex,
      `\\begin{filecontents}[overwrite]{${documentId}.bib}
${bibContent}
\\end{filecontents}
\\addbibresource{${documentId}.bib}`,
    );
    await fs.writeFile(docPath, newDocContent, "utf-8");
    logger.info(
      `Bibliography block found and prepared for document: ${documentId}`,
      context,
    );
  }

  // 3. Compile the document
  const lualatexArgs = [
    "-interaction=nonstopmode",
    "-file-line-error",
    docPath,
  ];

  try {
    if (hasBibliography) {
      logger.info(
        `Running full bibliography compilation cycle for ${documentId}.`,
        context,
      );
      await runProcess("lualatex", lualatexArgs, config.docwriterDataPath);
      await runProcess("biber", [documentId], config.docwriterDataPath);
      await runProcess("lualatex", lualatexArgs, config.docwriterDataPath);
      await runProcess("lualatex", lualatexArgs, config.docwriterDataPath);
    } else {
      logger.info(`Running standard compilation for ${documentId}.`, context);
      await runProcess("lualatex", lualatexArgs, config.docwriterDataPath);
      await runProcess("lualatex", lualatexArgs, config.docwriterDataPath);
    }
  } catch (error: any) {
    let log = "";
    try {
      log = await fs.readFile(logPath, "utf-8");
    } catch (logError) {
      log = "Could not read log file.";
    }
    throw new McpError(
      BaseErrorCode.COMPILATION_FAILED,
      `Failed to compile document '${documentId}'.`,
      { originalError: error, log, context },
    );
  }

  // 4. Read the final log file
  let finalLogContent = "";
  try {
    finalLogContent = await fs.readFile(logPath, "utf-8");
  } catch (error) {
    logger.warning(
      `Could not read final log file for document '${documentId}'.`,
      context,
    );
  }

  // 5. Clean up auxiliary files
  const extensionsToClean = [
    ".aux",
    ".log",
    ".toc",
    ".bcf",
    ".blg",
    ".run.xml",
    "-blx.bib",
  ];
  for (const ext of extensionsToClean) {
    try {
      await fs.unlink(path.join(config.docwriterDataPath, documentId + ext));
    } catch (error) {
      // Ignore errors if files don't exist
    }
  }

  const toolResponse: CompileLatexToPdfResponse = {
    status: "compiled",
    pdfPath,
    log: finalLogContent,
  };

  logger.notice("Document compiled successfully.", {
    ...context,
    documentId,
    withBibliography: hasBibliography,
  });

  return toolResponse;
}
