# Test Script for letsmcp MCP Server

Simple test script to verify all MCP server functionality.

## Usage

```bash
# Make sure the server is built first
npm run build

# Run the test script
npx tsx test.ts
```

## What it tests

1. ✅ **Connection** - Connects to the MCP server via stdio
2. ✅ **List Tools** - Verifies echoText and summarizeDirectory are available
3. ✅ **echoText Tool** - Tests echoing text
4. ✅ **summarizeDirectory Tool** - Tests directory listing
5. ✅ **List Resources** - Verifies server://info is available
6. ✅ **Read Resource** - Reads server information

## Expected Output

```
🧪 Starting MCP Server Tests...

📡 Connecting to MCP server...
✅ Connected!

📋 Test 1: Listing available tools...
Available tools: echoText, summarizeDirectory
✅ Test 1 passed!

🔊 Test 2: Testing echoText tool...
Echo response: Echo: Hello from test script!
✅ Test 2 passed!

📁 Test 3: Testing summarizeDirectory tool...
Directory summary:
[List of files in current directory]
✅ Test 3 passed!

📦 Test 4: Listing available resources...
Available resources: server://info
✅ Test 4 passed!

ℹ️  Test 5: Reading server://info resource...
Server info:
letsmcp MCP Server v1.1.0
Running on: localhost:3000
Capabilities: Tools, Resources
Available Tools: echoText, summarizeDirectory
Available Resources: server://info
✅ Test 5 passed!

🎉 All tests passed!
```

## Troubleshooting

If tests fail:
- Make sure you've run `npm run build` first
- Check that no other instance of the server is running
- Verify all dependencies are installed (`npm install`)
