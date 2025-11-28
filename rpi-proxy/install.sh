#!/bin/bash
# Install script for RPI Proxy service

set -e

# Check if running as root for service installation
if [ "$EUID" -ne 0 ]; then
  echo "Run with sudo: sudo ./install.sh"
  exit 1
fi

# Get the API key
if [ -z "$1" ]; then
  echo "Usage: sudo ./install.sh YOUR_API_KEY"
  echo ""
  echo "Generate a key with: openssl rand -hex 32"
  exit 1
fi

API_KEY=$1
# Auto-detect user (whoever ran sudo)
RUN_USER=${SUDO_USER:-$(whoami)}
INSTALL_DIR="/home/$RUN_USER/rpi-proxy"
SERVICE_FILE="/etc/systemd/system/rpi-proxy.service"

echo "Installing RPI Proxy for user: $RUN_USER"

# Create service file with the API key
cat > $SERVICE_FILE << EOF
[Unit]
Description=RPI CORS Proxy
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$INSTALL_DIR
Environment=API_KEY=$API_KEY
Environment=PORT=3001
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable rpi-proxy
systemctl start rpi-proxy

echo ""
echo "✓ RPI Proxy installed and running!"
echo ""
echo "Commands:"
echo "  sudo systemctl status rpi-proxy   - Check status"
echo "  sudo systemctl restart rpi-proxy  - Restart"
echo "  sudo systemctl stop rpi-proxy     - Stop"
echo "  sudo journalctl -u rpi-proxy -f   - View logs"
echo ""
echo "Your API key: $API_KEY"
