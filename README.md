# Minimal MCP Server

A minimal [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server implementation in TypeScript with stdio transport, ready for local development and remote deployment.

## Features

- ✅ **Stdio Transport**: Standard MCP transport for Claude Desktop and Antigravity
- ✅ **HTTP Health Endpoint**: Monitor server status
- ✅ **8 Powerful Tools**: File operations, command execution, web scraping, and more
- ✅ **One Resource**: `server://info` - provides server metadata
- ✅ **Modular Architecture**: Separated tools and server logic
- ✅ **Deployment Ready**: Can be deployed to cloud platforms
- ✅ **TypeScript**: Full type safety with the official MCP SDK
- ✅ **Comprehensive Tests**: Full test coverage with Vitest
- ✅ **Production Ready**: Error handling, validation, and security measures

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

> **📖 For detailed MCP client configuration instructions, see [MCP_CONFIG.md](./MCP_CONFIG.md)**

## Connecting to Clients

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "letsmcp": {
      "command": "node",
      "args": ["/absolute/path/to/letsmcp/dist/index.js"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/letsmcp` with your actual project path.

> **📖 See [MCP_CONFIG.md](./MCP_CONFIG.md) for platform-specific examples and development mode configuration.**

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

> **📖 For detailed documentation on each tool, see [TOOL_GUIDE.md](./TOOL_GUIDE.md)**

### Core Tools

#### `saveToFile`
Saves text content to a file with automatic directory creation.

**Parameters:**
- `content` (string): Text content to save
- `filename` (string): Name of the file
- `category` (string, optional): Folder/category for organization
- `overwrite` (boolean, optional): Allow overwriting existing files

**Example:**
```
"Save this cover letter to applications/google/cover-letter.txt"
```

#### `readFile`
Reads file contents and returns them as text.

**Parameters:**
- `path` (string): Path to the file
- `encoding` (string, optional): File encoding (default: utf-8)
- `maxSize` (number, optional): Maximum file size in bytes

**Example:**
```
"Read my resume from resume.txt"
```

#### `searchFiles`
Searches for text patterns within files using regex.

**Parameters:**
- `query` (string): Search pattern
- `path` (string): Directory to search
- `fileTypes` (array, optional): Filter by file extensions
- `caseSensitive` (boolean, optional): Case-sensitive search
- `maxResults` (number, optional): Maximum results to return
- `recursive` (boolean, optional): Search subdirectories

**Example:**
```
"Search for 'Python' in my applications folder"
```

#### `executeCommand`
Executes shell commands and returns output.

**Parameters:**
- `command` (string): Command to execute
- `args` (array, optional): Command arguments
- `cwd` (string, optional): Working directory
- `timeout` (number, optional): Timeout in milliseconds

**Example:**
```
"Run git status in my project"
```

#### `webFetch`
Fetches content from a URL and optionally parses HTML.

**Parameters:**
- `url` (string): URL to fetch
- `selector` (string, optional): CSS selector to extract content
- `format` (string, optional): Output format (text/html/json)
- `timeout` (number, optional): Request timeout

**Example:**
```
"Fetch the content from https://example.com"
```

#### `scrapeLinkedInJob`
Scrapes job details from LinkedIn job postings using browser automation.

**Parameters:**
- `url` (string): LinkedIn job URL
- `includeDescription` (boolean, optional): Include full description
- `screenshot` (boolean, optional): Save screenshot

**Example:**
```
"Scrape this LinkedIn job: https://www.linkedin.com/jobs/view/123456789"
```

### Utility Tools

#### `echoText`
Echoes back the provided text. Useful for testing.

**Parameters:**
- `text` (string): Text to echo back

**Example:**
```
"Echo 'Hello, World!' for me"
```

#### `summarizeDirectory`
Lists files in a directory with their metadata.

**Parameters:**
- `path` (string): Directory path to summarize

**Example:**
```
"Summarize the contents of my Downloads folder"
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
letsmcp/
├── src/
│   ├── index.ts          # Main entry point (HTTP + stdio transport)
│   ├── server.ts         # MCP server initialization
│   └── tools.ts          # Tool definitions (echoText, summarizeDirectory)
├── dist/                 # Compiled JavaScript (generated)
├── node_modules/         # Dependencies (generated)
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── package.json         # Project configuration
├── package-lock.json    # Dependency lock file
├── tsconfig.json        # TypeScript configuration
├── README.md           # Documentation
└── PROJECT_STATUS.md   # Project status and roadmap
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

## Testing

### Quick Verification Test

Run the included test script to verify tools are registered:

```bash
npx tsx test.ts
```

This confirms that both `echoText` and `summarizeDirectory` tools are properly set up.

### Full Integration Testing

For complete testing with a real MCP client:

1. **Claude Desktop**: Configure in `claude_desktop_config.json` (see above)
2. **MCP Inspector**: `npx @modelcontextprotocol/inspector node dist/index.js`
   - Note: Inspector may have issues with stdio transport; use Claude Desktop for best results

### Manual Testing

Test the tools by asking Claude Desktop:
- "Can you echo 'Hello, World!' for me?"
- "Can you summarize the contents of C:\\Users\\shane\\Downloads?"


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
