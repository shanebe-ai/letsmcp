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
    return typeof input.text === 'string';
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
                // Validate input type
                if (!validateEchoTextInput(args)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: Invalid input. Expected { text: string }.',
                            },
                        ],
                        isError: true,
                    };
                }

                const input: EchoTextInput = args;

                // Check for empty input and provide friendly error
                if (!input.text || input.text.trim().length === 0) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Oops! It looks like you sent me empty text. Please provide some text to echo back. 😊',
                            },
                        ],
                        isError: true,
                    };
                }

                // Return structured response
                const response = {
                    echoed: input.text
                };

                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: JSON.stringify(response, null, 2),
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
                    // Resolve path relative to project root (current working directory)
                    const resolvedPath = path.resolve(process.cwd(), input.path);

                    // Check if path exists
                    try {
                        await fs.access(resolvedPath);
                    } catch {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `The directory "${input.path}" doesn't seem to exist. Please check the path and try again. 📁`,
                                },
                            ],
                            isError: true,
                        };
                    }

                    // Read directory entries
                    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });

                    // Separate files and directories
                    const files = entries.filter(e => e.isFile());
                    const directories = entries.filter(e => e.isDirectory());

                    const totalFiles = files.length;
                    const totalDirs = directories.length;
                    const totalItems = entries.length;

                    // Limit to 20 items for display
                    const displayLimit = 20;
                    const itemsToShow = entries.slice(0, displayLimit);

                    // Get a few example names
                    const exampleFiles = files.slice(0, 3).map(f => f.name);
                    const exampleDirs = directories.slice(0, 3).map(d => d.name);

                    // Build plain-text summary
                    let summary = `Directory: ${input.path}\n\n`;
                    summary += `Found ${totalFiles} file${totalFiles !== 1 ? 's' : ''} and ${totalDirs} director${totalDirs !== 1 ? 'ies' : 'y'} (${totalItems} total)\n\n`;

                    if (exampleFiles.length > 0) {
                        summary += `Example files: ${exampleFiles.join(', ')}\n`;
                    }
                    if (exampleDirs.length > 0) {
                        summary += `Example directories: ${exampleDirs.join(', ')}\n`;
                    }

                    if (totalItems > displayLimit) {
                        summary += `\nShowing first ${displayLimit} of ${totalItems} items:\n`;
                    } else if (totalItems > 0) {
                        summary += `\nAll items:\n`;
                    }

                    // List items (up to 20)
                    if (itemsToShow.length > 0) {
                        const itemList = itemsToShow.map(item =>
                            `  ${item.isDirectory() ? '📁' : '📄'} ${item.name}`
                        ).join('\n');
                        summary += itemList;
                    }

                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: summary,
                            },
                        ],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Oops! Something went wrong reading "${input.path}": ${errorMessage}`,
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
