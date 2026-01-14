# Self-Hosted Deployment Guide

This guide covers deploying your MCP server on your own server (VPS, dedicated server, or local server) without using managed platforms like Railway or Fly.io.

---

## Overview

You can deploy the MCP server on any server running Node.js and have applications connect to it:

- **Same server**: Deploy MCP alongside your applications
- **Different server**: Deploy MCP on a dedicated server
- **Local network**: Run on a local server accessible to your network
- **Internet-accessible**: Expose to the internet with proper security

---

## Prerequisites

### Server Requirements

- **OS**: Linux (Ubuntu/Debian recommended), Windows Server, or macOS
- **Node.js**: v18 or higher
- **RAM**: 512MB minimum (1GB+ recommended)
- **Storage**: 500MB minimum
- **Network**: Port 3000 accessible (or your chosen port)

### Optional but Recommended

- **Process Manager**: PM2 for keeping the server running
- **Reverse Proxy**: Nginx or Caddy for HTTPS and routing
- **Firewall**: UFW or iptables for security

---

## Quick Start (Linux/Ubuntu)

### 1. Install Node.js

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Clone and Setup MCP Server

```bash
# Create directory
sudo mkdir -p /opt/mcp
sudo chown $USER:$USER /opt/mcp

# Clone repository (or upload files)
cd /opt/mcp
git clone https://github.com/shanebe-ai/letsmcp.git .

# Or upload files via SCP
# scp -r /local/path/to/mcp user@server:/opt/mcp

# Install dependencies
npm install

# Build
npm run build

# Test
npm start
```

### 3. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start MCP server with PM2
pm2 start dist/index.js --name mcp

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed by the command above
```

### 4. Configure Firewall

```bash
# Install UFW (if not installed)
sudo apt install ufw

# Allow SSH (important!)
sudo ufw allow ssh

# Allow MCP port
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Connecting Applications

### Option 1: Same Server (Recommended)

If your application and MCP are on the same server:

```typescript
// In your application
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/opt/mcp/dist/index.js']
});

const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);
```

### Option 2: Different Server (SSH)

If apps are on different servers, use SSH:

```typescript
// In your app
const transport = new StdioClientTransport({
  command: 'ssh',
  args: [
    'user@mcp-server.com',
    'node',
    '/opt/mcp/dist/index.js'
  ]
});
```

**Setup SSH key authentication:**

```bash
# On your app server
ssh-keygen -t ed25519 -C "app-to-mcp"

# Copy public key to MCP server
ssh-copy-id user@mcp-server.com

# Test connection
ssh user@mcp-server.com 'node /opt/mcp/dist/index.js'
```

### Option 3: HTTP API (Future Enhancement)

Currently, MCP uses stdio transport. For HTTP access, you'd need to add an HTTP transport layer (see "Advanced: HTTP Transport" below).

---

## Setup with Nginx (Reverse Proxy)

If you want to expose MCP via HTTPS or route multiple services:

### 1. Install Nginx

```bash
sudo apt install nginx
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/mcp`:

```nginx
server {
    listen 80;
    server_name mcp.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

### 3. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Add SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d mcp.yourdomain.com

# Auto-renewal is configured automatically
```

---

## Deploy Alongside Other Applications

### Directory Structure

```
/opt/
├── mcp/              # MCP server
│   ├── dist/
│   ├── src/
│   └── package.json
└── your-app/         # Your application
    ├── dist/
    ├── src/
    └── package.json
```

### Setup Both Apps

```bash
# Setup MCP
cd /opt/mcp
npm install
npm run build
pm2 start dist/index.js --name mcp

# Setup your application
cd /opt/your-app
npm install
npm run build
pm2 start dist/server.js --name your-app

# Save PM2 configuration
pm2 save
```

### Nginx Configuration for Both

```nginx
# MCP Server
server {
    listen 80;
    server_name mcp.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Your Application
server {
    listen 80;
    server_name app.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
    }
}
```

### Your Application Connects to MCP

Since they're on the same server, your application can connect via stdio:

```typescript
// In your application
const transport = new StdioClientTransport({
  command: 'node',
  args: ['/opt/mcp/dist/index.js']
});
```

---

## Environment Variables

Create `/opt/mcp/.env`:

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

Update PM2 to use .env:

