#!/bin/bash -e
# ── Raspberry Pi boot config optimizations ──

on_chroot << CHEOF
# GPU memory for WebKitGTK rendering
if [ -f /boot/firmware/config.txt ]; then
  CONFIG="/boot/firmware/config.txt"
elif [ -f /boot/config.txt ]; then
  CONFIG="/boot/config.txt"
else
  exit 0
fi

grep -q "gpu_mem=" "\$CONFIG" || echo "gpu_mem=128" >> "\$CONFIG"
grep -q "hdmi_force_hotplug" "\$CONFIG" || echo "hdmi_force_hotplug=1" >> "\$CONFIG"
grep -q "disable_overscan" "\$CONFIG" || echo "disable_overscan=1" >> "\$CONFIG"

# Faster boot: disable splash + quiet
grep -q "quiet" /boot/firmware/cmdline.txt 2>/dev/null && true || \
  sed -i 's/$/ quiet splash/' /boot/firmware/cmdline.txt 2>/dev/null || true
CHEOF
