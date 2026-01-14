# MCP Tool Guide: Understanding Your Tools

This guide provides a comprehensive explanation of each tool in your MCP server, including what it does, why you need it, how it works, and real-world examples.

---

## Table of Contents

1. [saveToFile](#savetofile)
2. [readFile](#readfile)
3. [searchFiles](#searchfiles)
4. [executeCommand](#executecommand)
5. [webFetch](#webfetch)
6. [scrapeLinkedInJob](#scrapelinkedinjob)
7. [echoText](#echotext) (existing)
8. [summarizeDirectory](#summarizedirectory) (existing)

---

## saveToFile

### What It Does
Saves text content to a file on your filesystem. If the directory doesn't exist, it creates it automatically.

### Why You Need It
**For JobOS and AI Apps:**
- Save AI-generated cover letters to organized folders
- Store job application notes and research
- Create logs of AI conversations
- Save code snippets or documentation
- Organize artifacts by category (resumes, letters, notes)

**Real-World Example:**
```
You: "Write me a cover letter for this Software Engineer position at Google"
AI: [generates cover letter]
AI: [calls saveToFile to save it to "applications/google/cover-letter.txt"]
```

### How It Works
1. Takes content and a filename as input
2. Optionally takes a category to organize files
3. Resolves the full path (creates subdirectories if needed)
4. Checks if file already exists (prevents accidental overwrites)
5. Writes content to the file
6. Returns the absolute path where file was saved

**Technical Details:**
- Uses Node.js `fs/promises` for async file operations
- Creates parent directories with `mkdir({ recursive: true })`
- Validates paths to prevent directory traversal attacks
- UTF-8 encoding by default

### Parameters

```typescript
{
  content: string;      // The text content to save
  filename: string;     // Name of the file (e.g., "cover-letter.txt")
  category?: string;    // Optional folder/category (e.g., "applications/google")
  overwrite?: boolean;  // Allow overwriting existing files (default: false)
}
```

### Examples

**Basic usage:**
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

**Overwrite existing:**
```json
{
  "content": "Updated content",
  "filename": "notes.txt",
  "overwrite": true
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

**Error (file exists):**
```json
{
  "success": false,
  "error": "File already exists. Set overwrite=true to replace it."
}
```

### Error Handling
- **File exists**: Returns error unless `overwrite: true`
- **Invalid path**: Prevents directory traversal (e.g., `../../../etc/passwd`)
- **Permission denied**: Returns descriptive error message
- **Disk full**: Returns system error message

### Security Notes
- All paths are resolved to absolute paths
- Prevents writing outside designated directories
- Validates filename for dangerous characters
- Does not execute any file content

---

## readFile

### What It Does
Reads the contents of a file from your filesystem and returns it as text.

### Why You Need It
**For JobOS and AI Apps:**
- Load your resume for AI to analyze
- Read cover letter templates
- Access job description files
- Load configuration files
- Read previous application notes

**Real-World Example:**
```
You: "Compare my resume to this job description"
AI: [calls readFile("resume.txt")]
AI: [calls readFile("job-description.txt")]
AI: [analyzes both and provides comparison]
```

### How It Works
1. Takes a file path as input
2. Resolves to absolute path
3. Checks if file exists and is readable
4. Reads file contents with specified encoding
5. Returns content and metadata (size, modified date)

**Technical Details:**
- Uses Node.js `fs/promises.readFile()`
- Supports multiple encodings (utf-8, ascii, base64)
- Returns file metadata (size, last modified)
- Handles binary files (returns base64 encoded)

### Parameters

```typescript
{
  path: string;           // Path to file (absolute or relative)
  encoding?: string;      // File encoding (default: "utf-8")
  maxSize?: number;       // Max file size in bytes (default: 10MB)
}
```

### Examples

**Basic usage:**
```json
{
  "path": "resume.txt"
}
```

**With encoding:**
```json
{
  "path": "data.csv",
  "encoding": "ascii"
}
```

**Size limit:**
```json
{
  "path": "large-file.txt",
  "maxSize": 1048576
}
```

### Output Format

**Success:**
```json
{
  "content": "John Doe\nSoftware Engineer\n...",
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

### Error Handling
- **File not found**: Returns friendly error message
- **Permission denied**: Returns descriptive error
- **File too large**: Returns error with size limit
- **Binary file**: Automatically detects and returns base64

### Security Notes
- Validates paths to prevent directory traversal
- Enforces maximum file size to prevent memory issues
- Does not execute file contents
- Safe for reading sensitive data (not logged)

---

## searchFiles

### What It Does
Searches for text patterns within files in a directory using regular expressions.

### Why You Need It
**For JobOS and AI Apps:**
- Find all applications mentioning "Python" in your notes
- Search resumes for specific skills
- Find job descriptions with salary ranges
- Locate files containing company names
- Search code for specific functions

**Real-World Example:**
```
You: "Find all job applications where I mentioned React experience"
AI: [calls searchFiles with query="React", path="applications/")]
AI: "I found React mentioned in 5 applications: Google, Meta, Netflix..."
```

### How It Works
1. Takes a search query (text or regex) and directory path
2. Optionally filters by file types
3. Recursively searches files in directory
4. Returns matches with context (line numbers, surrounding text)
5. Limits results to prevent overwhelming output

**Technical Details:**
- Uses regex matching for flexible searches
- Supports case-insensitive searches
- Returns context lines around matches
- Limits to first 50 matches by default
- Skips binary files automatically

### Parameters

```typescript
{
  query: string;              // Search pattern (text or regex)
  path: string;               // Directory to search
  fileTypes?: string[];       // Filter by extensions (e.g., ["txt", "md"])
  caseSensitive?: boolean;    // Case-sensitive search (default: false)
  maxResults?: number;        // Max results to return (default: 50)
  recursive?: boolean;        // Search subdirectories (default: true)
}
```

### Examples

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
  "path": ".",
  "caseSensitive": false
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
      "content": "Experience with Python, Django, and React",
      "context": {
        "before": "Skills:",
        "after": "Projects:"
      }
    }
  ],
  "totalMatches": 5,
  "filesSearched": 23
}
```

### Error Handling
- **Invalid regex**: Returns error with regex syntax help
- **Directory not found**: Returns friendly error
- **Permission denied**: Skips files and continues
- **Too many results**: Returns first N with warning

### Security Notes
- Does not search outside specified directory
- Skips system files and hidden files by default
- Does not execute file contents
- Regex timeout to prevent ReDoS attacks

---

## executeCommand

### What It Does
Executes shell commands on your system and returns the output.

### Why You Need It
**For JobOS and AI Apps:**
- Run git commands to commit application materials
- Execute npm scripts to build projects
- Run tests before submitting code
- Automate file operations
- Check system status

**Real-World Example:**
```
You: "Commit my updated resume to git"
AI: [calls executeCommand("git add resume.txt")]
AI: [calls executeCommand("git commit -m 'Updated resume'")]
AI: "Your resume has been committed to git!"
```

### How It Works
1. Takes a command and optional arguments
2. Validates command against whitelist (optional)
3. Spawns child process with timeout
4. Captures stdout and stderr
5. Returns output and exit code

**Technical Details:**
- Uses `child_process.spawn()` for safety
- Enforces timeout to prevent hanging
- Captures both stdout and stderr
- Returns exit code for error handling
- Does NOT use shell by default (prevents injection)

### Parameters

```typescript
{
  command: string;        // Command to execute (e.g., "git")
  args?: string[];        // Command arguments (e.g., ["status"])
  cwd?: string;           // Working directory (default: current)
  timeout?: number;       // Timeout in ms (default: 30000)
  env?: object;           // Environment variables
}
```

### Examples

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

**Echo command:**
```json
{
  "command": "echo",
  "args": ["Hello World"]
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

### Error Handling
- **Command not found**: Returns error with suggestions
- **Timeout**: Kills process and returns timeout error
- **Permission denied**: Returns descriptive error
- **Invalid arguments**: Returns error with help

### Security Notes
⚠️ **IMPORTANT**: This tool can execute arbitrary commands!

- **Whitelist recommended**: Only allow specific commands
- **No shell**: Uses spawn (not exec) to prevent shell injection
- **Timeout enforced**: Prevents infinite loops
- **Working directory validated**: Prevents directory traversal
- **Consider disabling in production**: Or require authentication

---

## webFetch

### What It Does
Fetches content from a URL and optionally parses HTML to extract specific data.

### Why You Need It
**For JobOS and AI Apps:**
- Fetch job postings from company websites
- Get company information for research
- Download public resumes/portfolios
- Access documentation and guides
- Fetch API data

**Real-World Example:**
```
You: "Research Google's engineering culture"
AI: [calls webFetch("https://careers.google.com/culture")]
AI: [analyzes content]
AI: "Here's what I found about Google's culture..."
```

### How It Works
1. Takes a URL as input
2. Sends HTTP GET request
3. Optionally parses HTML with CSS selectors
4. Extracts text content
5. Returns structured data with metadata

**Technical Details:**
- Uses `node-fetch` for HTTP requests
- Uses `cheerio` for HTML parsing
- Follows redirects automatically
- Respects robots.txt (optional)
- Sets user-agent header
- Timeout after 30 seconds

### Parameters

```typescript
{
  url: string;              // URL to fetch
  selector?: string;        // CSS selector to extract (e.g., ".job-description")
  format?: string;          // Output format: "text" | "html" | "json"
  timeout?: number;         // Request timeout in ms (default: 30000)
  headers?: object;         // Custom HTTP headers
}
```

### Examples

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

**With custom headers:**
```json
{
  "url": "https://api.example.com/data",
  "headers": {
    "Accept": "application/json"
  }
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

### Error Handling
- **404 Not Found**: Returns error with status code
- **Timeout**: Returns timeout error after 30s
- **Network error**: Returns descriptive error
- **Invalid URL**: Returns validation error
- **SSL error**: Returns certificate error

### Security Notes
- Does not execute JavaScript (use scraping tool for that)
- Validates URLs to prevent SSRF attacks
- Does not follow file:// or internal URLs
- Respects Content-Security-Policy headers
- Rate limiting recommended for production

---

## scrapeLinkedInJob

### What It Does
Uses browser automation to scrape job details from LinkedIn job postings, extracting structured data like title, company, description, requirements, and salary.

### Why You Need It
**For JobOS:**
- Automatically extract job details for analysis
- Save job postings before they expire
- Compare multiple job postings
- Track job requirements over time
- Build a database of job opportunities

**Real-World Example:**
```
You: "Analyze this LinkedIn job: https://linkedin.com/jobs/view/123456"
AI: [calls scrapeLinkedInJob(url)]
AI: "This is a Senior Software Engineer role at Google in Mountain View..."
AI: [calls saveToFile to save job details]
AI: "I've saved the job details for your review"
```

### How It Works
1. Takes a LinkedIn job URL
2. Launches headless Chrome browser with Playwright
3. Navigates to the job posting
4. Waits for dynamic content to load
5. Extracts structured data using CSS selectors
6. Returns parsed job information
7. Closes browser

**Technical Details:**
- Uses Playwright for browser automation
- Runs in headless mode (no visible window)
- Handles dynamic JavaScript content
- Takes screenshot for debugging (optional)
- Respects rate limits to avoid blocking
- Can handle authentication (cookies)

### Parameters

```typescript
{
  url: string;                  // LinkedIn job URL
  includeDescription?: boolean; // Include full description (default: true)
  screenshot?: boolean;         // Save screenshot (default: false)
  waitForSelector?: string;     // Custom selector to wait for
}
```

### Examples

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

### Output Format

**Success:**
```json
{
  "title": "Senior Software Engineer",
  "company": "Google",
  "location": "Mountain View, CA",
  "employmentType": "Full-time",
  "description": "We are looking for a talented engineer...",
  "requirements": [
    "5+ years of software development experience",
    "Strong knowledge of Python and Java",
    "Experience with distributed systems"
  ],
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

### Error Handling
- **Job removed**: Returns error if posting no longer exists
- **Authentication required**: Returns error with instructions
- **Rate limited**: Returns error suggesting retry later
- **Invalid URL**: Validates LinkedIn job URL format
- **Timeout**: Returns error if page doesn't load in 30s

### Security Notes
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

## echoText

### What It Does
Simply echoes back the text you provide. Useful for testing and verification.

### Why You Need It
- Test that MCP server is working
- Verify tool calling mechanism
- Debug AI tool usage
- Simple sanity check

### Parameters
```typescript
{
  text: string;  // Text to echo back
}
```

### Example
```json
{
  "text": "Hello, World!"
}
```

### Output
```json
{
  "echoed": "Hello, World!"
}
```

---

## summarizeDirectory

### What It Does
Lists all files and subdirectories in a specified directory with metadata.

### Why You Need It
- Explore directory structure
- Find files in a folder
- Get overview of project structure
- Verify file organization

### Parameters
```typescript
{
  path: string;  // Directory path to summarize
}
```

### Example
```json
{
  "path": "applications/"
}
```

### Output
```
Directory: applications/

Found 5 files and 3 directories (8 total)

Example files: cover-letter.txt, resume.pdf, notes.md
Example directories: google, meta, netflix

All items:
  📁 google
  📁 meta
  📁 netflix
  📄 cover-letter.txt
  📄 resume.pdf
```

---

## Summary Table

| Tool | Primary Use | Complexity | Security Risk |
|------|-------------|------------|---------------|
| **saveToFile** | Save AI outputs | Low | Low |
| **readFile** | Load documents | Low | Low |
| **searchFiles** | Find content | Medium | Low |
| **executeCommand** | Run commands | High | **HIGH** ⚠️ |
| **webFetch** | Get web content | Medium | Medium |
| **scrapeLinkedInJob** | Extract job data | High | Medium |
| **echoText** | Testing | Low | None |
| **summarizeDirectory** | List files | Low | Low |

---

## Best Practices

### For JobOS Integration
1. **Organize files**: Use `saveToFile` with categories
2. **Template system**: Use `readFile` to load templates
3. **Track applications**: Save job details with `scrapeLinkedInJob`
4. **Search history**: Use `searchFiles` to find past applications
5. **Automate workflows**: Chain tools together

### Security
1. **Validate inputs**: Always check user inputs
2. **Limit scope**: Restrict file operations to specific directories
3. **Whitelist commands**: Only allow safe commands in `executeCommand`
4. **Rate limit**: Prevent abuse of web scraping tools
5. **Audit logs**: Track all tool usage

### Performance
1. **Cache results**: Don't re-fetch unchanged data
2. **Batch operations**: Combine multiple file operations
3. **Async operations**: Tools run asynchronously
4. **Timeout handling**: Set appropriate timeouts
5. **Error recovery**: Handle failures gracefully

---

## Troubleshooting

### Tool Not Working
1. Check tool is registered in server
2. Verify input parameters match schema
3. Check error messages in response
4. Test with simple inputs first
5. Check file permissions

### Performance Issues
1. Reduce file sizes being processed
2. Limit search scope
3. Increase timeouts if needed
4. Check network connectivity (web tools)
5. Monitor system resources

### Security Concerns
1. Review command whitelist
2. Validate all file paths
3. Check directory permissions
4. Monitor tool usage logs
5. Update dependencies regularly

---

**Need Help?** Check the main [README.md](./README.md) or [TOOLS.md](./TOOLS.md) for more information.
