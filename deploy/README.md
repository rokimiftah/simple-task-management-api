# Deployment Setup - VPS Debian + Caddy

## Quick Setup

### 1. Setup GitHub Secrets

Add these secrets to your GitHub repository:

| Secret             | Value                              |
| ------------------ | ---------------------------------- |
| `SSH_PRIVATE_KEY`  | Your VPS SSH private key           |
| `SSH_HOST`         | Your VPS IP or hostname            |
| `SSH_USER`         | Your VPS SSH user (usually `root`) |
| `TARGET_DIRECTORY` | `/root/eplc-test-api`              |

### 2. VPS One-time Setup

SSH to your VPS and run:

```bash
# Create deployment directory
mkdir -p /root/eplc-test-api

# Install Caddy (if not already installed)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y

# Copy systemd service
cp deploy/eplc-test-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable eplc-test-api

# Copy Caddy configuration
cp deploy/eplc-test-api.caddy /etc/caddy/sites-available/
ln -s /etc/caddy/sites-available/eplc-test-api.caddy /etc/caddy/sites-enabled/
caddy reload -c /etc/caddy/Caddyfile
```

### 3. Deploy

Push to `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "feat: add deployment configuration"
git push origin main
```

## Monitoring

```bash
# Check service status
systemctl status eplc-test-api

# View logs
journalctl -u eplc-test-api -f

# Health check
curl https://eplc-test.rokimiftah.id/health
```

## Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide.