```bash
pm2 delete mcp
pm2 start dist/index.js --name mcp --env-file .env
pm2 save
```

---

## Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs mcp

# Monitor resources
pm2 monit

# View status
pm2 status

# Restart if needed
pm2 restart mcp
```

### Setup Log Rotation

```bash
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Security Best Practices

### 1. Firewall Configuration

```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Create Dedicated User

```bash
# Create user for MCP
sudo useradd -r -s /bin/bash mcp-user

# Change ownership
sudo chown -R mcp-user:mcp-user /opt/mcp

# Run PM2 as that user
sudo su - mcp-user
pm2 start /opt/mcp/dist/index.js --name mcp
pm2 save
```

### 3. Restrict Access

If MCP should only be accessible from specific IPs:

```bash
# UFW: Allow only from specific IP
sudo ufw allow from 192.168.1.100 to any port 3000

# Nginx: Restrict by IP
location / {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://localhost:3000;
}
```

---

## Advanced: HTTP Transport

To enable HTTP access (for apps that can't use stdio), you'd need to add HTTP transport support.

### Modify `src/index.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();

// Existing health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'letsmcp', version: '2.0.0' });
});

// Add SSE endpoint for MCP
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createServer();
  await server.connect(transport);
});

app.post('/messages', express.json(), async (req, res) => {
  // Handle MCP messages
});

app.listen(3000, () => {
  console.log('MCP server with HTTP transport on port 3000');
});
```

**Note**: This requires additional implementation. The current version uses stdio transport only.

---

## Troubleshooting

### Server Won't Start

```bash
# Check logs
pm2 logs mcp

# Check if port is in use
sudo lsof -i :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Can't Connect from App

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test from remote machine
curl http://your-server-ip:3000/health

# Check firewall
sudo ufw status

# Check if server is listening
sudo netstat -tlnp | grep 3000
```

### PM2 Not Starting on Boot

```bash
# Re-run startup command
pm2 startup

# Follow the instructions
# Then save
pm2 save
```

---

## Backup and Updates

### Backup

```bash
# Backup MCP directory
tar -czf mcp-backup-$(date +%Y%m%d).tar.gz /opt/mcp

# Backup to remote server
rsync -avz /opt/mcp user@backup-server:/backups/mcp/
```

### Update MCP Server

```bash
cd /opt/mcp

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart mcp

# Check logs
pm2 logs mcp
```

---

## Cost Comparison

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| **Self-Hosted VPS** | $5-20/month | Full control, no vendor lock-in | Manual setup, maintenance |
| **Railway/Render** | $5-7/month | Easy setup, auto-deploy | Less control, vendor lock-in |
| **Dedicated Server** | $50+/month | Maximum performance | Expensive, overkill for MCP |
| **Local Server** | Free (electricity) | No monthly cost | Not accessible remotely |

---

## Recommended VPS Providers

- **DigitalOcean**: $6/month (1GB RAM, 25GB SSD)
- **Linode**: $5/month (1GB RAM, 25GB SSD)
- **Vultr**: $6/month (1GB RAM, 25GB SSD)
- **Hetzner**: €4.51/month (2GB RAM, 40GB SSD) - Best value

---

## Example: Complete Setup on DigitalOcean

```bash
# 1. Create droplet (Ubuntu 22.04)
# 2. SSH into server
ssh root@your-droplet-ip

# 3. Update system
apt update && apt upgrade -y

# 4. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 5. Install PM2
npm install -g pm2

# 6. Clone MCP
mkdir -p /opt/mcp
cd /opt/mcp
git clone https://github.com/shanebe-ai/letsmcp.git .

# 7. Setup
npm install
npm run build

# 8. Start with PM2
pm2 start dist/index.js --name mcp
pm2 save
pm2 startup

# 9. Configure firewall
ufw allow ssh
ufw allow 3000/tcp
ufw enable

# 10. Test
curl http://localhost:3000/health
```

---

## Next Steps

1. **Choose your server** (VPS or local)
2. **Follow the Quick Start** guide above
3. **Configure firewall** for security
4. **Setup PM2** for process management
5. **Connect your apps** using stdio or SSH
6. **Monitor and maintain** regularly

---

**Need help?** Check the main [README.md](./README.md) or [DEPLOYMENT.md](./DEPLOYMENT.md) for more information.
