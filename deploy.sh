#!/bin/bash
# Deploy Clawd Bot Org Mission Control to Proxmox
# Run this from the machine that has SSH access to the OVH server
#
# Usage: ./deploy.sh
#
# This script will:
# 1. Clone a Solo container (101) on Proxmox
# 2. Install Node.js 22 and git
# 3. Clone the repo and build
# 4. Set up a systemd service for auto-start
# 5. Print the URL to access the app

set -e

SERVER="ovh-dedicated"
CONTAINER_ID=303
CONTAINER_NAME="mission-control"
APP_PORT=3000
REPO="https://github.com/bensblueprints/clawd-bot-org.git"

echo "=== Clawd Bot Org - Deployment Script ==="
echo ""

# Step 1: Clone template container
echo "[1/6] Creating container $CONTAINER_ID from Solo template (101)..."
ssh $SERVER "pct clone 101 $CONTAINER_ID --hostname $CONTAINER_NAME" 2>/dev/null || echo "Container may already exist, continuing..."

# Step 2: Start the container
echo "[2/6] Starting container..."
ssh $SERVER "pct start $CONTAINER_ID" 2>/dev/null || echo "Container may already be running..."
sleep 3

# Step 3: Install Node.js and git inside container
echo "[3/6] Installing Node.js 22 and git..."
ssh $SERVER "pct exec $CONTAINER_ID -- bash -c '
  apt-get update -qq &&
  apt-get install -y -qq curl git ca-certificates gnupg > /dev/null 2>&1 &&
  mkdir -p /etc/apt/keyrings &&
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg &&
  echo \"deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main\" > /etc/apt/sources.list.d/nodesource.list &&
  apt-get update -qq &&
  apt-get install -y -qq nodejs > /dev/null 2>&1 &&
  echo \"Node.js \$(node -v) installed\" &&
  echo \"npm \$(npm -v) installed\"
'"

# Step 4: Clone repo and build
echo "[4/6] Cloning repo and building..."
ssh $SERVER "pct exec $CONTAINER_ID -- bash -c '
  cd /opt &&
  rm -rf clawd-bot-org &&
  git clone $REPO &&
  cd clawd-bot-org &&
  npm install &&
  npm run build
'"

# Step 5: Create systemd service
echo "[5/6] Setting up systemd service..."
ssh $SERVER "pct exec $CONTAINER_ID -- bash -c 'cat > /etc/systemd/system/mission-control.service << EOF
[Unit]
Description=Clawd Bot Org Mission Control
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/clawd-bot-org
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload &&
systemctl enable mission-control &&
systemctl start mission-control
'"

# Step 6: Get container IP and print access info
echo "[6/6] Getting container info..."
CONTAINER_IP=$(ssh $SERVER "pct exec $CONTAINER_ID -- hostname -I" | tr -d ' ')

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Container ID:  $CONTAINER_ID"
echo "Container:     $CONTAINER_NAME"
echo "Internal IP:   $CONTAINER_IP"
echo "App URL:       http://$CONTAINER_IP:$APP_PORT"
echo ""
echo "To check status:"
echo "  ssh $SERVER \"pct exec $CONTAINER_ID -- systemctl status mission-control\""
echo ""
echo "To view logs:"
echo "  ssh $SERVER \"pct exec $CONTAINER_ID -- journalctl -u mission-control -f\""
echo ""
echo "To restart:"
echo "  ssh $SERVER \"pct exec $CONTAINER_ID -- systemctl restart mission-control\""
