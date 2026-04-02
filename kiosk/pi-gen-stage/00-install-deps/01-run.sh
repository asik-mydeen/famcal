#!/bin/bash -e
# ── Disable unnecessary services ──
on_chroot << CHEOF
systemctl disable bluetooth 2>/dev/null || true
systemctl disable avahi-daemon 2>/dev/null || true
systemctl disable cups 2>/dev/null || true
systemctl disable ModemManager 2>/dev/null || true
systemctl disable triggerhappy 2>/dev/null || true
CHEOF
