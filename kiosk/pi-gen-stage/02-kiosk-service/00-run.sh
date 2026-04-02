#!/bin/bash -e
# ── Install systemd kiosk service + OTA updater ──

# Kiosk service (Cage + Tauri app)
install -m 644 files/famcal-kiosk.service "${ROOTFS_DIR}/etc/systemd/system/"
install -m 644 files/cage-pam              "${ROOTFS_DIR}/etc/pam.d/cage"

# OTA updater
install -m 755 files/ota-update.sh         "${ROOTFS_DIR}/home/kiosk/famcal/"
install -m 644 files/famcal-ota.service    "${ROOTFS_DIR}/etc/systemd/system/"
install -m 644 files/famcal-ota.timer      "${ROOTFS_DIR}/etc/systemd/system/"

# First-boot helper
install -m 755 files/first-boot.sh         "${ROOTFS_DIR}/home/kiosk/"
install -m 755 files/wifi-setup.sh         "${ROOTFS_DIR}/home/kiosk/"

# Version file (placeholder — OTA will update this)
echo "not-installed" > "${ROOTFS_DIR}/home/kiosk/famcal/version.txt"

on_chroot << CHEOF
# Enable kiosk + OTA
systemctl enable famcal-kiosk.service
systemctl enable famcal-ota.timer
systemctl set-default graphical.target

# Disable getty on tty1 (kiosk takes over)
systemctl disable getty@tty1.service 2>/dev/null || true

# Fix ownership
chown -R kiosk:kiosk /home/kiosk
CHEOF
