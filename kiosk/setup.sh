#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# FamCal Kiosk Setup — One-shot script to turn a fresh
# Raspberry Pi OS Lite 64-bit (or Armbian Bookworm) into a
# dedicated FamCal kiosk that boots directly into the app.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/asik-mydeen/famcal/main/kiosk/setup.sh | sudo bash
#
# Or manually:
#   sudo bash kiosk/setup.sh
#
# Supports: Raspberry Pi 4 | Radxa Zero 3W | Any ARM64 Debian Bookworm
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ──
KIOSK_USER="kiosk"
KIOSK_HOME="/home/${KIOSK_USER}"
APP_DIR="${KIOSK_HOME}/famcal"
GITHUB_REPO="asik-mydeen/famcal"
GITHUB_API="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Root check ──
[[ $EUID -eq 0 ]] || error "Run as root: sudo bash setup.sh"

info "FamCal Kiosk Setup — starting"
info "Detected: $(uname -m) | $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"

# ── Step 1: Create kiosk user ──
if ! id -u "${KIOSK_USER}" &>/dev/null; then
  info "Creating kiosk user..."
  useradd -m -s /bin/bash -G video,input,render,audio "${KIOSK_USER}"
else
  info "Kiosk user already exists"
fi

# ── Step 2: System update + install dependencies ──
info "Installing dependencies (cage, webkit2gtk, fonts)..."
apt-get update -qq
apt-get install -y --no-install-recommends \
  cage \
  libwebkit2gtk-4.1-0 \
  libgtk-3-0 \
  libappindicator3-1 \
  fonts-inter \
  fonts-noto \
  curl \
  jq \
  unzip \
  xdg-utils \
  dbus-x11 \
  glib-networking \
  libglib2.0-0 \
  ca-certificates

# ── Step 3: Disable unnecessary services ──
info "Disabling unnecessary services..."
for svc in bluetooth avahi-daemon cups cups-browsed ModemManager; do
  systemctl disable "$svc" 2>/dev/null || true
  systemctl stop "$svc" 2>/dev/null || true
done

# Reduce logging to save SD card writes
if [ -f /etc/systemd/journald.conf ]; then
  sed -i 's/#Storage=auto/Storage=volatile/' /etc/systemd/journald.conf
  sed -i 's/#RuntimeMaxUse=/RuntimeMaxUse=32M/' /etc/systemd/journald.conf
fi

# ── Step 4: Download latest FamCal Tauri app ──
info "Downloading latest FamCal release..."
mkdir -p "${APP_DIR}"

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" ]]; then
  DEB_PATTERN="aarch64.deb"
elif [[ "$ARCH" == "x86_64" ]]; then
  DEB_PATTERN="amd64.deb"
else
  error "Unsupported architecture: ${ARCH}"
fi

# Fetch latest release
RELEASE_JSON=$(curl -sf "${GITHUB_API}" 2>/dev/null || echo '{}')
DEB_URL=$(echo "$RELEASE_JSON" | jq -r ".assets[] | select(.name | contains(\"${DEB_PATTERN}\")) | .browser_download_url" 2>/dev/null | head -1)

if [[ -n "$DEB_URL" && "$DEB_URL" != "null" ]]; then
  info "Found release: ${DEB_URL}"
  TEMP_DEB="/tmp/famcal-kiosk.deb"
  curl -sL -o "${TEMP_DEB}" "${DEB_URL}"
  dpkg -i "${TEMP_DEB}" || apt-get install -f -y
  rm -f "${TEMP_DEB}"
  # Find installed binary
  APP_BIN=$(which famcal-kiosk 2>/dev/null || find /usr -name "famcal-kiosk" -type f 2>/dev/null | head -1)
  if [[ -z "$APP_BIN" ]]; then
    APP_BIN="/usr/bin/famcal-kiosk"
  fi
else
  warn "No release found. You can install manually later:"
  warn "  sudo dpkg -i famcal-kiosk_*_arm64.deb"
  APP_BIN="/usr/bin/famcal-kiosk"
fi

# Save installed version
echo "$RELEASE_JSON" | jq -r '.tag_name // "unknown"' > "${APP_DIR}/version.txt"

# ── Step 5: Configure Cage kiosk service ──
info "Setting up kiosk auto-start service..."

cat > /etc/systemd/system/famcal-kiosk.service << UNIT
[Unit]
Description=FamCal Kiosk (Cage + Tauri)
After=systemd-user-sessions.service dbus.service
Wants=network-online.target
ConditionPathExists=/dev/tty1

[Service]
Type=simple
User=${KIOSK_USER}
PAMName=login
TTYPath=/dev/tty1
StandardInput=tty
StandardOutput=journal
StandardError=journal

# Environment for Wayland + WebKitGTK
Environment=XDG_RUNTIME_DIR=/run/user/1001
Environment=WLR_LIBINPUT_NO_DEVICES=1
Environment=WLR_RENDERER=pixman
Environment=GDK_BACKEND=wayland
Environment=MOZ_ENABLE_WAYLAND=1
Environment=WEBKIT_DISABLE_COMPOSITING_MODE=1

# Cage launches the app fullscreen, no window decorations
ExecStartPre=/bin/mkdir -p /run/user/1001
ExecStartPre=/bin/chown ${KIOSK_USER}:${KIOSK_USER} /run/user/1001
ExecStart=/usr/bin/cage -s -- ${APP_BIN}

# Auto-restart on crash
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
UNIT

