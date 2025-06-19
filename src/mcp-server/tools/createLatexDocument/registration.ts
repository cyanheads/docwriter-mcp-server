/**
 * @fileoverview Handles the registration of the `docwriter_create_latex_document` tool
 * with an MCP server instance.
 * @module src/mcp-server/tools/docwriter_create_latex_document/registration
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
  createLatexDocumentLogic,
  CreateLatexDocumentInput,
  CreateLatexDocumentInputSchema,
} from "./logic.js";

/**
 * Registers the 'docwriter_create_latex_document' tool and its handler with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance to register the tool with.
 * @returns {Promise<void>} A promise that resolves when tool registration is complete.
 */
export const registerCreateLatexDocumentTool = async (
  server: McpServer,
): Promise<void> => {
  const toolName = "docwriter_create_latex_document";
  const toolDescription =
    "Bootstraps a new, structured LaTeX document from a specified template. This tool creates a new .tex file, populates metadata placeholders (title, author), and saves it to the server's data directory. It returns the document's ID and its full initial content, including all named content blocks, which is essential for making subsequent updates with other tools. This is the first step in any document creation workflow.";

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
        CreateLatexDocumentInputSchema.shape,
        async (
          params: CreateLatexDocumentInput,
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
            const result = await createLatexDocumentLogic(
              params,
              handlerContext,
            );
            return {
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
              isError: false,
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "createLatexDocumentToolHandler",
              context: handlerContext,
              input: params,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while creating the LaTeX document.",
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

      logger.info(
        `Tool '${toolName}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${toolName}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
};
