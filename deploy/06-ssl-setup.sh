#!/usr/bin/env bash
# =============================================================================
# SteamPulse — Step 6: SSL Certificate Setup (Let's Encrypt via Certbot)
# Run this ON THE SERVER after your domain DNS is pointing to the server.
# Usage: bash 06-ssl-setup.sh yourdomain.com your@email.com
#
# IMPORTANT: If using Cloudflare proxy (orange cloud):
#   - Set Cloudflare SSL/TLS mode to "Full (strict)"
#   - This script still works — Certbot validates via HTTP challenge
# =============================================================================
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "❌ Usage: $0 <domain.com> <your@email.com>"
  echo "   Example: $0 steampulse.com admin@steampulse.com"
  exit 1
fi

echo "=============================================="
echo "  SteamPulse — SSL Setup for $DOMAIN"
echo "=============================================="

# Update nginx config with actual domain
echo "[1/3] Updating Nginx config with domain: $DOMAIN"
sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/steampulse
nginx -t && systemctl reload nginx

# Obtain certificate
echo "[2/3] Obtaining Let's Encrypt certificate..."
certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --redirect

# Auto-renewal (certbot installs a systemd timer automatically, but verify)
echo "[3/3] Verifying auto-renewal..."
systemctl status certbot.timer --no-pager || true
certbot renew --dry-run

echo ""
echo "✅ SSL setup complete!"
echo ""
echo "Your site is now live at: https://$DOMAIN"
echo ""
echo "Cloudflare settings reminder:"
echo "  SSL/TLS → Encryption mode: Full (strict)"
echo "  SSL/TLS → Edge Certificates → Always Use HTTPS: ON"
echo "  Caching → Configuration → Browser Cache TTL: Respect Existing Headers"
