#!/usr/bin/env bash
# Bootstrap a fresh Ubuntu VPS for KitsunePaint + KitsunePrints hosting.
# Run as root (or with sudo) on a clean box. Idempotent — safe to re-run.
#
# Usage:  curl -fsSL <url-to-this-script> | sudo bash
#   or:   scp this file up, then: sudo bash bootstrap-vps.sh

set -euo pipefail

echo "=== KitsuneDen VPS bootstrap ==="

# --- Apt deps ---------------------------------------------------------------
echo "[1/8] apt update + base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg python3-pip rsync ufw

# --- Node.js 22 -------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "[2/8] installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesetup.sh
  bash /tmp/nodesetup.sh > /dev/null 2>&1
  apt-get install -y -qq nodejs
else
  echo "[2/8] node already installed: $(node --version)"
fi

# --- Caddy ------------------------------------------------------------------
if ! command -v caddy >/dev/null 2>&1; then
  echo "[3/8] installing Caddy"
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq caddy
else
  echo "[3/8] caddy already installed"
fi

# --- Python deps for KitsunePaint bundle builder ---------------------------
echo "[4/8] python deps (UnityPy, Pillow)"
pip3 install --break-system-packages --quiet UnityPy Pillow

# --- deploy user ------------------------------------------------------------
if ! id deploy >/dev/null 2>&1; then
  echo "[5/8] creating deploy user"
  useradd -m -s /bin/bash deploy
else
  echo "[5/8] deploy user exists"
fi

# Set up SSH directory for deploy (you'll add the GH Actions pubkey separately)
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# --- App + web dirs ---------------------------------------------------------
echo "[6/8] creating app directories"
install -d -o deploy -g deploy /srv/kitsunepaint /srv/kitsuneprints
install -d -o deploy -g deploy /var/www/paint.kitsuneden.net /var/www/prints.kitsuneden.net

# --- Sudoers: deploy can restart its services ------------------------------
echo "[7/8] sudoers entry for deploy"
cat > /etc/sudoers.d/deploy-services <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart kitsunepaint, /usr/bin/systemctl restart kitsuneprints, /usr/bin/systemctl status kitsunepaint, /usr/bin/systemctl status kitsuneprints
EOF
chmod 440 /etc/sudoers.d/deploy-services
visudo -c -f /etc/sudoers.d/deploy-services > /dev/null

# --- systemd units ----------------------------------------------------------
echo "[8/8] systemd units + Caddyfile"

# Generate a one-time API key salt if not already present. This salt is
# used to hash all API keys; rotating it would invalidate every existing
# customer key, so we store it permanently in /etc/default/kitsunepaint.
SALT_FILE=/etc/default/kitsunepaint
if [ ! -f "$SALT_FILE" ] || ! grep -q '^API_KEY_SALT=' "$SALT_FILE"; then
  GENERATED_SALT=$(openssl rand -hex 32)
  echo "API_KEY_SALT=$GENERATED_SALT" >> "$SALT_FILE"
  chmod 640 "$SALT_FILE"
  chown root:deploy "$SALT_FILE"
  echo "  generated API_KEY_SALT (stored in $SALT_FILE)"
fi

cat > /etc/systemd/system/kitsunepaint.service <<'EOF'
[Unit]
Description=KitsunePaint Express API
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/srv/kitsunepaint
EnvironmentFile=/etc/default/kitsunepaint
Environment=NODE_ENV=production
Environment=PORT=3002
ExecStart=/usr/bin/node server.cjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/kitsuneprints.service <<'EOF'
[Unit]
Description=KitsunePrints Express API
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/srv/kitsuneprints
Environment=NODE_ENV=production
Environment=PORT=9003
ExecStart=/usr/bin/node server.cjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kitsunepaint.service kitsuneprints.service > /dev/null 2>&1

# --- Caddyfile --------------------------------------------------------------
cat > /etc/caddy/Caddyfile <<'EOF'
# Default catch-all for direct IP / unmatched hosts → KitsunePaint static
:80 {
    root * /var/www/paint.kitsuneden.net
    file_server
    encode gzip
}

paint.kitsuneden.net {
    encode gzip

    handle /api/* {
        reverse_proxy localhost:3002
    }

    handle {
        root * /var/www/paint.kitsuneden.net
        file_server
        try_files {path} /index.html
    }
}

prints.kitsuneden.net {
    encode gzip

    handle /api/* {
        reverse_proxy localhost:9003
    }

    handle {
        root * /var/www/prints.kitsuneden.net
        file_server
        try_files {path} /index.html
    }
}
EOF

caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null 2>&1
systemctl reload caddy

echo ""
echo "=== ✓ Bootstrap complete ==="
echo ""
echo "Next steps:"
echo "  1. Add GH Actions deploy SSH pubkey to /home/deploy/.ssh/authorized_keys"
echo "  2. Update GH secrets: VPS_HOST = <new public IP or hostname>"
echo "  3. Point DNS for paint.kitsuneden.net + prints.kitsuneden.net at this box"
echo "  4. Trigger the deploy workflow on each repo (or push to main)"
echo "  5. Caddy will auto-fetch Let's Encrypt certs once DNS resolves here"
