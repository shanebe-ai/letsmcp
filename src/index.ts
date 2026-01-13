import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// Create MCP server instance
const server = new Server(
    {
        name: 'minimal-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// Register tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'add',
                description: 'Add two numbers together',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: {
                            type: 'number',
                            description: 'First number',
                        },
                        b: {
                            type: 'number',
                            description: 'Second number',
                        },
                    },
                    required: ['a', 'b'],
                },
            },
        ],
    };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'add') {
        const args = request.params.arguments as Record<string, unknown>;
        const a = args.a as number;
        const b = args.b as number;
        const result = a + b;

        return {
            content: [
                {
                    type: 'text',
                    text: `The sum of ${a} and ${b} is ${result}`,
                },
            ],
        };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
});

// Register resources/list handler
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

// Register resources/read handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === 'server://info') {
        return {
            contents: [
                {
                    uri: 'server://info',
                    mimeType: 'text/plain',
                    text: `Minimal MCP Server v1.0.0
Running on: ${HOST}:${PORT}
Capabilities: Tools, Resources
Available Tools: add
Available Resources: server://info`,
                },
            ],
        };
    }

    throw new Error(`Unknown resource: ${request.params.uri}`);
});

// Create Express app for health checks
const app = express();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: 'minimal-mcp-server', version: '1.0.0' });
});

// Start HTTP server for health checks
const httpServer = app.listen(PORT, HOST, () => {
    console.error(`HTTP Server running at http://${HOST}:${PORT}`);
    console.error(`Health check: http://${HOST}:${PORT}/health`);
    console.error(`\nMCP Server ready on stdio transport`);
    console.error(`Configure in Claude Desktop/Antigravity as a stdio server`);
});

// Start stdio transport for MCP communication
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.error('\nShutting down...');
    httpServer.close();
    await server.close();
    process.exit(0);
});
