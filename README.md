# LetsMCP - AI-Powered MCP Server

A powerful [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server with integrated AI capabilities. Supports multiple AI providers (Groq, Claude, Gemini) with automatic fallback, LinkedIn job scraping, and a REST API for external application integration.

## Features

### MCP Server
- ✅ **Stdio Transport**: Standard MCP transport for Claude Desktop, Cursor, and Antigravity
- ✅ **HTTP Health Endpoint**: Monitor server status at `/health`
- ✅ **8 MCP Tools**: File operations, command execution, web scraping, and more
- ✅ **One Resource**: `server://info` - provides server metadata

### AI Integration (NEW)
- ✅ **Multi-Provider AI**: Groq (Llama 3.1), Claude (Anthropic), and Google Gemini
- ✅ **Automatic Fallback**: If one provider fails, automatically tries the next
- ✅ **REST API**: HTTP endpoints for external applications (like JobOS)
- ✅ **LinkedIn Scraping**: Browser-based job scraping with Playwright
- ✅ **Job Extraction**: AI-powered extraction of job details from text/URLs
- ✅ **Resume Analysis**: Compare resumes against job descriptions
- ✅ **Email Drafting**: Generate professional outreach emails with strict formatting controls (JSON-safe).

### Infrastructure
- ✅ **TypeScript**: Full type safety with the official MCP SDK
- ✅ **Comprehensive Tests**: Unit tests with Vitest
- ✅ **Production Ready**: Error handling, validation, and security measures
- ✅ **Deployment Ready**: Railway, Render, Fly.io support

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/shanebe-ai/letsmcp.git
cd letsmcp

# Install dependencies
npm install

# Copy environment file and add your API keys
cp .env.example .env
```

### Configuration

Edit `.env` with your API keys:

```env
# Server Configuration
PORT=3002
HOST=0.0.0.0

# AI Provider API Keys (at least one required for AI features)
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-70b-versatile

CLAUDE_API_KEY=your_claude_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash

# Default AI provider (groq, claude, or gemini)
DEFAULT_AI_PROVIDER=groq
```

Get your API keys from:
- **Groq**: https://console.groq.com/keys
- **Claude**: https://console.anthropic.com/settings/keys
- **Gemini**: https://aistudio.google.com/app/apikey

### Running

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start with:
- **MCP communication**: stdio (standard input/output)
- **HTTP API**: `http://localhost:3002/api/*`
- **Health endpoint**: `http://localhost:3002/health`

## REST API Endpoints

### Status & Configuration

#### `GET /api/status`
Returns server status and configured AI providers.

```bash
curl http://localhost:3002/api/status
```

Response:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "providers": ["groq", "gemini"],
  "hasAI": true
}
```

#### `POST /api/config`
Update AI provider configuration at runtime.

```bash
curl -X POST http://localhost:3002/api/config \
  -H "Content-Type: application/json" \
  -d '{"groq": {"apiKey": "your_key"}, "defaultProvider": "groq"}'
```

### AI Features

#### `POST /api/generate`
Generate text using AI.

```bash
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a brief introduction for a software engineer", "provider": "groq"}'
```

#### `POST /api/extract-job`
Extract job details from text or URL. Automatically uses LinkedIn scraper for LinkedIn URLs.

```bash
# From text
curl -X POST http://localhost:3002/api/extract-job \
  -H "Content-Type: application/json" \
  -d '{"text": "Senior Software Engineer at Google, Mountain View, CA..."}'

# From LinkedIn URL
curl -X POST http://localhost:3002/api/extract-job \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/jobs/view/123456789"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "Senior Software Engineer",
    "company": "Google",
    "location": "Mountain View, CA",
    "description": "...",
    "salary": "$150,000 - $200,000"
  },
  "provider": "groq"
}
```

#### `POST /api/scrape-linkedin`
Directly scrape a LinkedIn job posting.

```bash
curl -X POST http://localhost:3002/api/scrape-linkedin \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/jobs/view/123456789", "screenshot": false}'
```

#### `POST /api/analyze-resume`
Analyze how well a resume matches a job description.

```bash
curl -X POST http://localhost:3002/api/analyze-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "We are looking for a React developer...",
    "resumeText": "5 years experience with React, TypeScript..."
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "matchScore": 85,
    "strengths": ["React experience", "TypeScript proficiency"],
    "gaps": ["No mention of testing frameworks"],
    "recommendations": ["Add Jest/Cypress experience"],
    "keywords": {
      "matched": ["React", "TypeScript", "Node.js"],
      "missing": ["Jest", "CI/CD"]
    }
  },
  "provider": "groq"
}
```

#### `POST /api/draft-email`
Draft a professional outreach email.

```bash
curl -X POST http://localhost:3002/api/draft-email \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "John Smith",
    "recipientRole": "Engineering Manager",
    "companyName": "TechCorp",
    "jobTitle": "Senior Engineer",
    "tone": "Professional",
    "intent": "Connect"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "subject": "Connecting about opportunities at TechCorp",
    "body": "Hi John,\n\nI've been following TechCorp's work...",
    "confidence": 85
  },
  "provider": "groq"
}
```

**Intent options**: `Connect`, `FollowUp`, `ReferralRequest`, `PeerOutreach`
**Tone options**: `Formal`, `Casual`, `Enthusiastic`, `Professional`

### Job Queue Management

#### `POST /api/jobs`
Save a job to the queue (used by Chrome extension).

```bash
curl -X POST http://localhost:3002/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Engineer",
    "company": "TechCorp",
    "location": "San Francisco, CA",
    "workType": "Remote",
    "description": "<p>Job description...</p>",
    "url": "https://linkedin.com/jobs/view/123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Job saved to queue"
}
```

#### `GET /api/jobs`
Retrieve all queued jobs.

```bash
curl http://localhost:3002/api/jobs
```

Response:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "job_1768634456345_0",
      "title": "Senior Engineer",
      "company": "TechCorp",
      "location": "San Francisco, CA",
      "workType": "Remote",
      "description": "<p>Job description...</p>",
      "url": "https://linkedin.com/jobs/view/123",
      "scrapedAt": "2026-01-17T04:14:07.702Z",
      "source": "visual-fallback"
    }
  ]
}
```

