/**
 * Warm theme preset — orange and amber tones.
 * Swaps accent and gradient colors while preserving functional colors.
 */

import defaultPreset from "theme/presets/default";

export default function warmPreset(mode) {
  const base = defaultPreset(mode);
  const dark = mode === "dark";
  const t = (darkVal, lightVal) => (dark ? darkVal : lightVal);

  return {
    ...base,

    // ── Warm accent ──
    accent: {
      main: t("#E07B39", "#E07B39"),
      light: t("#F4A261", "#F4A261"),
      dark: t("#C45C2A", "#C45C2A"),
    },

    // ── Warm gradients ──
    gradients: {
      ...base.gradients,
      primary: t(
        "linear-gradient(135deg, #E07B39 0%, #F4A261 100%)",
        "linear-gradient(135deg, #C45C2A 0%, #E07B39 100%)"
      ),
      meals: t(
        "linear-gradient(135deg, #E07B39 0%, #FDDCB5 100%)",
        "linear-gradient(135deg, #C45C2A 0%, #F4A261 100%)"
      ),
    },

    // ── Warm surfaces (peach tint) ──
    glass: {
      ...base.glass,
      bg: t("rgba(224,123,57,0.04)", "#fff8f2"),
      solidBg: t("#1a1108", "#fff8f2"),
    },
    header: {
      bg: t("rgba(26,17,8,0.95)", "#fff8f2"),
      border: t("rgba(244,162,97,0.08)", "rgba(196,92,42,0.08)"),
    },
    nav: {
      bg: t("#1a1108", "#fff8f2"),
      border: t("rgba(244,162,97,0.1)", "rgba(196,92,42,0.06)"),
    },
    panel: {
      bg: t("rgba(26,17,8,0.98)", "#fffaf5"),
      border: t("rgba(244,162,97,0.08)", "rgba(196,92,42,0.06)"),
    },
  };
}
