#!/usr/bin/env bash
# FamCal OTA Updater — checks GitHub Releases for newer .deb
set -euo pipefail

REPO="asik-mydeen/famcal"
VERSION_FILE="/home/kiosk/famcal/version.txt"
LOG_TAG="famcal-ota"
CURRENT=$(cat "$VERSION_FILE" 2>/dev/null || echo "v0.0.0")
ARCH=$(uname -m)

[[ "$ARCH" == "aarch64" ]] && DEB_PATTERN="aarch64.deb" || DEB_PATTERN="amd64.deb"

# Check latest release
RELEASE=$(curl -sf "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null || exit 0)
LATEST=$(echo "$RELEASE" | jq -r '.tag_name // ""')

if [[ -z "$LATEST" || "$LATEST" == "$CURRENT" ]]; then
  logger -t "$LOG_TAG" "Up to date: ${CURRENT}"
  exit 0
fi

logger -t "$LOG_TAG" "New version: ${CURRENT} -> ${LATEST}"

# Find .deb asset
DEB_URL=$(echo "$RELEASE" | jq -r ".assets[] | select(.name | contains(\"${DEB_PATTERN}\")) | .browser_download_url" | head -1)
if [[ -z "$DEB_URL" || "$DEB_URL" == "null" ]]; then
  logger -t "$LOG_TAG" "No .deb found for ${DEB_PATTERN}"
  exit 0
fi

# Download and install
TEMP="/tmp/famcal-update.deb"
curl -sL -o "$TEMP" "$DEB_URL"
dpkg -i "$TEMP" || apt-get install -f -y
rm -f "$TEMP"

# Update version marker
echo "$LATEST" > "$VERSION_FILE"
logger -t "$LOG_TAG" "Updated to ${LATEST}, restarting kiosk"

# Restart kiosk
systemctl restart famcal-kiosk.service
