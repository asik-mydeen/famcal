/**
 * Theme token resolver.
 * Returns a mode-resolved token object from the active preset.
 *
 * Usage in React components:  useAppTheme() → { tokens, alpha, gradient, ... }
 * Usage outside React:        import { getTokens } from "theme/tokens";
 */

import defaultPreset from "theme/presets/default";

// Registry of available presets
const PRESETS = {
  default: defaultPreset,
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
