# Deployment Guide for MCP Server

This guide covers deploying your MCP server to various cloud platforms for remote access.

---

## Why Deploy Remotely?

- **Access from anywhere** - Use MCP tools from any device
- **Share with team** - Multiple users can access the same server
- **Deploy with other apps** - Run alongside JobOS or other applications
- **Always available** - No need to keep local machine running
- **Production ready** - Scalable and reliable infrastructure

---

## Deployment Options

### Option 1: Railway (Recommended for Beginners)

**Pros:** Easy setup, automatic deployments, free tier available  
**Cons:** Limited free tier

#### Steps:

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd c:\Users\shane\Downloads\getwork\mcp
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Set Environment Variables** (in Railway dashboard)
   ```
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=production
   ```

6. **Get Your URL**
   ```bash
   railway domain
   ```
   Example: `https://letsmcp-production.up.railway.app`

---

### Option 2: Render

**Pros:** Free tier, automatic SSL, easy GitHub integration  
**Cons:** Cold starts on free tier

#### Steps:

1. **Push to GitHub** (if not already)
   ```bash
   git push origin main
   ```

2. **Go to Render Dashboard**
   - Visit https://render.com
   - Click "New +" → "Web Service"

3. **Connect Repository**
   - Select your GitHub repository
   - Choose `letsmcp` repo

4. **Configure Service**
   - **Name:** letsmcp
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. **Add Environment Variables**
   ```
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=production
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

7. **Get Your URL**
   Example: `https://letsmcp.onrender.com`

---

### Option 3: Fly.io

**Pros:** Edge deployment, fast, generous free tier  
**Cons:** Slightly more complex setup

#### Steps:

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Launch App**
   ```bash
   cd c:\Users\shane\Downloads\getwork\mcp
   fly launch
   ```
   - Choose app name: `letsmcp`
   - Choose region: closest to you
   - Don't deploy yet: `N`

4. **Set Environment Variables**
   ```bash
   fly secrets set PORT=3000
   fly secrets set HOST=0.0.0.0
   fly secrets set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Get Your URL**
   ```bash
   fly status
   ```
   Example: `https://letsmcp.fly.dev`

---

## Post-Deployment

### 1. Verify Deployment

Test the health endpoint:
```bash
curl https://your-app-url.com/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "letsmcp",
  "version": "2.0.0"
}
```

### 2. Configure MCP Clients

#### For Claude Desktop (Remote Server)

**Note:** Claude Desktop currently only supports stdio transport (local). For remote access, you'll need to:

1. **Use SSH Tunneling:**
   ```bash
   ssh -L 3000:localhost:3000 user@your-server.com
   ```

2. **Then configure Claude Desktop as usual:**
   ```json
   {
     "mcpServers": {
       "letsmcp": {
         "command": "node",
         "args": ["c:/Users/shane/Downloads/getwork/mcp/dist/index.js"]
       }
     }
   }
   ```

#### For Cursor IDE (Remote Server)

Cursor can connect to remote MCP servers via SSH:

```json
{
  "mcp": {
    "servers": {
      "letsmcp": {
        "command": "ssh",
        "args": [
          "user@your-server.com",
          "node",
          "/path/to/mcp/dist/index.js"
        ]
      }
    }
  }
}
```

#### For Direct API Access (JobOS, etc.)

Use the MCP SDK to connect via HTTP:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities: {} }
);

// Connect to remote server via SSH or HTTP transport
// (HTTP transport requires additional implementation)
```

---

## Deploy Alongside JobOS

If you're deploying JobOS to a server, you can deploy the MCP server on the same machine:

### On Your Server:

```bash
# Install both apps
cd /home/user
git clone https://github.com/shanebe-ai/letsmcp.git mcp
git clone https://github.com/shanebe-ai/jobos.git jobos

# Setup MCP server
cd mcp
npm install
npm run build

# Setup JobOS
cd ../jobos
npm install
npm run build

# Run both with PM2 (process manager)
npm install -g pm2

pm2 start mcp/dist/index.js --name mcp
pm2 start jobos/dist/server.js --name jobos

# Save PM2 configuration
pm2 save
pm2 startup
```

### Configure Nginx (optional):

```nginx
# /etc/nginx/sites-available/apps

# JobOS
server {
    listen 80;
    server_name jobos.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
    }
}

# MCP Server
server {
    listen 80;
    server_name mcp.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Environment Variables

### Required:
- `PORT` - Port to run on (default: 3000)
- `HOST` - Host to bind to (use `0.0.0.0` for remote access)

### Optional:
- `NODE_ENV` - Set to `production` for production deployments

---

## Monitoring

### Health Checks

All platforms support health checks via `/health` endpoint:

```bash
curl https://your-app-url.com/health
```

### Logs

**Railway:**
```bash
railway logs
```

**Render:**
- View in dashboard under "Logs" tab

**Fly.io:**
```bash
fly logs
```

---

## Scaling

### Railway
- Upgrade plan for more resources
- Auto-scaling available on paid plans

### Render
- Upgrade to paid plan for always-on instances
- Manual scaling via dashboard

### Fly.io
- Scale instances: `fly scale count 2`
- Scale resources: `fly scale vm shared-cpu-1x`

---

## Troubleshooting

### Deployment Fails

1. **Check build logs** for errors
2. **Verify package.json** has correct scripts
3. **Ensure all dependencies** are in `dependencies` (not `devDependencies`)

### Health Check Fails

1. **Verify PORT** environment variable is set
2. **Check HOST** is set to `0.0.0.0` (not `localhost`)
3. **Test locally** first: `npm start`

### Can't Connect from MCP Client

1. **Verify server is running**: Check health endpoint
2. **Check firewall rules**: Ensure port is open
3. **Use SSH tunneling**: For stdio transport clients

---

## Security Considerations

### For Production Deployments:

1. **Add Authentication**
   - Implement API keys or OAuth
   - Restrict access to known clients

2. **Rate Limiting**
   - Prevent abuse of expensive operations
   - Use tools like `express-rate-limit`

3. **HTTPS Only**
   - All platforms provide free SSL
   - Enforce HTTPS in production

4. **Environment Variables**
   - Never commit `.env` files
   - Use platform secret management

5. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Monitor resource usage
   - Set up alerts for downtime

---

## Cost Estimates

### Free Tiers:

| Platform | Free Tier | Limits |
|----------|-----------|--------|
| **Railway** | $5 credit/month | ~500 hours |
| **Render** | Unlimited | Cold starts, 750 hours/month |
| **Fly.io** | 3 VMs | 256MB RAM each |

### Paid Plans:

| Platform | Starting Price | Features |
|----------|----------------|----------|
| **Railway** | $5/month | No cold starts, more resources |
| **Render** | $7/month | Always-on, no cold starts |
| **Fly.io** | Pay-as-you-go | $0.0000022/sec per VM |

---

## Next Steps

1. **Choose a platform** (Railway recommended for beginners)
2. **Deploy your server**
3. **Test the health endpoint**
4. **Configure your MCP clients**
5. **Start using remotely!**

---

**Need help?** Check the main [README.md](./README.md) or platform-specific documentation.
