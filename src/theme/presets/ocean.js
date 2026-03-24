/**
 * Ocean theme preset — cool blue-cyan tones.
 * Swaps accent and gradient colors while preserving functional colors
 * (priority, category, member) for consistency.
 */

// Inherit functional colors from default (don't change what has meaning)
import defaultPreset from "theme/presets/default";

export default function oceanPreset(mode) {
  const base = defaultPreset(mode);
  const dark = mode === "dark";
  const t = (darkVal, lightVal) => (dark ? darkVal : lightVal);

  return {
    ...base,

    // ── Ocean accent ──
    accent: {
      main: t("#0ea5e9", "#0284c7"),
      light: t("#38bdf8", "#38bdf8"),
      dark: t("#0369a1", "#075985"),
    },

    // ── Ocean gradients ──
    gradients: {
      ...base.gradients,
      primary: t(
        "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
        "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
      ),
      meals: t(
        "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
        "linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)"
      ),
    },

    // ── Ocean surfaces (subtle blue tint) ──
    glass: {
      ...base.glass,
      bg: t("rgba(14,165,233,0.04)", "#f0f9ff"),
      solidBg: t("#0f172a", "#f0f9ff"),
    },
    header: {
      bg: t("rgba(15,23,42,0.95)", "#f0f9ff"),
      border: t("rgba(56,189,248,0.08)", "rgba(3,105,161,0.08)"),
    },
    nav: {
      bg: t("#0f172a", "#f0f9ff"),
      border: t("rgba(56,189,248,0.1)", "rgba(3,105,161,0.06)"),
    },
    panel: {
      bg: t("rgba(15,23,42,0.98)", "#f8fafc"),
      border: t("rgba(56,189,248,0.08)", "rgba(3,105,161,0.06)"),
    },
  };
}
