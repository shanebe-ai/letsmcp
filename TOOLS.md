# MCP Tools Implementation Guide

This document provides technical specifications for all tools implemented in this MCP server.

> **📖 For user-friendly documentation, see [TOOL_GUIDE.md](./TOOL_GUIDE.md)**

---

## Tool Overview

| Tool | Category | Complexity | Security Risk |
|------|----------|------------|---------------|
| `echoText` | Utility | Low | None |
| `summarizeDirectory` | File System | Low | Low |
| `saveToFile` | File System | Low | Low |
| `readFile` | File System | Low | Low |
| `searchFiles` | File System | Medium | Low |
| `executeCommand` | System | High | **HIGH** ⚠️ |
| `webFetch` | Network | Medium | Medium |
| `scrapeLinkedInJob` | Network | High | Medium |

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

## 💾 saveToFile

Saves text content to a file on the filesystem with automatic directory creation.

### Input Schema

```json
{
  "content": "string (required)",
  "filename": "string (required)",
  "category": "string (optional)",
  "overwrite": "boolean (optional, default: false)"
}
```

### Output Format

**Success:**
```json
{
  "success": true,
  "path": "C:\\Users\\shane\\mcp-files\\applications\\google\\cover-letter.txt",
  "message": "File saved successfully"
}
```

**Error:**
```json
{
  "success": false,
  "error": "File already exists. Set overwrite=true to replace it."
}
```

### Behavior

- Creates parent directories automatically
- Prevents accidental overwrites unless `overwrite: true`
- Validates paths to prevent directory traversal
- All files saved to `mcp-files/` directory by default

### Example Usage

**Basic:**
```json
{
  "content": "Dear Hiring Manager...",
  "filename": "cover-letter.txt"
}
```

**With category:**
```json
{
  "content": "Dear Hiring Manager...",
  "filename": "cover-letter.txt",
  "category": "applications/google"
}
```

### Security

- Path validation prevents directory traversal attacks
- Files restricted to `mcp-files/` directory
- Overwrite protection prevents data loss

---

## 📖 readFile

Reads the contents of a file from the filesystem.

### Input Schema

```json
{
  "path": "string (required)",
  "encoding": "string (optional, default: utf-8)",
  "maxSize": "number (optional, default: 10485760)"
}
```

### Output Format

**Success:**
```json
{
  "content": "File contents here...",
  "metadata": {
    "path": "C:\\Users\\shane\\resume.txt",
    "size": 2048,
    "modified": "2026-01-14T10:30:00Z",
    "encoding": "utf-8"
  }
}
```

**Error:**
```json
{
  "error": "File not found: resume.txt"
}
```

### Behavior

- Resolves paths relative to current working directory
- Enforces maximum file size (default 10MB)
- Returns file metadata along with content
- Supports multiple encodings

### Example Usage

```json
{
  "path": "resume.txt"
}
```

### Security

- Path validation prevents directory traversal
- File size limits prevent memory exhaustion
- Safe for reading sensitive data (not logged)

---

## 🔍 searchFiles

Searches for text patterns within files using regular expressions.

### Input Schema

```json
{
  "query": "string (required)",
  "path": "string (required)",
  "fileTypes": "array of strings (optional)",
  "caseSensitive": "boolean (optional, default: false)",
  "maxResults": "number (optional, default: 50)",
  "recursive": "boolean (optional, default: true)"
}
```

### Output Format

**Success:**
```json
{
  "matches": [
    {
      "file": "applications/google/notes.txt",
      "line": 15,
      "content": "Experience with Python, Django, and React"
    }
  ],
  "totalMatches": 5,
  "filesSearched": 23
}
```

### Behavior

- Uses regex for flexible pattern matching
- Case-insensitive by default
- Recursively searches subdirectories
- Limits results to prevent overwhelming output
- Skips binary files automatically

### Example Usage

**Basic search:**
```json
{
  "query": "Python",
  "path": "applications/"
}
```

**Filter by file type:**
```json
{
  "query": "salary",
  "path": "job-descriptions/",
  "fileTypes": ["txt", "md"]
}
```

**Regex search:**
```json
{
  "query": "\\$\\d{1,3},?\\d{3}",
  "path": "."
}
```

### Security

- Does not search outside specified directory
- Skips system and hidden files by default
- Regex timeout prevents ReDoS attacks

---

## ⚙️ executeCommand

Executes shell commands and returns output.

### Input Schema

```json
{
  "command": "string (required)",
  "args": "array of strings (optional)",
  "cwd": "string (optional)",
  "timeout": "number (optional, default: 30000)"
}
```

### Output Format

**Success:**
```json
{
  "stdout": "On branch main\nYour branch is up to date...",
  "stderr": "",
  "exitCode": 0,
  "duration": 245
}
```

**Error:**
```json
{
  "stdout": "",
  "stderr": "fatal: not a git repository",
  "exitCode": 128,
  "duration": 50
}
```

### Behavior

- Uses `spawn` (not `exec`) to prevent shell injection
- Enforces timeout to prevent hanging
- Captures both stdout and stderr
- Returns exit code for error handling

### Example Usage

**Git status:**
```json
{
  "command": "git",
  "args": ["status"]
}
```

**NPM install:**
```json
{
  "command": "npm",
  "args": ["install"],
  "cwd": "c:\\projects\\myapp",
  "timeout": 60000
}
```

### Security

⚠️ **CRITICAL**: This tool can execute arbitrary commands!

