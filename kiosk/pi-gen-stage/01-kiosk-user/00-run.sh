#!/bin/bash -e
# ── Create kiosk user + configure auto-login ──
on_chroot << CHEOF
# Create kiosk user (if not exists)
if ! id -u kiosk &>/dev/null; then
  useradd -m -s /bin/bash -G video,input,render,audio kiosk
fi

# Create app directory
mkdir -p /home/kiosk/famcal
chown -R kiosk:kiosk /home/kiosk

# Reduce journal writes (save SD card)
sed -i 's/#Storage=auto/Storage=volatile/' /etc/systemd/journald.conf
sed -i 's/#RuntimeMaxUse=/RuntimeMaxUse=32M/' /etc/systemd/journald.conf
CHEOF
