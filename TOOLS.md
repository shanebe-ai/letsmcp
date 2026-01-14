# MCP Tools Implementation Guide

This document describes the two MCP tools implemented in this server.

---

## 🔊 echoText

Echoes back the provided text in a structured JSON format.

### Input Schema

```json
{
  "text": "string (required)"
}
```

### Output Format

Returns a JSON object:
```json
{
  "echoed": "your text here"
}
```

### Behavior

- **Normal input**: Returns `{ "echoed": "<your text>" }`
- **Empty string**: Returns friendly error message
- **Whitespace only**: Returns friendly error message

### Example Usage

**In Claude Desktop or Antigravity:**
```
"Can you echo 'Hello, World!' for me?"
```

**Response:**
```json
{
  "echoed": "Hello, World!"
}
```

### Error Handling

If you provide empty text or only whitespace:
```
Oops! It looks like you sent me empty text. Please provide some text to echo back. 😊
```

---

## 📁 summarizeDirectory

Lists files and directories in a specified path with a concise summary.

### Input Schema

```json
{
  "path": "string (required, relative to project root)"
}
```

### Output Format

Returns a plain-text summary with:
- Total counts of files and directories
- Example file and directory names (up to 3 each)
- List of items (limited to first 20)
- Visual indicators (📁 for directories, 📄 for files)

### Behavior

- **Path resolution**: Paths are resolved relative to the project root (current working directory)
- **Item limit**: Shows maximum 20 items to keep output concise
- **Non-existent paths**: Returns friendly error message
- **Example names**: Shows up to 3 example files and 3 example directories

### Example Usage

**In Claude Desktop or Antigravity:**
```
"Can you summarize the src directory?"
```

**Response:**
```
Directory: src

Found 3 files and 0 directories (3 total)

Example files: index.ts, server.ts, tools.ts

All items:
  📄 index.ts
  📄 server.ts
  📄 tools.ts
```

### Error Handling

**Non-existent directory:**
```
The directory "nonexistent" doesn't seem to exist. Please check the path and try again. 📁
```

**Permission or other errors:**
```
Oops! Something went wrong reading "path": <error details>
```

---

## Implementation Details

### Type Safety

Both tools use TypeScript interfaces for input validation:

```typescript
interface EchoTextInput {
    text: string;
}

interface SummarizeDirectoryInput {
    path: string;
}
```

### Validation

- **echoText**: Validates that `text` is a string, then checks if it's empty or whitespace-only
- **summarizeDirectory**: Validates that `path` is a non-empty string, checks if path exists before reading

### Error Responses

All errors return:
```typescript
{
    content: [{ type: 'text', text: '<error message>' }],
    isError: true
}
```

---

## Testing

Run the test script to verify tools are registered:

```bash
npx tsx test-echo.ts
```

For interactive testing, configure Claude Desktop or Antigravity (see [MCP_CONFIG.md](./MCP_CONFIG.md)) and try:

- `"Echo 'test message' for me"`
- `"Summarize the src directory"`
- `"What's in the current directory?"` (use `.` as path)

---

## Design Decisions

### echoText
- Returns structured JSON for easy parsing by clients
- Friendly error messages to improve user experience
- Handles edge cases (empty, whitespace-only)

### summarizeDirectory
- Limits output to 20 items to prevent overwhelming responses
- Shows examples to give quick overview
- Uses emojis for visual clarity
- Resolves paths relative to project root for convenience
- Graceful error handling for missing directories
