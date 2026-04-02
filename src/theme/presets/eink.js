/**
 * E-ink theme preset — optimized for e-ink/e-paper displays.
 *
 * Design principles:
 * - Pure black (#000) on white (#fff) — no grays except for disabled states
 * - No gradients, no transparency, no blur, no shadows
 * - Bold fonts (600+) for crisp rendering on low-DPI e-ink
 * - High-contrast borders instead of color fills
 * - Minimal repaints (no hover effects, no animations)
 *
 * Target: Radxa Zero 3W + e-ink display via Tauri kiosk
 */

import defaultPreset from "theme/presets/default";

// E-ink member "colors" — use distinct border patterns instead of fills
// On B/W displays, members are distinguished by bold initials + thick borders
const EINK_MEMBERS = [
  { name: "Member 1", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 2", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 3", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 4", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 5", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 6", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 7", value: "#000000", gradient: "primary", contrastText: "#fff" },
  { name: "Member 8", value: "#000000", gradient: "primary", contrastText: "#fff" },
];

export default function einkPreset(/* mode — always light for e-ink */) {
  const base = defaultPreset("light"); // Always light mode for e-ink

  return {
    ...base,

    // Force light mode member colors to pure black
    member: EINK_MEMBERS,

    // All categories → black (distinguished by icon/label, not color)
    category: {
      chores: "#000000",
      homework: "#000000",
      errands: "#000000",
      health: "#000000",
      cooking: "#000000",
      pets: "#000000",
      other: "#000000",
    },

    // Priority → black with different border widths (handled in components)
    priority: {
      high: "#000000",
      medium: "#555555",
      low: "#999999",
    },

    // Countdown → all black
    countdown: ["#000", "#000", "#000", "#000", "#000", "#000", "#000", "#000"],

    // Level → black (no gold/silver distinction on e-ink)
    level: { gold: "#000000", silver: "#555555", bronze: "#000000" },

    // Meals → black
    meals: { main: "#000000", light: "#555555", dark: "#000000" },

    // Accent — pure black
    accent: {
      main: "#000000",
      light: "#333333",
      dark: "#000000",
    },

    // Glass → solid surfaces, no transparency, no blur
    glass: {
      bg: "#ffffff",
      solidBg: "#ffffff",
      border: "none",
      borderHover: "none",
      shadow: "none",
      hoverShadow: "none",
      overlay: "transparent",
      overlayHover: "rgba(0,0,0,0.05)",
      divider: "#000000",
    },

    // Panel / header — solid white with black borders
    panel: {
      bg: "#ffffff",
      border: "#000000",
    },
    header: {
      bg: "#ffffff",
      border: "#000000",
    },
    nav: {
      bg: "#ffffff",
      border: "#000000",
    },

    // No gradients — solid black everywhere
    gradients: {
      primary: "#000000",
      success: "#000000",
      error: "#000000",
      warning: "#000000",
      info: "#000000",
      secondary: "#000000",
      meals: "#000000",
    },

    // Input — clear black borders, white bg
    input: {
      bg: "#ffffff",
      border: "#000000",
      borderHover: "#000000",
      focusBorder: "#000000",
    },
  };
}