- **Whitelist recommended**: Only allow specific commands
- **No shell**: Uses spawn to prevent injection
- **Timeout enforced**: Prevents infinite loops
- **Working directory validated**: Prevents directory traversal
- **Consider disabling in production**: Or require authentication

---

## 🌐 webFetch

Fetches content from a URL and optionally parses HTML.

### Input Schema

```json
{
  "url": "string (required)",
  "selector": "string (optional)",
  "format": "string (optional: text|html|json, default: text)",
  "timeout": "number (optional, default: 30000)"
}
```

### Output Format

**Success:**
```json
{
  "content": "Example Domain\nThis domain is for use in...",
  "metadata": {
    "url": "https://example.com",
    "statusCode": 200,
    "contentType": "text/html",
    "size": 1256,
    "fetchedAt": "2026-01-14T10:30:00Z"
  }
}
```

**Error:**
```json
{
  "error": "Failed to fetch: 404 Not Found"
}
```

### Behavior

- Uses `node-fetch` for HTTP requests
- Uses `cheerio` for HTML parsing
- Follows redirects automatically
- Timeout after 30 seconds
- Supports CSS selectors for content extraction

### Example Usage

**Basic fetch:**
```json
{
  "url": "https://example.com"
}
```

**Extract specific content:**
```json
{
  "url": "https://careers.google.com/jobs/123",
  "selector": ".job-description",
  "format": "text"
}
```

### Security

- Validates URLs to prevent SSRF attacks
- Does not follow file:// or internal URLs
- Timeout prevents hanging requests
- Rate limiting recommended for production

---

## 💼 scrapeLinkedInJob

Scrapes job details from LinkedIn job postings using browser automation.

### Input Schema

```json
{
  "url": "string (required, LinkedIn job URL)",
  "includeDescription": "boolean (optional, default: true)",
  "screenshot": "boolean (optional, default: false)"
}
```

### Output Format

**Success:**
```json
{
  "title": "Senior Software Engineer",
  "company": "Google",
  "location": "Mountain View, CA",
  "employmentType": "Full-time",
  "description": "We are looking for a talented engineer...",
  "requirements": [],
  "salary": "$150,000 - $200,000",
  "postedDate": "2 days ago",
  "applicants": "50+ applicants",
  "url": "https://www.linkedin.com/jobs/view/123456789",
  "scrapedAt": "2026-01-14T10:30:00Z"
}
```

**Error:**
```json
{
  "error": "Failed to load job posting. It may have been removed or requires authentication."
}
```

### Behavior

- Uses Playwright for browser automation
- Runs in headless mode (no visible window)
- Handles dynamic JavaScript content
- Waits for content to load before scraping
- Can save screenshot for debugging

### Example Usage

**Basic scraping:**
```json
{
  "url": "https://www.linkedin.com/jobs/view/123456789"
}
```

**With screenshot:**
```json
{
  "url": "https://www.linkedin.com/jobs/view/123456789",
  "screenshot": true
}
```

### Security & Legal

⚠️ **IMPORTANT**: LinkedIn Terms of Service Considerations

- **Personal use only**: Do not use for commercial scraping
- **Rate limiting**: Avoid excessive requests (risk of IP ban)
- **Authentication**: May require LinkedIn cookies/session
- **Robots.txt**: LinkedIn blocks automated access
- **Legal**: Check LinkedIn ToS and local laws
- **Ethical**: Use responsibly and respect privacy

**Recommendations:**
- Use sparingly (1-2 jobs per minute max)
- Consider manual copy-paste for sensitive use
- Store credentials securely if authentication needed
- Add delays between requests
- Respect LinkedIn's anti-scraping measures

---

## Implementation Details

### Type Safety

All tools use TypeScript interfaces for input validation:

```typescript
interface SaveToFileInput {
    content: string;
    filename: string;
    category?: string;
    overwrite?: boolean;
}

interface ReadFileInput {
    path: string;
    encoding?: string;
    maxSize?: number;
}

// ... etc for all tools
```

### Validation

Each tool has a validation function:

```typescript
function validateSaveToFileInput(args: unknown): args is SaveToFileInput {
    const input = args as Record<string, unknown>;
    return typeof input.content === 'string' && typeof input.filename === 'string';
}
```

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
npm test
```

For interactive testing, configure Claude Desktop or Antigravity (see [MCP_CONFIG.md](./MCP_CONFIG.md)) and try:

- `"Echo 'test message' for me"`
- `"Summarize the src directory"`
- `"Save 'Hello World' to test.txt"`
- `"Read test.txt"`
- `"Search for 'Hello' in the current directory"`
- `"Run the command: node --version"`
- `"Fetch https://example.com"`
- `"Scrape this LinkedIn job: [URL]"`

---

## Design Decisions

### File Operations
- All file paths validated to prevent directory traversal
- Files saved to dedicated `mcp-files/` directory
- Overwrite protection prevents accidental data loss
- File size limits prevent memory issues

### Command Execution
- Uses `spawn` instead of `exec` for safety
- Timeout prevents hanging processes
- No shell by default (prevents injection)
- Returns both stdout and stderr

### Web Scraping
- Timeout prevents hanging requests
- URL validation prevents SSRF
- Cheerio for lightweight HTML parsing
- Playwright for JavaScript-heavy sites

### LinkedIn Scraping
- Browser automation for dynamic content
- Headless mode for efficiency
- Screenshot capability for debugging
- Graceful error handling

---

**Need Help?** Check the main [README.md](./README.md) or [TOOL_GUIDE.md](./TOOL_GUIDE.md) for more information.
