import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

/**
 * Type definitions for tool inputs
 */

// Existing tools
export interface EchoTextInput {
    text: string;
}

export interface SummarizeDirectoryInput {
    path: string;
}

// New tools
export interface SaveToFileInput {
    content: string;
    filename: string;
    category?: string;
    overwrite?: boolean;
}

export interface ReadFileInput {
    path: string;
    encoding?: string;
    maxSize?: number;
}

export interface SearchFilesInput {
    query: string;
    path: string;
    fileTypes?: string[];
    caseSensitive?: boolean;
    maxResults?: number;
    recursive?: boolean;
}

export interface ExecuteCommandInput {
    command: string;
    args?: string[];
    cwd?: string;
    timeout?: number;
}

export interface WebFetchInput {
    url: string;
    selector?: string;
    format?: 'text' | 'html' | 'json';
    timeout?: number;
}

export interface ScrapeLinkedInJobInput {
    url: string;
    includeDescription?: boolean;
    screenshot?: boolean;
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

function validateSaveToFileInput(args: unknown): args is SaveToFileInput {
    const input = args as Record<string, unknown>;
    return typeof input.content === 'string' && typeof input.filename === 'string';
}

function validateReadFileInput(args: unknown): args is ReadFileInput {
    const input = args as Record<string, unknown>;
    return typeof input.path === 'string' && input.path.length > 0;
}

function validateSearchFilesInput(args: unknown): args is SearchFilesInput {
    const input = args as Record<string, unknown>;
    return typeof input.query === 'string' && typeof input.path === 'string';
}

function validateExecuteCommandInput(args: unknown): args is ExecuteCommandInput {
    const input = args as Record<string, unknown>;
    return typeof input.command === 'string';
}

function validateWebFetchInput(args: unknown): args is WebFetchInput {
    const input = args as Record<string, unknown>;
    return typeof input.url === 'string' && input.url.length > 0;
}

function validateScrapeLinkedInJobInput(args: unknown): args is ScrapeLinkedInJobInput {
    const input = args as Record<string, unknown>;
    return typeof input.url === 'string' && input.url.includes('linkedin.com/jobs');
}

/**
 * Security helper: Validate and resolve file paths
 */
function validatePath(inputPath: string, baseDir?: string): string {
    const base = baseDir || process.cwd();
    const resolved = path.resolve(base, inputPath);

    // Prevent directory traversal outside base directory
    if (!resolved.startsWith(base)) {
        throw new Error('Invalid path: Directory traversal not allowed');
    }

    return resolved;
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
                {
                    name: 'saveToFile',
                    description: 'Saves text content to a file. Creates directories if needed. Useful for saving AI-generated content like cover letters, notes, or code.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            content: {
                                type: 'string',
                                description: 'The text content to save',
                            },
                            filename: {
                                type: 'string',
                                description: 'Name of the file (e.g., "cover-letter.txt")',
                            },
                            category: {
                                type: 'string',
                                description: 'Optional folder/category for organization (e.g., "applications/google")',
                            },
                            overwrite: {
                                type: 'boolean',
                                description: 'Allow overwriting existing files (default: false)',
                                default: false,
                            },
                        },
                        required: ['content', 'filename'],
                        additionalProperties: false,
                    },
                },
                {
                    name: 'readFile',
                    description: 'Reads the contents of a file and returns it as text. Useful for loading resumes, templates, or configuration files.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Path to the file (absolute or relative)',
                            },
                            encoding: {
                                type: 'string',
                                description: 'File encoding (default: "utf-8")',
                                default: 'utf-8',
                            },
                            maxSize: {
                                type: 'number',
                                description: 'Maximum file size in bytes (default: 10MB)',
                                default: 10485760,
                            },
                        },
                        required: ['path'],
                        additionalProperties: false,
                    },
                },
                {
                    name: 'searchFiles',
                    description: 'Searches for text patterns within files in a directory using regular expressions. Returns matches with context.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Search pattern (text or regex)',
                            },
                            path: {
                                type: 'string',
                                description: 'Directory to search',
                            },
                            fileTypes: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Filter by file extensions (e.g., ["txt", "md"])',
                            },
                            caseSensitive: {
                                type: 'boolean',
                                description: 'Case-sensitive search (default: false)',
                                default: false,
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum results to return (default: 50)',
                                default: 50,
                            },
                            recursive: {
                                type: 'boolean',
                                description: 'Search subdirectories (default: true)',
                                default: true,
                            },
                        },
                        required: ['query', 'path'],
                        additionalProperties: false,
                    },
                },
                {
                    name: 'executeCommand',
                    description: 'Executes a shell command and returns the output. Useful for git operations, running scripts, or system commands.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            command: {
                                type: 'string',
                                description: 'Command to execute (e.g., "git", "npm")',
                            },
                            args: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Command arguments (e.g., ["status"])',
                            },
                            cwd: {
                                type: 'string',
                                description: 'Working directory (default: current directory)',
                            },
                            timeout: {
                                type: 'number',
                                description: 'Timeout in milliseconds (default: 30000)',
                                default: 30000,
                            },
                        },
                        required: ['command'],
                        additionalProperties: false,
                    },
                },
                {
                    name: 'webFetch',
                    description: 'Fetches content from a URL and optionally parses HTML. Useful for getting job postings, company info, or web content.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                description: 'URL to fetch',
                            },
                            selector: {
                                type: 'string',
                                description: 'CSS selector to extract specific content',
                            },
                            format: {
                                type: 'string',
                                enum: ['text', 'html', 'json'],
                                description: 'Output format (default: "text")',
                                default: 'text',
                            },
                            timeout: {
                                type: 'number',
                                description: 'Request timeout in milliseconds (default: 30000)',
                                default: 30000,
                            },
                        },
                        required: ['url'],
                        additionalProperties: false,
                    },
                },
                {
                    name: 'scrapeLinkedInJob',
                    description: 'Scrapes job details from a LinkedIn job posting using browser automation. Returns structured job data including title, company, description, requirements, and salary.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                description: 'LinkedIn job URL (e.g., https://www.linkedin.com/jobs/view/123456789)',
                            },
                            includeDescription: {
                                type: 'boolean',
                                description: 'Include full job description (default: true)',
                                default: true,
                            },
                            screenshot: {
                                type: 'boolean',
                                description: 'Save screenshot of the job posting (default: false)',
                                default: false,
                            },
                        },
                        required: ['url'],
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

            case 'saveToFile': {
                if (!validateSaveToFileInput(args)) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'Error: Invalid input. Expected { content: string, filename: string }.',
                        }],
                        isError: true,
                    };
                }

                const input: SaveToFileInput = args;

                try {
                    // Build file path
                    const baseDir = path.join(process.cwd(), 'mcp-files');
                    let filePath: string;

                    if (input.category) {
                        filePath = path.join(baseDir, input.category, input.filename);
                    } else {
                        filePath = path.join(baseDir, input.filename);
                    }

                    // Validate path (prevent directory traversal)
                    const resolved = path.resolve(filePath);
                    if (!resolved.startsWith(path.resolve(baseDir))) {
                        return {
                            content: [{
                                type: 'text',
                                text: 'Error: Invalid path. Directory traversal not allowed.',
                            }],
                            isError: true,
                        };
                    }

                    // Check if file exists
                    const exists = await fs.access(resolved).then(() => true).catch(() => false);
                    if (exists && !input.overwrite) {
                        return {
                            content: [{
                                type: 'text',
                                text: `File already exists at "${resolved}". Set overwrite=true to replace it.`,
                            }],
                            isError: true,
                        };
                    }

                    // Create directory if needed
                    await fs.mkdir(path.dirname(resolved), { recursive: true });

                    // Write file
                    await fs.writeFile(resolved, input.content, 'utf-8');

                    const response = {
                        success: true,
                        path: resolved,
                        message: 'File saved successfully'
                    };

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(response, null, 2),
                        }],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [{
                            type: 'text',
                            text: `Error saving file: ${errorMessage}`,
                        }],
                        isError: true,
                    };
                }
            }

            case 'readFile': {
                if (!validateReadFileInput(args)) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'Error: Invalid input. Expected { path: string }.',
                        }],
                        isError: true,
                    };
                }

                const input: ReadFileInput = args;
                const encoding = (input.encoding || 'utf-8') as BufferEncoding;
                const maxSize = input.maxSize || 10485760; // 10MB default

                try {
                    // Resolve path
                    const resolved = path.resolve(process.cwd(), input.path);

                    // Check if file exists
                    const stats = await fs.stat(resolved);

                    if (!stats.isFile()) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Error: "${input.path}" is not a file.`,
                            }],
                            isError: true,
                        };
                    }

                    // Check file size
                    if (stats.size > maxSize) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Error: File too large (${stats.size} bytes). Maximum size is ${maxSize} bytes.`,
                            }],
                            isError: true,
                        };
                    }

                    // Read file
                    const content = await fs.readFile(resolved, encoding);

                    const response = {
                        content,
                        metadata: {
                            path: resolved,
                            size: stats.size,
                            modified: stats.mtime.toISOString(),
                            encoding,
                        }
                    };

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(response, null, 2),
                        }],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [{
                            type: 'text',
                            text: `Error reading file: ${errorMessage}`,
                        }],
                        isError: true,
                    };
                }
            }

            case 'searchFiles': {
                if (!validateSearchFilesInput(args)) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'Error: Invalid input. Expected { query: string, path: string }.',
                        }],
                        isError: true,
                    };
                }

                const input: SearchFilesInput = args;
                const caseSensitive = input.caseSensitive ?? false;
                const maxResults = input.maxResults ?? 50;
                const recursive = input.recursive ?? true;

                try {
                    // Resolve path
                    const resolved = path.resolve(process.cwd(), input.path);

                    // Create regex pattern
                    const flags = caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(input.query, flags);

                    const matches: any[] = [];
                    let filesSearched = 0;

                    // Recursive search function
                    async function searchDirectory(dir: string) {
                        if (matches.length >= maxResults) return;

                        const entries = await fs.readdir(dir, { withFileTypes: true });

                        for (const entry of entries) {
                            if (matches.length >= maxResults) break;

                            const fullPath = path.join(dir, entry.name);

                            if (entry.isDirectory() && recursive) {
                                await searchDirectory(fullPath);
                            } else if (entry.isFile()) {
                                // Check file type filter
                                if (input.fileTypes && input.fileTypes.length > 0) {
                                    const ext = path.extname(entry.name).slice(1);
                                    if (!input.fileTypes.includes(ext)) continue;
                                }

                                filesSearched++;

                                try {
                                    const content = await fs.readFile(fullPath, 'utf-8');
                                    const lines = content.split('\n');

                                    lines.forEach((line, index) => {
                                        if (matches.length >= maxResults) return;
                                        if (regex.test(line)) {
                                            matches.push({
                                                file: path.relative(process.cwd(), fullPath),
                                                line: index + 1,
                                                content: line.trim(),
                                            });
                                        }
                                    });
                                } catch {
                                    // Skip files that can't be read as text
                                }
                            }
                        }
                    }

                    await searchDirectory(resolved);

                    const response = {
                        matches,
                        totalMatches: matches.length,
                        filesSearched,
                    };

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(response, null, 2),
                        }],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [{
                            type: 'text',
                            text: `Error searching files: ${errorMessage}`,
                        }],
                        isError: true,
                    };
                }
            }

            case 'executeCommand': {
                if (!validateExecuteCommandInput(args)) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'Error: Invalid input. Expected { command: string }.',
                        }],
                        isError: true,
                    };
                }

                const input: ExecuteCommandInput = args;
                const timeout = input.timeout || 30000;
                const cwd = input.cwd || process.cwd();

                try {
                    const startTime = Date.now();

                    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
                        const child = spawn(input.command, input.args || [], {
                            cwd,
                            timeout,
                        });

                        let stdout = '';
                        let stderr = '';

                        child.stdout?.on('data', (data) => {
                            stdout += data.toString();
                        });

                        child.stderr?.on('data', (data) => {
                            stderr += data.toString();
                        });

                        child.on('close', (code) => {
                            resolve({
                                stdout,
                                stderr,
                                exitCode: code || 0,
                            });
                        });

                        child.on('error', (error) => {
                            reject(error);
                        });
                    });

                    const duration = Date.now() - startTime;

                    const response = {
                        ...result,
                        duration,
                    };

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(response, null, 2),
                        }],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [{
                            type: 'text',
                            text: `Error executing command: ${errorMessage}`,
                        }],
                        isError: true,
                    };
                }
            }

            case 'webFetch': {
                if (!validateWebFetchInput(args)) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'Error: Invalid input. Expected { url: string }.',
                        }],
                        isError: true,
                    };
                }

                const input: WebFetchInput = args;
                const timeout = input.timeout || 30000;
                const format = input.format || 'text';

                try {
                    // Validate URL
                    const url = new URL(input.url);
                    if (!['http:', 'https:'].includes(url.protocol)) {
                        return {
                            content: [{
                                type: 'text',
                                text: 'Error: Only HTTP and HTTPS URLs are supported.',
                            }],
                            isError: true,
                        };
                    }

                    // Fetch content
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);

                    const response = await fetch(input.url, {
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Error: HTTP ${response.status} ${response.statusText}`,
                            }],
                            isError: true,
                        };
                    }

                    const html = await response.text();
                    let content = html;

                    // Parse HTML if selector provided
                    if (input.selector) {
                        const $ = cheerio.load(html);
                        const selected = $(input.selector);

                        if (format === 'text') {
                            content = selected.text();
                        } else if (format === 'html') {
                            content = selected.html() || '';
                        }
                    } else if (format === 'text') {
                        const $ = cheerio.load(html);
                        content = $('body').text();
                    }

                    const result = {
                        content,
                        metadata: {
                            url: input.url,
                            statusCode: response.status,
                            contentType: response.headers.get('content-type'),
                            size: html.length,
                            fetchedAt: new Date().toISOString(),
                        }
                    };

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(result, null, 2),
                        }],
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [{
                            type: 'text',
                            text: `Error fetching URL: ${errorMessage}`,
                        }],
                        isError: true,
                    };
                }
            }

            case 'scrapeLinkedInJob': {
                if (!validateScrapeLinkedInJobInput(args)) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'Error: Invalid input. Expected { url: string } with a LinkedIn job URL.',
                        }],
                        isError: true,
                    };
                }

                const input: ScrapeLinkedInJobInput = args;
                const includeDescription = input.includeDescription ?? true;

                let browser;
                try {
                    // Launch browser
                    browser = await chromium.launch({ headless: true });
                    const page = await browser.newPage();

                    // Navigate to job posting
                    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 30000 });

                    // Wait for job content to load
                    await page.waitForSelector('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title', { timeout: 10000 });

                    // Extract job details
                    const jobData = await page.evaluate((includeDesc: boolean) => {
                        // @ts-ignore - Running in browser context
                        const getText = (selector: string): string => {
                            // @ts-ignore - Running in browser context
                            const el = document.querySelector(selector);
                            return el?.textContent?.trim() || '';
                        };

                        return {
                            title: getText('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title'),
                            company: getText('.top-card-layout__first-subline, .job-details-jobs-unified-top-card__company-name'),
                            location: getText('.top-card-layout__second-subline, .job-details-jobs-unified-top-card__bullet'),
                            description: includeDesc ? getText('.show-more-less-html__markup, .jobs-description__content') : '',
                            postedDate: getText('.posted-time-ago__text, .job-details-jobs-unified-top-card__posted-date'),
                        };
                    }, includeDescription);

                    // Take screenshot if requested
                    if (input.screenshot) {
                        const screenshotPath = path.join(process.cwd(), 'mcp-files', 'screenshots', `linkedin-job-${Date.now()}.png`);
                        await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
                        await page.screenshot({ path: screenshotPath, fullPage: true });
                        (jobData as any).screenshot = screenshotPath;
                    }

                    await browser.close();

                    const response = {
                        ...jobData,
                        url: input.url,
                        scrapedAt: new Date().toISOString(),
                    };

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify(response, null, 2),
                        }],
                    };

                } catch (error) {
                    if (browser) await browser.close();

                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        content: [{
                            type: 'text',
                            text: `Error scraping LinkedIn job: ${errorMessage}\n\nNote: LinkedIn may require authentication or may have blocked automated access.`,
                        }],
                        isError: true,
                    };
                }
            }

            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    });
}