#### `DELETE /api/jobs/:id`
Delete a specific job from the queue.

```bash
curl -X DELETE http://localhost:3002/api/jobs/job_1768634456345_0
```

Response:
```json
{
  "success": true,
  "message": "Job deleted"
}
```

#### `DELETE /api/jobs`
Clear all jobs from the queue.

```bash
curl -X DELETE http://localhost:3002/api/jobs
```

Response:
```json
{
  "success": true,
  "message": "Job queue cleared"
}
```

## MCP Tools

### Core Tools

| Tool | Description |
|------|-------------|
| `saveToFile` | Save text content to a file with auto directory creation |
| `readFile` | Read file contents as text |
| `searchFiles` | Search for patterns in files using regex |
| `executeCommand` | Execute shell commands |
| `webFetch` | Fetch and parse web content |
| `scrapeLinkedInJob` | Scrape LinkedIn job postings with Playwright |

### Utility Tools

| Tool | Description |
|------|-------------|
| `echoText` | Echo back text (for testing) |
| `summarizeDirectory` | List directory contents with metadata |

> **📖 For detailed tool documentation, see [TOOL_GUIDE.md](./TOOL_GUIDE.md)**

## Connecting MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "letsmcp": {
      "command": "node",
      "args": ["/path/to/letsmcp/dist/index.js"],
      "env": {
        "PORT": "3002",
        "HOST": "localhost",
        "GROQ_API_KEY": "your_key_here"
      }
    }
  }
}
```

### Cursor IDE

Add to Cursor configuration:

**Windows**: `%APPDATA%\Cursor\User\globalStorage\cursor-mcp\config.json`
**macOS**: `~/Library/Application Support/Cursor/User/globalStorage/cursor-mcp/config.json`

```json
{
  "mcpServers": {
    "letsmcp": {
      "command": "node",
      "args": ["/path/to/letsmcp/dist/index.js"],
      "env": {
        "PORT": "3002",
        "GROQ_API_KEY": "your_key_here"
      }
    }
  }
}
```

> **📖 See [MCP_CONFIG.md](./MCP_CONFIG.md) for more configuration options**

## Integration with External Apps

LetsMCP provides a REST API that can be used by any application. For example, [JobOS](https://github.com/shanebe-ai/JobOS) uses LetsMCP for:

- **Magic Paste**: Extracts job details from pasted text or LinkedIn URLs
- **Resume Analyst**: AI-powered resume vs job description analysis
- **Email Drafter**: Generates professional outreach emails

### Example: JobOS Integration

```typescript
// Check if LetsMCP is available
const response = await fetch('http://localhost:3002/api/status');
const { hasAI } = await response.json();

if (hasAI) {
  // Use LetsMCP for AI features
  const result = await fetch('http://localhost:3002/api/extract-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: linkedInUrl })
  });
}
```

## Project Structure

```
letsmcp/
├── src/
│   ├── index.ts              # Main entry (HTTP server + MCP stdio)
│   ├── server.ts             # MCP server initialization
│   ├── tools.ts              # MCP tool definitions
│   ├── api/
│   │   ├── index.ts          # API exports
│   │   └── routes.ts         # REST API route handlers
│   └── ai/
│       ├── index.ts          # AI exports
│       ├── types.ts          # TypeScript interfaces
│       ├── prompts.ts        # Shared AI prompts
│       ├── service.ts        # Unified AI service with fallback
│       └── providers/
│           ├── index.ts      # Provider exports
│           ├── groq.ts       # Groq (Llama 3.1) provider
│           ├── claude.ts     # Claude (Anthropic) provider
│           └── gemini.ts     # Google Gemini provider
├── src/__tests__/            # Unit tests
├── dist/                     # Compiled JavaScript
├── .env.example              # Environment template
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Development

```bash
# Type checking
npm run typecheck

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build
```

## Testing

```bash
# Run all tests
npm test

# Test with coverage
npm run test:coverage

# Quick health check
curl http://localhost:3002/health

# Test AI status
curl http://localhost:3002/api/status
```

## Deployment

### Using PM2 (Recommended for VPS)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
cd /path/to/letsmcp
PORT=3002 pm2 start npm --name "letsmcp" -- run dev

# Save for auto-restart
pm2 save
pm2 startup
```

### Cloud Platforms

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guides for:
- Railway
- Render
- Fly.io
- Docker

## Troubleshooting

### No AI providers showing
- Check your `.env` file has valid API keys
- Restart the server after changing `.env`: `pm2 restart letsmcp --update-env`

### LinkedIn scraping fails
- LinkedIn may require authentication for some job pages
- Try using the job description text directly instead of URL

### CORS errors from browser
- The server has CORS enabled for all origins in development
- For production, configure allowed origins in `src/index.ts`

### Port already in use
- Change the port in `.env`: `PORT=3003`
- Or kill the existing process: `fuser -k 3002/tcp`

## Author

**shanebe-ai** (shanbe@live.com)

## License

MIT
