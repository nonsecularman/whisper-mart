#!/usr/bin/env bash
# ============================================================
# Whisper Mart — Ubuntu VPS bootstrap script
# Installs Docker + Docker Compose plugin on a fresh Ubuntu 22.04/24.04 box.
# Run with: sudo bash deployment/setup-vps.sh
# ============================================================
set -euo pipefail

echo "==> Updating system packages"
apt-get update -y && apt-get upgrade -y

echo "==> Installing prerequisites"
apt-get install -y ca-certificates curl gnupg ufw

echo "==> Installing Docker Engine + Compose plugin"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Enabling Docker service"
systemctl enable docker
systemctl start docker

echo "==> Configuring firewall (allow SSH, HTTP, HTTPS)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Installing Nginx + Certbot"
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Done. Next steps:"
echo "  1. Upload/clone the whisper-mart project to this server."
echo "  2. cd whisper-mart && cp .env.example .env && edit .env"
echo "  3. docker compose up -d --build"
echo "  4. Copy deployment/nginx.conf to /etc/nginx/sites-available/whisper-mart"
echo "     and symlink it into /etc/nginx/sites-enabled/, then: nginx -t && systemctl reload nginx"
echo "  5. certbot --nginx -d whisper-selling.xyz -d www.whisper-selling.xyz -d api.whisper-selling.xyz"
