#!/usr/bin/env bash
# =============================================================================
# SteamPulse — Server Management Commands Reference
# Run these on the server via SSH: ssh root@<your-server-ip>
# =============================================================================

# --- Application Control ---
systemctl start steampulse          # Start the app
systemctl stop steampulse           # Stop the app
systemctl restart steampulse        # Restart the app
systemctl status steampulse         # Check if running

# --- View Live Logs ---
journalctl -u steampulse -f                    # Follow live logs
journalctl -u steampulse --since "1 hour ago" # Last hour of logs
journalctl -u steampulse -n 100               # Last 100 lines

# --- Nginx ---
nginx -t                            # Test nginx config
systemctl reload nginx              # Reload nginx (no downtime)
systemctl restart nginx             # Full restart nginx

# --- SSL Certificate ---
certbot renew                       # Manually renew SSL cert
certbot certificates                # List all certificates

# --- Check what's using port 3000 ---
lsof -i :3000

# --- Check server resources ---
htop                                # Interactive process viewer (install: apt install htop)
df -h                               # Disk usage
free -h                             # Memory usage

# --- Database connection test ---
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config({path:'/opt/steampulse/.env'});
mysql.createConnection(process.env.DATABASE_URL)
  .then(c => { console.log('✅ DB connected'); c.end(); })
  .catch(e => console.error('❌ DB error:', e.message));
"

# --- Crawler status (check via app logs) ---
journalctl -u steampulse -n 50 | grep -i "crawler\|crawl"
