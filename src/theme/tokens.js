/**
 * Theme token resolver.
 * Returns a mode-resolved token object from the active preset.
 *
 * Usage in React components:  useAppTheme() → { tokens, alpha, gradient, ... }
 * Usage outside React:        import { getTokens } from "theme/tokens";
 */

import defaultPreset from "theme/presets/default";
import oceanPreset from "theme/presets/ocean";
import sunsetPreset from "theme/presets/sunset";
import forestPreset from "theme/presets/forest";
import warmPreset from "theme/presets/warm";
import einkPreset from "theme/presets/eink";

// Registry of available presets
const PRESETS = {
  default: defaultPreset,
  ocean: oceanPreset,
  sunset: sunsetPreset,
  forest: forestPreset,
  warm: warmPreset,
  eink: einkPreset,
};

// Display metadata for the Settings UI
export const PRESET_META = {
  default: { label: "Amethyst", icon: "diamond", colors: ["#6C5CE7", "#A29BFE"] },
  ocean: { label: "Ocean", icon: "waves", colors: ["#0284c7", "#38bdf8"] },
  sunset: { label: "Sunset", icon: "wb_twilight", colors: ["#ea580c", "#fb923c"] },
  forest: { label: "Forest", icon: "park", colors: ["#059669", "#34d399"] },
  warm: { label: "Warm", icon: "local_fire_department", colors: ["#E07B39", "#F4A261"] },
  eink: { label: "E-Ink", icon: "contrast", colors: ["#000000", "#ffffff"] },
};

/**
 * Get resolved tokens for a given mode and preset.
 *
 * @param {"light"|"dark"} mode
 * @param {string} [presetName="default"]
 * @returns {object} resolved token object
 */
export function getTokens(mode = "light", presetName = "default") {
  const presetFn = PRESETS[presetName] || PRESETS.default;
  return presetFn(mode);
}

/**
 * Get the list of available preset names.
 * @returns {string[]}
 */
export function getPresetNames() {
  return Object.keys(PRESETS);
}

/**
 * Register a new preset at runtime (for future dynamic preset loading).
 * @param {string} name
 * @param {function} presetFn — (mode) => tokenObject
 */
export function registerPreset(name, presetFn) {
  PRESETS[name] = presetFn;
}
