# Minimal MCP Server

A minimal [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server implementation in TypeScript with stdio transport, ready for local development and remote deployment.

## Features

- ✅ **Stdio Transport**: Standard MCP transport for Claude Desktop and Antigravity
- ✅ **HTTP Health Endpoint**: Monitor server status
- ✅ **One Tool**: `add` - adds two numbers together
- ✅ **One Resource**: `server://info` - provides server metadata
- ✅ **Deployment Ready**: Can be deployed to cloud platforms
- ✅ **TypeScript**: Full type safety with the official MCP SDK

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/shanebe-ai/letsmcp.git
cd letsmcp

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Running Locally

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start with:
- **MCP communication**: stdio (standard input/output)
- **Health endpoint**: `http://localhost:3000/health`

### Testing

```bash
# Check if HTTP server is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","server":"minimal-mcp-server","version":"1.0.0"}
```

## Configuration

Edit `.env` to configure the HTTP health endpoint:

```env
PORT=3000
HOST=localhost
```

For production deployment, set `HOST=0.0.0.0` to accept health check connections from any IP.

## Connecting to Clients

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "minimal-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/mcp` with the actual absolute path to your project directory.

For development, you can use `tsx` instead:
```json
{
  "mcpServers": {
    "minimal-mcp": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/mcp/src/index.ts"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

### Antigravity

1. Open Antigravity settings
2. Navigate to MCP Servers
3. Add new server with:
   - **Type**: stdio
   - **Command**: `node`
   - **Args**: `/absolute/path/to/mcp/dist/index.js`
   - **Environment**: `PORT=3000`, `HOST=localhost`
4. Save and connect

## Available Tools

### `add`
Adds two numbers together.

**Parameters:**
- `a` (number): First number
- `b` (number): Second number

**Example usage in Claude:**
```
"Can you add 5 and 7 for me?"
```

## Available Resources

### `server://info`
Provides information about the MCP server including version, capabilities, and available tools/resources.

## Deployment

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`
5. Set environment variables in Railway dashboard

### Render

1. Create new Web Service
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variable: `HOST=0.0.0.0`

### Fly.io

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Deploy: `fly deploy`

## Project Structure

```
mcp/
├── src/
│   └── index.ts          # Main server implementation
├── .env.example          # Environment configuration template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Development

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Run built version
npm start
```

## Extending the Server

### Adding a New Tool

```typescript
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      // ... existing tools
      {
        name: 'your-tool',
        description: 'Your tool description',
        inputSchema: {
          type: 'object',
          properties: {
            // your parameters
          },
        },
      },
    ],
  };
});

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'your-tool') {
    // Your tool implementation
  }
  // ... existing tools
});
```

### Adding a New Resource

```typescript
server.setRequestHandler('resources/list', async () => {
  return {
    resources: [
      // ... existing resources
      {
        uri: 'your://resource',
        name: 'Your Resource',
        description: 'Your resource description',
        mimeType: 'text/plain',
      },
    ],
  };
});

server.setRequestHandler('resources/read', async (request) => {
  if (request.params.uri === 'your://resource') {
    // Your resource implementation
  }
  // ... existing resources
});
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Try a different port: `PORT=3001 npm run dev`

### Can't connect from Claude/Antigravity
- Verify server is running: `curl http://localhost:3000/health`
- Check firewall settings
- For remote deployment, ensure `HOST=0.0.0.0`

### TypeScript errors
- Run `npm run typecheck` to see detailed errors
- Ensure all dependencies are installed: `npm install`

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io)

## Author

**shanebe-ai** (shanebe@live.com)

## License

MIT
