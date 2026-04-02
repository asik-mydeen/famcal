/**
 * Color E-ink theme preset — optimized for color e-paper displays.
 *
 * Targets: Spectra 7-color, ACeP/Gallery 3, Kaleido 3
 *
 * Spectra 7-color palette (native pigment colors — zero dithering):
 *   Black:  #000000    White:  #FFFFFF
 *   Red:    #FF0000    Green:  #00FF00
 *   Blue:   #0000FF    Yellow: #FFFF00
 *   Orange: #FF8000
 *
 * Design principles:
 * - Use ONLY the 7 native pigment colors (no gradients, no alpha)
 * - High-contrast: always 4.5:1+ ratio (WCAG AA)
 * - Bold fonts (600+) — thin fonts disappear on e-ink
 * - No animations, no blur, no shadows (same as B/W e-ink)
 * - Yellow/Orange need dark (#000) text for contrast
 * - Colors carry semantic meaning (red=urgent, green=done, blue=accent)
 */

import defaultPreset from "theme/presets/default";

// 7-color e-ink palette constants
const BLACK   = "#000000";
const WHITE   = "#FFFFFF";
const RED     = "#FF0000";
const GREEN   = "#00FF00";
const BLUE    = "#0000FF";
const YELLOW  = "#FFFF00";
const ORANGE  = "#FF8000";

// Members get distinct e-ink colors — 6 usable colors (exclude white/background)
const COLOR_EINK_MEMBERS = [
  { name: "Blue",   value: BLUE,   gradient: "primary",   contrastText: WHITE },
  { name: "Red",    value: RED,    gradient: "error",     contrastText: WHITE },
  { name: "Green",  value: GREEN,  gradient: "success",   contrastText: BLACK },
  { name: "Orange", value: ORANGE, gradient: "warning",   contrastText: BLACK },
  { name: "Yellow", value: YELLOW, gradient: "warning",   contrastText: BLACK },
  { name: "Black",  value: BLACK,  gradient: "primary",   contrastText: WHITE },
  { name: "Blue 2", value: BLUE,   gradient: "info",      contrastText: WHITE },
  { name: "Red 2",  value: RED,    gradient: "error",     contrastText: WHITE },
];

export default function einkColorPreset(/* mode — always light for e-ink */) {
  const base = defaultPreset("light");

  return {
    ...base,

    member: COLOR_EINK_MEMBERS,

    // Categories → mapped to distinct e-ink colors
    category: {
      chores:   BLUE,
      homework: GREEN,
      errands:  ORANGE,
      health:   GREEN,
      cooking:  RED,
      pets:     ORANGE,
      other:    BLACK,
    },

    // Priority → traffic light (native e-ink colors)
    priority: {
      high:   RED,
      medium: ORANGE,
      low:    GREEN,
    },

    // Countdowns → cycle through available colors
    countdown: [BLUE, RED, GREEN, ORANGE, YELLOW, BLACK, BLUE, RED],

    // Level badges
    level: { gold: ORANGE, silver: BLUE, bronze: RED },

    // Meals
    meals: { main: GREEN, light: GREEN, dark: BLACK },

    // Accent — blue (high contrast on white, distinct from red/green semantic colors)
    accent: {
      main: BLUE,
      light: BLUE,
      dark: BLACK,
    },

    // Solid surfaces — no transparency, no blur
    glass: {
      bg: WHITE,
      solidBg: WHITE,
      border: "none",
      borderHover: "none",
      shadow: "none",
      hoverShadow: "none",
      overlay: "transparent",
      overlayHover: "transparent",
      divider: BLACK,
    },

    // Panels — white with black borders
    panel: { bg: WHITE, border: BLACK },
    header: { bg: WHITE, border: BLACK },
    nav: { bg: WHITE, border: BLACK },

    // No gradients — solid colors only
    gradients: {
      primary:   BLUE,
      success:   GREEN,
      error:     RED,
      warning:   ORANGE,
      info:      BLUE,
      secondary: GREEN,
      meals:     GREEN,
    },

    // Inputs — black borders, white bg
    input: {
      bg: WHITE,
      border: BLACK,
      borderHover: BLACK,
      focusBorder: BLUE,
    },
  };
}