# ── Step 6: PAM config for cage ──
cat > /etc/pam.d/cage << PAM
auth       sufficient pam_permit.so
account    required   pam_unix.so
session    required   pam_systemd.so
session    required   pam_unix.so
PAM

# ── Step 7: Enable kiosk on boot ──
systemctl daemon-reload
systemctl enable famcal-kiosk.service
systemctl set-default graphical.target

# Disable default getty on tty1 (kiosk takes over)
systemctl disable getty@tty1.service 2>/dev/null || true

# ── Step 8: OTA updater ──
info "Setting up OTA auto-updater..."

cat > "${APP_DIR}/ota-update.sh" << 'OTA'
#!/usr/bin/env bash
# FamCal OTA Updater — checks GitHub Releases for newer version
set -euo pipefail

REPO="asik-mydeen/famcal"
VERSION_FILE="/home/kiosk/famcal/version.txt"
CURRENT=$(cat "$VERSION_FILE" 2>/dev/null || echo "v0.0.0")
ARCH=$(uname -m)

if [[ "$ARCH" == "aarch64" ]]; then
  DEB_PATTERN="aarch64.deb"
elif [[ "$ARCH" == "x86_64" ]]; then
  DEB_PATTERN="amd64.deb"
else
  exit 0
fi

# Check latest release
RELEASE=$(curl -sf "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null || exit 0)
LATEST=$(echo "$RELEASE" | jq -r '.tag_name // ""')

if [[ -z "$LATEST" || "$LATEST" == "$CURRENT" ]]; then
  exit 0
fi

echo "[OTA] New version available: ${CURRENT} → ${LATEST}"

# Download .deb
DEB_URL=$(echo "$RELEASE" | jq -r ".assets[] | select(.name | contains(\"${DEB_PATTERN}\")) | .browser_download_url" | head -1)
if [[ -z "$DEB_URL" || "$DEB_URL" == "null" ]]; then
  echo "[OTA] No .deb found for ${DEB_PATTERN}"
  exit 0
fi

TEMP="/tmp/famcal-update.deb"
curl -sL -o "$TEMP" "$DEB_URL"
dpkg -i "$TEMP" || apt-get install -f -y
rm -f "$TEMP"

# Update version marker
echo "$LATEST" > "$VERSION_FILE"
echo "[OTA] Updated to ${LATEST}, restarting kiosk..."

# Restart the kiosk service
systemctl restart famcal-kiosk.service
OTA
chmod +x "${APP_DIR}/ota-update.sh"

# Systemd timer for OTA (every 6 hours)
cat > /etc/systemd/system/famcal-ota.service << OTASVC
[Unit]
Description=FamCal OTA Update Check

[Service]
Type=oneshot
ExecStart=${APP_DIR}/ota-update.sh
OTASVC

cat > /etc/systemd/system/famcal-ota.timer << OTATIMER
[Unit]
Description=FamCal OTA check every 6 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=6h
RandomizedDelaySec=30min

[Install]
WantedBy=timers.target
OTATIMER

systemctl daemon-reload
systemctl enable famcal-ota.timer

# ── Step 9: Display configuration ──
info "Configuring display..."

# Raspberry Pi: set GPU memory + HDMI config
if [[ -f /boot/config.txt ]]; then
  # Increase GPU memory for WebKitGTK rendering
  grep -q "gpu_mem=" /boot/config.txt || echo "gpu_mem=128" >> /boot/config.txt
  # Force HDMI output (even if no display detected at boot)
  grep -q "hdmi_force_hotplug" /boot/config.txt || echo "hdmi_force_hotplug=1" >> /boot/config.txt
  # Disable overscan
  grep -q "disable_overscan" /boot/config.txt || echo "disable_overscan=1" >> /boot/config.txt
fi

# For Radxa: no special config needed (handled by device tree)

# ── Step 10: Network config helper ──
info "Creating WiFi setup helper..."

cat > "${KIOSK_HOME}/wifi-setup.sh" << 'WIFI'
#!/usr/bin/env bash
# Quick WiFi setup: sudo bash wifi-setup.sh "SSID" "password"
if [[ $# -lt 2 ]]; then
  echo "Usage: sudo bash wifi-setup.sh SSID PASSWORD"
  exit 1
fi
nmcli device wifi connect "$1" password "$2" || \
  wpa_passphrase "$1" "$2" >> /etc/wpa_supplicant/wpa_supplicant.conf
echo "WiFi configured for: $1"
WIFI
chmod +x "${KIOSK_HOME}/wifi-setup.sh"

# ── Done ──
info "────────────────────────────────────────"
info "FamCal Kiosk setup complete!"
info ""
info "  App binary:   ${APP_BIN}"
info "  Kiosk user:   ${KIOSK_USER}"
info "  Auto-start:   famcal-kiosk.service"
info "  OTA updates:  every 6 hours (famcal-ota.timer)"
info "  Version:      $(cat ${APP_DIR}/version.txt 2>/dev/null || echo 'not installed')"
info ""
info "Next steps:"
info "  1. Connect WiFi: sudo bash ${KIOSK_HOME}/wifi-setup.sh 'SSID' 'password'"
info "  2. Reboot: sudo reboot"
info "  3. The kiosk will boot directly into FamCal"
info ""
info "To exit kiosk (SSH in): sudo systemctl stop famcal-kiosk"
info "To update manually:     sudo bash ${APP_DIR}/ota-update.sh"
info "────────────────────────────────────────"
