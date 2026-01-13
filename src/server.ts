import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './tools.js';

// Configuration from environment
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
    const server = new Server(
        {
            name: 'letsmcp',
            version: '1.1.0',
        },
        {
            capabilities: {
                tools: {},
                resources: {},
            },
        }
    );

    // Register all tools
    registerTools(server);

    // Register resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return {
            resources: [
                {
                    uri: 'server://info',
                    name: 'Server Information',
                    description: 'Information about this MCP server',
                    mimeType: 'text/plain',
                },
            ],
        };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        if (request.params.uri === 'server://info') {
            return {
                contents: [
                    {
                        uri: 'server://info',
                        mimeType: 'text/plain',
                        text: `letsmcp MCP Server v1.1.0
Running on: ${HOST}:${PORT}
Capabilities: Tools, Resources
Available Tools: echoText, summarizeDirectory
Available Resources: server://info`,
                    },
                ],
            };
        }

        throw new Error(`Unknown resource: ${request.params.uri}`);
    });

    return server;
}
