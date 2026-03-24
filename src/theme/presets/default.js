/**
 * Default theme preset — extracts EXACT current hardcoded values.
 * Switching to this preset produces pixel-identical output to the original codebase.
 *
 * Structure: (mode) => token object
 */

const d = (dark, light) => (m) => (m === "dark" ? dark : light);

// ── Member colors (from FamilyContext MEMBER_COLORS) ──
const MEMBERS = [
  { name: "Purple", value: "#6C5CE7", gradient: "primary", contrastText: "#fff" },
  { name: "Coral", value: "#E17055", gradient: "error", contrastText: "#fff" },
  { name: "Green", value: "#00B894", gradient: "success", contrastText: "#fff" },
  { name: "Gold", value: "#FDCB6E", gradient: "warning", contrastText: "#1a1a1a" },
  { name: "Blue", value: "#0984E3", gradient: "info", contrastText: "#fff" },
  { name: "Cyan", value: "#06b6d4", gradient: "secondary", contrastText: "#fff" },
  { name: "Pink", value: "#ec4899", gradient: "error", contrastText: "#fff" },
  { name: "Teal", value: "#14b8a6", gradient: "success", contrastText: "#fff" },
];

// ── Task categories (from FamilyContext TASK_CATEGORIES) ──
const CATEGORIES = {
  chores: "#7c3aed",
  homework: "#3b82f6",
  errands: "#f59e0b",
  health: "#22c55e",
  cooking: "#f59e0b",
  pets: "#f43f5e",
  other: "#64748b",
};

// ── Priority colors (unified — resolves tasks vs chores inconsistency) ──
const PRIORITY = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

// ── Countdown widget colors ──
const COUNTDOWN = [
  "#6C5CE7", "#FF6B6B", "#4ECDC4", "#FFD93D",
  "#95E1D3", "#FF9FF3", "#00B4D8", "#FB8500",
];

// ── Gamification level badge colors ──
const LEVEL = { gold: "#fbbf24", silver: "#94a3b8", bronze: "#d97706" };

// ── Meals page accent ──
const MEALS = { main: "#4ECDC4", light: "#95E1D3", dark: "#0f766e" };

/**
 * Get the full token set for a given mode.
 * @param {"light"|"dark"} mode
 * @returns {object} resolved tokens
 */
export default function defaultPreset(mode) {
  const dark = mode === "dark";
  const t = (darkVal, lightVal) => (dark ? darkVal : lightVal);

  return {
    // ── Domain tokens ──
    member: MEMBERS,
    category: CATEGORIES,
    priority: PRIORITY,
    countdown: COUNTDOWN,
    level: LEVEL,
    meals: MEALS,

    // ── Accent (matches MUI primary) ──
    accent: {
      main: t("#8b5cf6", "#6C5CE7"),
      light: t("#a855f7", "#A29BFE"),
      dark: t("#7c3aed", "#5A4BD1"),
    },

    // ── Glass / surface tokens ──
    glass: {
      bg: t("#1c1c2e", "#ffffff"),
      border: t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.04)"),
      borderHover: t("rgba(255,255,255,0.14)", "rgba(0,0,0,0.08)"),
      shadow: t("0 4px 20px rgba(0,0,0,0.4)", "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)"),
      hoverShadow: t("0 8px 32px rgba(0,0,0,0.5)", "0 4px 20px rgba(0,0,0,0.1)"),
      overlay: t("rgba(255,255,255,0.05)", "rgba(0,0,0,0.03)"),
      overlayHover: t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.06)"),
    },

    // ── Gradient tokens ──
    gradients: {
      primary: t(
        "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
        "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)"
      ),
      success: "linear-gradient(135deg, #22c55e 0%, #4ade80 100%)",
      error: "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)",
      warning: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
      info: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
      secondary: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
      meals: t(
        "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
        "linear-gradient(135deg, #4ECDC4 0%, #44a6a0 100%)"
      ),
    },

    // ── Input / form surface ──
    input: {
      bg: t("rgba(255,255,255,0.06)", "#f8f9fa"),
      border: t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.1)"),
      borderHover: t("rgba(255,255,255,0.25)", "rgba(0,0,0,0.2)"),
      focusBorder: "#8b5cf6",
    },
  };
}
