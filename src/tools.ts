import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Echo text tool - returns the provided text
 */
export async function echoText(server: Server) {
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === 'echoText') {
            const args = request.params.arguments as Record<string, unknown>;
            const text = args.text as string;

            return {
                content: [
                    {
                        type: 'text',
                        text: `Echo: ${text}`,
                    },
                ],
            };
        }

        // Pass through to other handlers
        throw new Error(`Unknown tool: ${request.params.name}`);
    });
}

/**
 * Summarize directory tool - lists files in a directory
 */
export async function summarizeDirectory(server: Server) {
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === 'summarizeDirectory') {
            const args = request.params.arguments as Record<string, unknown>;
            const dirPath = args.path as string;

            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                const summary = await Promise.all(
                    entries.map(async (entry) => {
                        const fullPath = path.join(dirPath, entry.name);
                        const stats = await fs.stat(fullPath);
                        return {
                            name: entry.name,
                            type: entry.isDirectory() ? 'directory' : 'file',
                            size: stats.size,
                        };
                    })
                );

                const summaryText = summary
                    .map((item) => `${item.name} (${item.type}, ${item.size} bytes)`)
                    .join('\n');

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Directory: ${dirPath}\n\n${summaryText}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error reading directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        }

        throw new Error(`Unknown tool: ${request.params.name}`);
    });
}

/**
 * Register all tools with the server
 */
export function registerTools(server: Server) {
    // Register tools list
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'echoText',
                    description: 'Echoes back the provided text',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                description: 'Text to echo back',
                            },
                        },
                        required: ['text'],
                    },
                },
                {
                    name: 'summarizeDirectory',
                    description: 'Lists files in a directory with their metadata',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Directory path to summarize',
                            },
                        },
                        required: ['path'],
                    },
                },
            ],
        };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const args = request.params.arguments as Record<string, unknown>;

        switch (request.params.name) {
            case 'echoText': {
                const text = args.text as string;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Echo: ${text}`,
                        },
                    ],
                };
            }

            case 'summarizeDirectory': {
                const dirPath = args.path as string;

                try {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });
                    const summary = await Promise.all(
                        entries.map(async (entry) => {
                            const fullPath = path.join(dirPath, entry.name);
                            const stats = await fs.stat(fullPath);
                            return {
                                name: entry.name,
                                type: entry.isDirectory() ? 'directory' : 'file',
                                size: stats.size,
                            };
                        })
                    );

                    const summaryText = summary
                        .map((item) => `${item.name} (${item.type}, ${item.size} bytes)`)
                        .join('\n');

                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Directory: ${dirPath}\n\n${summaryText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error reading directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }

            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    });
}
