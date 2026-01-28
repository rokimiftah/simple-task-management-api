# Deployment Guide - ElysiaJS + Scalar API

> Based on [ElysiaJS Official Deployment Guide](https://elysiajs.com/patterns/deploy.md)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Production Build](#production-build)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [Cluster Mode (Multi-Core)](#cluster-mode-multi-core)
6. [Environment Variables](#environment-variables)
7. [Production Checklist](#production-checklist)

---

## Prerequisites

- Bun runtime (v1.0+)
- Node.js v18+ (optional, for some tools)
- Docker & Docker Compose (for containerized deployment)
- Git

---

## Production Build

### Compile to Binary (Recommended)

Elysia recommends compiling to binary to reduce memory usage by 2-3x.

```bash
# Build binary for current platform
bun run build

# Build for Linux x64 (for VPS/cloud)
bun run build:linux

# Build for Docker
bun run build:docker
```

This generates a portable `server` binary that can run without Bun installed.

**Run the binary:**

```bash
# Make executable (Linux)
chmod +x server

# Run
./server
```

**Available Build Targets:**
| Target | OS | Architecture |
| --------------------- | ------- | ------------ |
| bun-linux-x64 | Linux | x64 |
| bun-linux-arm64 | Linux | arm64 |
| bun-windows-x64 | Windows | x64 |
| bun-darwin-x64 | macOS | x64 |
| bun-darwin-arm64 | macOS | arm64 |
| bun-linux-x64-musl | Linux | x64 (musl) |
| bun-linux-arm64-musl | Linux | arm64 (musl) |

**Note:** Bun requires AVX2 hardware support. If you see random Chinese errors, the machine doesn't support AVX2.

### Compile to JavaScript (Alternative)

If you can't compile to binary or deploying to Windows:

```bash
bun build \
	--minify-whitespace \
	--minify-syntax \
	--outfile ./dist/index.js \
	src/index.ts
```

Run with:

```bash
NODE_ENV=production bun ./dist/index.js
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

### Using Docker CLI

```bash
# Build image
docker build -t elysia-api:latest .

# Run container
docker run -d \
  --name elysia-api \
  -p 3000:3000 \
  --restart unless-stopped \
  elysia-api:latest

# View logs
docker logs -f elysia-api
```

### Dockerfile Details

The Dockerfile uses multi-stage build:

1. **Build stage**: Compiles TypeScript to binary using Bun
2. **Runtime stage**: Uses minimal Distroless image (~20MB)

**Advantages:**

- Small image size
- No Bun runtime needed
- Faster startup
- Reduced memory usage

---

## Cloud Deployment Options

### Option 1: Railway

Railway assigns random ports via `PORT` environment variable. Our server already supports this.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up
```

**Railway Environment Variables:**

- `NODE_ENV=production` (set automatically)
- `PORT` (set automatically by Railway)

### Option 2: Render

1. Connect GitHub repository to Render
2. Create new "Web Service"
3. Configure:
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `./server`
   - **Environment Variables**:
     - `NODE_ENV=production`

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Initialize
flyctl launch

# Deploy
flyctl deploy
```

### Option 4: VPS (DigitalOcean, Linode, AWS EC2)

```bash
# Clone repository
git clone <your-repo-url>
cd simple-task-management-api

# Build binary
bun install
bun run build:linux

# Make executable
chmod +x server

# Run with PM2
npm install -g pm2
pm2 start ./server --name "elysia-api"
pm2 save
pm2 startup

# Or run directly
./server
```

### Option 5: Cloudflare Workers (Serverless)

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Initialize
wrangler init

# Deploy
wrangler deploy
```

---

## Cluster Mode (Multi-Core)

Elysia is single-threaded by default. To use multiple CPU cores, run in cluster mode.

### Create Cluster Entry Point

Create `src/cluster.ts`:

```ts
import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";

if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
} else {
  await import("./index");
  console.log(`Worker ${process.pid} started`);
}
```

### Run Cluster Mode

```bash
# Development
bun run src/cluster.ts

# Production (binary)
bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile server \
	src/cluster.ts

./server
```

**Note:** Elysia on Bun uses `SO_REUSEPORT` by default, allowing multiple instances to listen on the same port (Linux only).

---

## Environment Variables

### VPS Deployment (Debian + Caddy)

Environment variables di-set di systemd service file (`deploy/eplc-test-api.service`):

```ini
Environment=NODE_ENV=production
Environment=PORT=3001
```

### Cloud Deployment (Railway, Render, Fly.io)

Platform cloud ini menyediakan environment variables secara otomatis:

- `NODE_ENV=production` - di-set otomatis oleh platform
- `PORT` - di-set otomatis oleh platform (server menggunakan `process.env.PORT ?? 3000`)

**Note:** `DATABASE_URL` tidak digunakan di proyek ini. Database SQLite disimpan di `./tasks.db`.

---

## Production Checklist

### Essential

- [ ] Set `NODE_ENV=production`
- [ ] Compile to binary (`bun run build`)
- [ ] Remove development dependencies
- [ ] Use process manager (PM2, systemd)

### Security

- [ ] Configure CORS if needed
- [ ] Add rate limiting
- [ ] Implement proper logging
- [ ] Add error monitoring (Sentry)
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Configure database backups

### Performance

- [ ] Enable cluster mode for multi-core
- [ ] Use compiled binary
- [ ] Configure health checks
- [ ] Add monitoring and alerting
- [ ] Implement caching if needed

### DevOps

- [ ] Set up CI/CD pipeline
- [ ] Configure automated testing
- [ ] Set up staging environment
- [ ] Document deployment process

---

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Docker Build Issues

```bash
# Rebuild without cache
docker-compose build --no-cache

# Check logs
docker-compose logs api
```

### Binary Won't Run (Linux)

```bash
# Make executable
chmod +x server

# Run
./server
```

### Random Chinese Characters Error

This means the machine doesn't support AVX2. Bun requires AVX2 hardware support. No workaround available.

### Database Permission Issues

```bash
chmod 644 tasks.db
```

---

## Performance Optimization

### Use Compiled Binary

```bash
bun run build
./server
```

### Enable Cluster Mode

Use `src/cluster.ts` to leverage all CPU cores.

### Use PM2 for Process Management

```bash
pm2 start ./server --name "elysia-api" --max-memory-restart 500M
pm2 startup
pm2 save
```

### NGINX Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## OpenTelemetry Support

If using OpenTelemetry, exclude instrumented libraries from bundling:

```bash
bun build \
	--compile \
	--external pg \
	--outfile server \
	src/index.ts
```

Install production dependencies on server:

```bash
bun install --production
```

---

## Monitoring

### Health Endpoint

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-28T10:00:00.000Z"
}
```

### PM2 Monitoring

```bash
pm2 status
pm2 logs elysia-api
pm2 monit
```

---

## Support

- **ElysiaJS**: https://elysiajs.com
- **ElysiaJS Deployment**: https://elysiajs.com/patterns/deploy.md
- **Scalar**: https://scalar.com
- **Bun**: https://bun.sh

---

## VPS Debian + Caddy Deployment

### Overview

Deployment otomatis menggunakan GitHub Actions untuk build dan deploy ke VPS Debian dengan Caddy sebagai reverse proxy dan systemd untuk process management.

### Architecture

```
GitHub Actions (Build) → VPS (Deploy) → Systemd (Run) → Caddy (Proxy)
```

1. **Build Phase**: GitHub Actions build binary dengan mode cluster
2. **Deploy Phase**: Upload binary ke VPS via SSH, restart systemd service
3. **Runtime**: Systemd menjalankan binary di port 3001, Caddy reverse proxy ke HTTPS

### Prerequisites

#### GitHub Secrets

Setup secrets di GitHub repository settings:

| Secret             | Description                   | Example                                  |
| ------------------ | ----------------------------- | ---------------------------------------- |
| `SSH_PRIVATE_KEY`  | Private key untuk SSH ke VPS  | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_HOST`         | IP atau hostname VPS          | `123.456.789.0`                          |
| `SSH_USER`         | Username SSH VPS              | `root`                                   |
| `TARGET_DIRECTORY` | Path folder deployment di VPS | `/root/eplc-test-api`                    |

#### VPS Setup

Install dependencies:

```bash
# Update system
apt update && apt upgrade -y

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y

# Verify Caddy snippets exist
ls /etc/caddy/snippets/
```

### One-time Setup

#### 1. Create Deployment Directory

```bash
mkdir -p /root/eplc-test-api
```

#### 2. Create Systemd Service

```bash
cat > /etc/systemd/system/eplc-test-api.service << 'EOF'
[Unit]
Description=Simple Task Management API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/eplc-test-api
ExecStart=/root/eplc-test-api/server
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable eplc-test-api
```

#### 3. Create Caddy Configuration

```bash
cat > /etc/caddy/sites-available/eplc-test-api.caddy << 'EOF'
eplc-test.rokimiftah.id {
    import dns_cloudflare
    import encoding
    import security

    reverse_proxy 127.0.0.1:3001
}
EOF

ln -s /etc/caddy/sites-available/eplc-test-api.caddy /etc/caddy/sites-enabled/
caddy reload -c /etc/caddy/Caddyfile
```

#### 4. Verify Setup

```bash
# Check systemd service
systemctl status eplc-test-api

# Check Caddy configuration
caddy validate -c /etc/caddy/Caddyfile

# Check Caddy status
systemctl status caddy
```

### Deployment Process

#### Automatic Deployment

Deployment otomatis trigger saat push ke `main` branch via GitHub Actions.

#### Manual Deployment (Optional)

```bash
# Local build
bun install
bun run build:cluster

# Upload to VPS
scp server root@your-vps-ip:/root/eplc-test-api/

# SSH to VPS and restart
ssh root@your-vps-ip
cd /root/eplc-test-api
chmod +x server
systemctl restart eplc-test-api
```

### Monitoring

#### Check Application Status

```bash
# Systemd service status
systemctl status eplc-test-api

# Real-time logs
journalctl -u eplc-test-api -f

# Last 100 logs
journalctl -u eplc-test-api -n 100

# Logs since boot
journalctl -u eplc-test-api -b
```

#### Check Caddy Status

```bash
# Caddy service status
systemctl status caddy

# Caddy logs
journalctl -u caddy -f

# Validate Caddy config
caddy validate -c /etc/caddy/Caddyfile
```

#### Health Check

API menyediakan health check endpoint:

```bash
# Local (di VPS)
curl http://localhost:3001/health

# Public (via HTTPS)
curl https://eplc-test.rokimiftah.id/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-28T10:00:00.000Z"
}
```

### Database

#### Location

Database SQLite disimpan di:

```
/root/eplc-test-api/tasks.db
```

Database akan otomatis dibuat saat pertama kali dijalankan.

#### Backup (Manual)

```bash
# Backup database
cp /root/eplc-test-api/tasks.db /root/eplc-test-api/tasks.db.backup

# Restore database
cp /root/eplc-test-api/tasks.db.backup /root/eplc-test-api/tasks.db
```

### Troubleshooting

#### Service Won't Start

```bash
# Check logs
journalctl -u eplc-test-api -n 50

# Check if binary exists
ls -la /root/eplc-test-api/server

# Check if port is in use
ss -tlnp | grep 3001

# Test binary manually
cd /root/eplc-test-api
./server
```

#### Caddy Not Proxying

```bash
# Check Caddy configuration
caddy validate -c /etc/caddy/Caddyfile

# Check Caddy logs
journalctl -u caddy -n 50

# Check if site is enabled
ls -la /etc/caddy/sites-enabled/

# Reload Caddy
caddy reload -c /etc/caddy/Caddyfile
```

#### Deployment Failed

```bash
# Check GitHub Actions logs di repository Actions tab

# Verify SSH access
ssh -i ~/.ssh/id_ed25519 root@your-vps-ip

# Verify directory exists
ls -la /root/eplc-test-api

# Verify permissions
ls -la /root/eplc-test-api/server
```
