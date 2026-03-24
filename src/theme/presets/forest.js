/**
 * Forest theme preset — natural green and earth tones.
 * Swaps accent and gradient colors while preserving functional colors.
 */

import defaultPreset from "theme/presets/default";

export default function forestPreset(mode) {
  const base = defaultPreset(mode);
  const dark = mode === "dark";
  const t = (darkVal, lightVal) => (dark ? darkVal : lightVal);

  return {
    ...base,

    // ── Forest accent ──
    accent: {
      main: t("#10b981", "#059669"),
      light: t("#34d399", "#34d399"),
      dark: t("#047857", "#065f46"),
    },

    // ── Forest gradients ──
    gradients: {
      ...base.gradients,
      primary: t(
        "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
        "linear-gradient(135deg, #059669 0%, #34d399 100%)"
      ),
      meals: t(
        "linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)",
        "linear-gradient(135deg, #059669 0%, #6ee7b7 100%)"
      ),
    },

    // ── Forest surfaces (green tint) ──
    glass: {
      ...base.glass,
      bg: t("rgba(16,185,129,0.04)", "#f0fdf4"),
      solidBg: t("#0f1a14", "#f0fdf4"),
    },
    header: {
      bg: t("rgba(15,26,20,0.95)", "#f0fdf4"),
      border: t("rgba(52,211,153,0.08)", "rgba(5,150,105,0.08)"),
    },
    nav: {
      bg: t("#0f1a14", "#f0fdf4"),
      border: t("rgba(52,211,153,0.1)", "rgba(5,150,105,0.06)"),
    },
    panel: {
      bg: t("rgba(15,26,20,0.98)", "#f7fdf9"),
      border: t("rgba(52,211,153,0.08)", "rgba(5,150,105,0.06)"),
    },
  };
}
