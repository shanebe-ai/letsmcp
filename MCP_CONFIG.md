# MCP Client Configuration

This document provides the correct configuration snippets for connecting MCP clients to this server.

## Prerequisites

1. Build the project first:
   ```bash
   npm install
   npm run build
   ```

2. Ensure the server is working:
   ```bash
   npm start
   # In another terminal:
   curl http://localhost:3000/health
   ```

---

## Claude Desktop Configuration

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "letsmcp": {
      "command": "node",
      "args": ["c:\\Users\\shane\\Downloads\\getwork\\mcp\\dist\\index.js"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

### macOS/Linux

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux):

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

---

## Antigravity Configuration

The `antigravity-mcp-config.json` file in this repository contains the reference configuration:

```json
{
  "mcpServers": {
    "letsmcp": {
      "command": "node",
      "args": ["c:\\Users\\shane\\Downloads\\getwork\\mcp\\dist\\index.js"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

**To use in Antigravity:**
1. Open Antigravity settings
2. Navigate to MCP Servers section
3. Add new server configuration
4. Copy the values from above, adjusting the path to match your installation

---

## Cursor IDE Configuration

Cursor IDE supports MCP servers similar to Claude Desktop and Antigravity.

### Configuration File Location

**Windows**: `%APPDATA%\Cursor\User\globalStorage\cursor-mcp\config.json`  
**macOS**: `~/Library/Application Support/Cursor/User/globalStorage/cursor-mcp/config.json`  
**Linux**: `~/.config/Cursor/User/globalStorage/cursor-mcp/config.json`

### Configuration

```json
{
  "mcpServers": {
    "letsmcp": {
      "command": "node",
      "args": ["c:\\Users\\shane\\Downloads\\getwork\\mcp\\dist\\index.js"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

### Using in Cursor

1. **Configure the MCP server** (see above)
2. **Restart Cursor IDE**
3. **Open Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. **Type "MCP"** to see available MCP commands
5. **Use tools in chat**: Ask Cursor to use MCP tools
   - "Use the letsmcp server to scrape this LinkedIn job"
   - "Save this file using the MCP server"

### Alternative: SSH for Remote Servers

If your MCP server is deployed remotely, use SSH:

```json
{
  "mcpServers": {
    "letsmcp-remote": {
      "command": "ssh",
      "args": [
        "user@your-server.com",
        "node",
        "/path/to/mcp/dist/index.js"
      ],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

---

## Development Mode Configuration

For development with auto-reload using `tsx`:

```json
{
  "mcpServers": {
    "letsmcp-dev": {
      "command": "npx",
      "args": ["-y", "tsx", "c:\\Users\\shane\\Downloads\\getwork\\mcp\\src\\index.ts"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    }
  }
}
```

**Benefits:**
- No need to rebuild after code changes
- Faster iteration during development
- Direct TypeScript execution

**Note**: This requires `tsx` to be available (installed via `npm install`)

---

## Path Guidelines

### Windows
- Use **double backslashes** (`\\`) in JSON: `"c:\\Users\\..."`
- Or use **forward slashes**: `"c:/Users/..."`
- Always use **absolute paths**

### macOS/Linux
- Use **forward slashes**: `"/Users/..."`
- Always use **absolute paths**
- Expand `~` to full home directory path

---

## Testing the Connection

After configuring your MCP client:

1. **Restart the client** (Claude Desktop or Antigravity)
2. **Verify server appears** in the MCP servers list
3. **Test the tools**:
   - "Can you echo 'Hello, World!' for me?"
   - "Can you summarize the contents of C:\\Users\\shane\\Downloads?"

---

## Troubleshooting

### Server not appearing in client
- Check that the path is absolute and correct
- Verify the build succeeded: `npm run build`
- Check for typos in JSON (trailing commas, quotes)

### Tools not working
- Ensure server is running: `curl http://localhost:3000/health`
- Check client logs for error messages
- Verify environment variables are set correctly

### Port conflicts
- Change `PORT` in env to a different value (e.g., `3001`)
- Ensure no other service is using the port

---

## Multiple Configurations

You can run multiple instances with different configurations:

```json
{
  "mcpServers": {
    "letsmcp-prod": {
      "command": "node",
      "args": ["c:\\path\\to\\prod\\dist\\index.js"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost"
      }
    },
    "letsmcp-dev": {
      "command": "npx",
      "args": ["-y", "tsx", "c:\\path\\to\\dev\\src\\index.ts"],
      "env": {
        "PORT": "3001",
        "HOST": "localhost"
      }
    }
  }
}
```

**Note**: Each instance must use a different port.
