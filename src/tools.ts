import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Type definitions for tool inputs
 */

// echoText tool input
export interface EchoTextInput {
    text: string;
}

// summarizeDirectory tool input
export interface SummarizeDirectoryInput {
    path: string;
}

// Directory entry type for internal use
export interface DirectoryEntry {
    name: string;
    type: 'file' | 'directory';
    size: number;
}

/**
 * Validation helpers
 */
function validateEchoTextInput(args: unknown): args is EchoTextInput {
    const input = args as Record<string, unknown>;
    return typeof input.text === 'string' && input.text.length > 0;
}

function validateSummarizeDirectoryInput(args: unknown): args is SummarizeDirectoryInput {
    const input = args as Record<string, unknown>;
    return typeof input.path === 'string' && input.path.length > 0;
}

/**
 * Register all tools with the server
 */
export function registerTools(server: Server) {
    // Register tools list with proper JSON schemas
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'echoText',
                    description: 'Echoes back the provided text. Useful for testing and verification.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                description: 'The text to echo back',
                                minLength: 1,
                            },
                        },
                        required: ['text'],
                        additionalProperties: false,
                    },
                },
                {
                    name: 'summarizeDirectory',
                    description: 'Lists all files and subdirectories in the specified directory with their metadata (name, type, size in bytes).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Absolute or relative path to the directory to summarize',
                                minLength: 1,
                            },
                        },
                        required: ['path'],
                        additionalProperties: false,
                    },
                },
            ],
        };
    });

    // Register tool call handler with validation
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const args = request.params.arguments as Record<string, unknown>;

        switch (request.params.name) {
            case 'echoText': {
                // Validate input
                if (!validateEchoTextInput(args)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: Invalid input. Expected { text: string } where text is non-empty.',
                            },
                        ],
                        isError: true,
                    };
                }

                // Execute tool with typed input
                const input: EchoTextInput = args;
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `Echo: ${input.text}`,
                        },
                    ],
                };
            }

            case 'summarizeDirectory': {
                // Validate input
                if (!validateSummarizeDirectoryInput(args)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: Invalid input. Expected { path: string } where path is non-empty.',
                            },
                        ],
                        isError: true,
                    };
                }

                const input: SummarizeDirectoryInput = args;

                try {
                    // Read directory with proper error handling
                    const entries = await fs.readdir(input.path, { withFileTypes: true });

                    // Build directory entry list with types
                    const directoryEntries: DirectoryEntry[] = await Promise.all(
                        entries.map(async (entry) => {
                            const fullPath = path.join(input.path, entry.name);
                            const stats = await fs.stat(fullPath);
                            return {
                                name: entry.name,
                                type: entry.isDirectory() ? 'directory' as const : 'file' as const,
                                size: stats.size,
                            };
                        })
                    );

                    // Format output
                    const summaryLines = directoryEntries.map(
                        (item) => `${item.name} (${item.type}, ${item.size.toLocaleString()} bytes)`
                    );

                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: `Directory: ${input.path}\n\nTotal items: ${directoryEntries.length}\n\n${summaryLines.join('\n')}`,
                            },
                        ],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error reading directory "${input.path}": ${errorMessage}`,
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
