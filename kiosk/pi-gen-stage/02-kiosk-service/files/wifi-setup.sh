#!/usr/bin/env bash
# Quick WiFi setup: sudo bash wifi-setup.sh "SSID" "password"
if [[ $# -lt 2 ]]; then
  echo "Usage: sudo bash wifi-setup.sh SSID PASSWORD"
  exit 1
fi
nmcli device wifi connect "$1" password "$2" || \
  wpa_passphrase "$1" "$2" >> /etc/wpa_supplicant/wpa_supplicant.conf
echo "WiFi configured for: $1"
