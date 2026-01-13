import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// Create MCP server
const server = createServer();

// Create Express app for health checks
const app = express();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: 'letsmcp', version: '1.1.0' });
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
