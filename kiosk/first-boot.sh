#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# FamCal Kiosk First Boot — Interactive initial configuration
# Run this ONCE after setup.sh to configure WiFi and dashboard.
#
# Usage: sudo bash first-boot.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[OK]${NC} $*"; }
ask()   { echo -en "${CYAN}[?]${NC} $*"; }

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FamCal Kiosk — First Boot Setup   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# ── WiFi ──
ask "Configure WiFi? (y/n): "
read -r WIFI_YN
if [[ "$WIFI_YN" == "y" || "$WIFI_YN" == "Y" ]]; then
  ask "WiFi SSID: "
  read -r WIFI_SSID
  ask "WiFi Password: "
  read -rs WIFI_PASS
  echo ""
  nmcli device wifi connect "$WIFI_SSID" password "$WIFI_PASS" 2>/dev/null && \
    info "WiFi connected to ${WIFI_SSID}" || \
    echo -e "${YELLOW}[WARN]${NC} WiFi connection failed. Configure manually with nmcli."
fi

# ── Dashboard slug ──
echo ""
ask "FamCal dashboard slug (e.g., 'home'): "
read -r SLUG
ask "FamCal dashboard token: "
read -r TOKEN

if [[ -n "$SLUG" && -n "$TOKEN" ]]; then
  # Create a local config file the Tauri app reads on startup
  KIOSK_CONFIG="/home/kiosk/famcal/kiosk-config.json"
  cat > "$KIOSK_CONFIG" << CFG
{
  "slug": "${SLUG}",
  "token": "${TOKEN}",
  "server": "https://calendar.asikmydeen.com",
  "theme": "eink-color",
  "autoUpdate": true
}
CFG
  chown kiosk:kiosk "$KIOSK_CONFIG"
  info "Dashboard config saved: ${KIOSK_CONFIG}"
fi

# ── Timezone ──
echo ""
ask "Set timezone? (e.g., America/New_York, Asia/Kolkata) [skip]: "
read -r TZ
if [[ -n "$TZ" ]]; then
  timedatectl set-timezone "$TZ" 2>/dev/null && info "Timezone set to ${TZ}" || \
    echo -e "${YELLOW}[WARN]${NC} Invalid timezone. Set manually: timedatectl set-timezone ZONE"
fi

# ── Hostname ──
echo ""
ask "Set hostname? (e.g., famcal-kitchen) [skip]: "
read -r HOSTNAME
if [[ -n "$HOSTNAME" ]]; then
  hostnamectl set-hostname "$HOSTNAME"
  info "Hostname set to ${HOSTNAME}"
fi

# ── SSH ──
echo ""
ask "Enable SSH for remote management? (y/n): "
read -r SSH_YN
if [[ "$SSH_YN" == "y" || "$SSH_YN" == "Y" ]]; then
  systemctl enable ssh
  systemctl start ssh
  IP=$(hostname -I | awk '{print $1}')
  info "SSH enabled. Connect with: ssh kiosk@${IP}"
fi

# ── Summary ──
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        First boot setup complete!     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
info "Dashboard: https://calendar.asikmydeen.com/d/${SLUG:-home}"
info "OTA updates: enabled (every 6 hours)"
info "Reboot to start kiosk: sudo reboot"
echo ""
