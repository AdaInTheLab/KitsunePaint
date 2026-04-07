#!/bin/bash
# KitsunePaint Deploy Script
# Run this on the DreamHost VPS after uploading the project files.
#
# Usage:
#   1. Upload project to VPS (rsync, scp, git clone, etc.)
#   2. cd into the project directory
#   3. chmod +x deploy.sh && ./deploy.sh

set -e

echo "🦊 KitsunePaint Deploy"
echo "======================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install it first."
    exit 1
fi
echo "✓ Node.js $(node -v)"

# Check Python 3
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "❌ Python 3 not found. Install it first."
    exit 1
fi
echo "✓ Python $($PYTHON --version)"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
$PYTHON -m pip install --user UnityPy Pillow 2>&1 | tail -3

# Install Node dependencies
echo ""
echo "Installing Node dependencies..."
npm install --production 2>&1 | tail -3

# Build frontend
echo ""
echo "Building frontend..."
npm run build 2>&1 | tail -5

# Update build_bundle.py to use correct python path
echo ""
echo "Python path: $(which $PYTHON)"

# Check if PM2 is available for process management
if command -v pm2 &> /dev/null; then
    echo ""
    echo "Starting with PM2..."
    pm2 delete kitsunepaint 2>/dev/null || true
    pm2 start server.cjs --name kitsunepaint
    pm2 save
    echo "✓ Running as PM2 process 'kitsunepaint'"
    echo "  pm2 logs kitsunepaint  — view logs"
    echo "  pm2 restart kitsunepaint — restart"
else
    echo ""
    echo "PM2 not found. Install it for process management:"
    echo "  npm install -g pm2"
    echo "  pm2 start server.cjs --name kitsunepaint"
    echo "  pm2 save && pm2 startup"
    echo ""
    echo "Or run directly (will stop when you disconnect):"
    echo "  node server.cjs"
fi

echo ""
echo "✅ KitsunePaint deployed on port 3002"
echo ""
echo "If using Apache as a reverse proxy, add to your vhost:"
echo "  ProxyPass /api http://localhost:3002/api"
echo "  ProxyPassReverse /api http://localhost:3002/api"
echo ""
echo "Or serve everything through Node (port 3002)."
