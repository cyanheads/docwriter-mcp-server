/**
 * @fileoverview Handles the registration of the `docwriter_list_latex_documents` tool
 * with an MCP server instance.
 * @module src/mcp-server/tools/listLatexDocuments/registration
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
  listLatexDocumentsLogic,
  ListLatexDocumentsInput,
  ListLatexDocumentsInputSchema,
} from "./logic.js";

/**
 * Registers the 'docwriter_list_latex_documents' tool and its handler with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance to register the tool with.
 * @returns {Promise<void>} A promise that resolves when tool registration is complete.
 */
export const registerListLatexDocumentsTool = async (
  server: McpServer,
): Promise<void> => {
  const toolName = "docwriter_list_latex_documents";
  const toolDescription =
    "Retrieves a list of all .tex documents from the data directory.";

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
        ListLatexDocumentsInputSchema.shape,
        async (
          params: ListLatexDocumentsInput,
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
            const result = await listLatexDocumentsLogic(params, handlerContext);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
              isError: false,
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "listLatexDocumentsToolHandler",
              context: handlerContext,
              input: params,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while listing the LaTeX documents.",
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
