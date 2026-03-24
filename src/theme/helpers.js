/**
 * Theme helper utilities.
 * alpha() produces hex+suffix strings matching the existing codebase pattern.
 */

/**
 * Convert a hex color + opacity to hex+suffix format.
 * Example: alpha("#6C5CE7", 0.1) → "#6C5CE71A"
 * This matches the existing codebase pattern: `${color}18`
 *
 * @param {string} hex — hex color (3, 4, 6, or 8 chars, with or without #)
 * @param {number} opacity — 0 to 1
 * @returns {string} hex color with alpha suffix
 */
export function alpha(hex, opacity) {
  const clean = hex.replace("#", "");
  // Expand shorthand (#abc → aabbcc)
  const full =
    clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean.length === 4
        ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3]
        : clean.slice(0, 6); // strip existing alpha if 8-char
  const alphaByte = Math.round(Math.min(1, Math.max(0, opacity)) * 255);
  return `#${full}${alphaByte.toString(16).padStart(2, "0")}`;
}

/**
 * Look up a named gradient from tokens.
 * Usage: gradient(tokens, "primary") → "linear-gradient(135deg, ...)"
 *
 * @param {object} tokens — resolved token object from getTokens()
 * @param {string} name — gradient name (e.g. "primary", "success")
 * @returns {string} CSS gradient string, or empty string if not found
 */
export function gradient(tokens, name) {
  return (tokens.gradients && tokens.gradients[name]) || "";
}
