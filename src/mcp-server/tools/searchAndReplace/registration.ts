/**
 * @fileoverview Handles the registration of the `docwriter_search_replace` tool
 * with an MCP server instance.
 * @module src/mcp-server/tools/searchAndReplace/registration
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
  searchAndReplaceLogic,
  SearchAndReplaceInput,
  SearchAndReplaceInputSchema,
} from "./logic.js";

/**
 * Registers the 'docwriter_search_replace' tool and its handler with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance to register the tool with.
 * @returns {Promise<void>} A promise that resolves when tool registration is complete.
 */
export const registerSearchAndReplaceTool = async (
  server: McpServer,
): Promise<void> => {
  const toolName = "docwriter_search_replace";
  const toolDescription =
    "Searches for and replaces text within a LaTeX document. This is suitable for simple, global text replacements.";

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
        SearchAndReplaceInputSchema.shape,
        async (
          params: SearchAndReplaceInput,
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
            const result = await searchAndReplaceLogic(params, handlerContext);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
              isError: false,
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "searchAndReplaceToolHandler",
              context: handlerContext,
              input: params,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while performing the search and replace operation.",
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
