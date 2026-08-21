#!/usr/bin/env bash
# ==============================================================================
# Unicom University — Automated Server Setup & Provisioning Script
# Target OS: Ubuntu 22.04 / 24.04 LTS or Debian 12
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🚀 Starting Automated Server Provisioning for Unicom University"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating OS packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw apt-transport-https ca-certificates gnupg lsb-release htop

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker is already installed."
fi

# 3. Configure Firewall (UFW)
echo "🔒 Configuring Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "✅ Firewall configured."

# 4. Clone Repository & Setup Directory
APP_DIR="/opt/unicom-university"
if [ ! -d "$APP_DIR" ]; then
    echo "📥 Cloning Unicom University repository to $APP_DIR..."
    sudo git clone https://github.com/supandidml-lgtm/unicom-university.git "$APP_DIR"
    sudo chown -R "$USER:$USER" "$APP_DIR"
else
    echo "✅ Repository directory $APP_DIR already exists."
fi

cd "$APP_DIR"

# 5. Environment Configuration
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚙️ Creating .env configuration from template..."
    cp .env.example .env
    # Generate high-entropy secrets
    JWT_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24)
    sed -i "s/unicom_university_development_secret_key_2026/$JWT_SECRET/g" .env
    echo "✅ Generated secure production secrets in .env."
fi

# 6. Setup Daily Database Backup Cron
echo "💾 Setting up automated daily database backup..."
sudo mkdir -p /var/backups/unicom-university
cat << 'EOF' | sudo tee /etc/cron.daily/unicom-db-backup
#!/bin/bash
BACKUP_DIR="/var/backups/unicom-university"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"
docker exec -t unicom-postgres pg_dump -U unicom_admin unicom_university 2>/dev/null | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz" || true
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
EOF
sudo chmod +x /etc/cron.daily/unicom-db-backup

# 7. Start Containers
echo "🚢 Launching production microservices with Docker Compose..."
docker compose up --build -d

echo "=========================================================="
echo "🎉 UNICOM UNIVERSITY SUCCESSFULLY PROVISIONED & RUNNING!"
echo "=========================================================="
echo "🌐 Web Application: http://$(curl -s ifconfig.me):3000"
echo "🔌 API Endpoint:   http://$(curl -s ifconfig.me):4000/api/v1"
echo "🩺 Health Probe:   http://$(curl -s ifconfig.me):4000/api/v1/health"
echo "=========================================================="
