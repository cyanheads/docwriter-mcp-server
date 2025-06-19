/**
 * @fileoverview Handles the registration of the `docwriter_update_document_block` tool
 * with an MCP server instance.
 * @module src/mcp-server/tools/updateDocumentBlock/registration
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
  UpdateDocumentBlockInput,
  UpdateDocumentBlockInputSchema,
  updateDocumentBlockLogic,
} from "./logic.js";

/**
 * Registers the 'docwriter_update_document_block' tool and its handler with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance to register the tool with.
 * @returns {Promise<void>} A promise that resolves when tool registration is complete.
 */
export const registerUpdateDocumentBlockTool = async (
  server: McpServer,
): Promise<void> => {
  const toolName = "docwriter_update_document_block";
  const toolDescription =
    "Atomically updates one or more named content blocks (e.g., 'abstract', 'introduction') within an existing LaTeX document. This is the standard and safest method for structured content modification, as it targets specific, predefined sections. To use this tool, you must know the `documentId` and the exact `blockName`(s) you intend to modify. All provided content is automatically sanitized to prevent LaTeX injection attacks.";

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
        UpdateDocumentBlockInputSchema.shape,
        async (
          params: UpdateDocumentBlockInput,
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
            const result = await updateDocumentBlockLogic(
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
              operation: "updateDocumentBlockToolHandler",
              context: handlerContext,
              input: params,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while updating the document block.",
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
