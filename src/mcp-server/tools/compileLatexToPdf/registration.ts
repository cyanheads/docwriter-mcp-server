/**
 * @fileoverview Handles the registration of the `docwriter_compile_latex_to_pdf` tool
 * with an MCP server instance.
 * @module src/mcp-server/tools/compileLatexToPdf/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import {
  compileLatexToPdfLogic,
  CompileLatexToPdfInput,
  CompileLatexToPdfInputSchema,
} from "./logic.js";

/**
 * Registers the 'docwriter_compile_latex_to_pdf' tool and its handler with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance to register the tool with.
 * @returns {Promise<void>} A promise that resolves when tool registration is complete.
 */
export const registerCompileLatexToPdfTool = async (
  server: McpServer,
): Promise<void> => {
  const toolName = "docwriter_compile_latex_to_pdf";
  const toolDescription =
    "Compiles a .tex document into a PDF. This is a potentially long-running operation that handles complex documents requiring multiple passes.";

  const registrationContext: RequestContext =
    requestContextService.createRequestContext({
      operation: "RegisterTool",
      toolName: toolName,
    });

  logger.info(`Registering tool: '${toolName}'`, registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        toolName,
        toolDescription,
        CompileLatexToPdfInputSchema.shape,
        async (
          params: CompileLatexToPdfInput,
          mcpContext: any,
        ): Promise<CallToolResult> => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentRequestId: registrationContext.requestId,
              operation: "HandleToolRequest",
              toolName: toolName,
              mcpToolContext: mcpContext,
              input: params,
            });

          try {
            const result = await compileLatexToPdfLogic(params, handlerContext);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
              isError: false,
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "compileLatexToPdfToolHandler",
              context: handlerContext,
              input: params,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while compiling the LaTeX document.",
                    { originalErrorName: handledError.name },
                  );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: {
                      code: mcpError.code,
                      message: mcpError.message,
                      details: mcpError.details,
                    },
                  }),
                },
              ],
              isError: true,
            };
          }
        },
      );

      logger.info(`Tool '${toolName}' registered successfully.`, registrationContext);
    },
    {
      operation: `RegisteringTool_${toolName}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
};
