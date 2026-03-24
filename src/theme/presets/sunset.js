/**
 * Sunset theme preset — warm coral and amber tones.
 * Swaps accent and gradient colors while preserving functional colors.
 */

import defaultPreset from "theme/presets/default";

export default function sunsetPreset(mode) {
  const base = defaultPreset(mode);
  const dark = mode === "dark";
  const t = (darkVal, lightVal) => (dark ? darkVal : lightVal);

  return {
    ...base,

    // ── Sunset accent ──
    accent: {
      main: t("#f97316", "#ea580c"),
      light: t("#fb923c", "#fb923c"),
      dark: t("#c2410c", "#9a3412"),
    },

    // ── Sunset gradients ──
    gradients: {
      ...base.gradients,
      primary: t(
        "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
        "linear-gradient(135deg, #ea580c 0%, #fb923c 100%)"
      ),
      meals: t(
        "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
        "linear-gradient(135deg, #ea580c 0%, #fbbf24 100%)"
      ),
    },

    // ── Sunset surfaces (warm tint) ──
    glass: {
      ...base.glass,
      bg: t("rgba(249,115,22,0.04)", "#fffbeb"),
      solidBg: t("#1a1409", "#fffbeb"),
    },
    header: {
      bg: t("rgba(26,20,9,0.95)", "#fffbeb"),
      border: t("rgba(251,146,60,0.08)", "rgba(234,88,12,0.08)"),
    },
    nav: {
      bg: t("#1a1409", "#fffbeb"),
      border: t("rgba(251,146,60,0.1)", "rgba(234,88,12,0.06)"),
    },
    panel: {
      bg: t("rgba(26,20,9,0.98)", "#fffdf7"),
      border: t("rgba(251,146,60,0.08)", "rgba(234,88,12,0.06)"),
    },
  };
}
