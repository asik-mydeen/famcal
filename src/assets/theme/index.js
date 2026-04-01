import { createTheme } from "@mui/material/styles";
import { getTokens } from "theme/tokens";

// ── Shared values ──

// Font-specific adjustments for decorative/thin fonts
// These fonts have limited weight ranges and thinner strokes,
// so we bump sizes and clamp weights for legibility.
const FONT_ADJUSTMENTS = {
  Sacramento: { sizeScale: 1.45, maxWeight: 400, lineHeightBoost: 0.15 },
  "Dancing Script": { sizeScale: 1.2, maxWeight: 700, lineHeightBoost: 0.1 },
  Caveat: { sizeScale: 1.25, maxWeight: 700, lineHeightBoost: 0.1 },
  Quicksand: { sizeScale: 1.05, maxWeight: 700, lineHeightBoost: 0 },
  "Playfair Display": { sizeScale: 1.0, maxWeight: 900, lineHeightBoost: 0.05 },
};

function getTypographyBase(fontFamily) {
  const ff = fontFamily || '"Inter", "Helvetica", "Arial", sans-serif';

  // Extract the primary font name from the CSS font-family string
  const primaryFont = ff.split(",")[0].replace(/['"]/g, "").trim();
  const adj = FONT_ADJUSTMENTS[primaryFont] || { sizeScale: 1, maxWeight: 900, lineHeightBoost: 0 };
  const s = adj.sizeScale;
  const w = (desired) => Math.min(desired, adj.maxWeight);
  const lh = adj.lineHeightBoost;

  return {
  fontFamily: ff,
  h1: { fontSize: `${2.5 * s}rem`, fontWeight: w(800), lineHeight: 1.2 + lh, letterSpacing: "-0.025em" },
  h2: { fontSize: `${2 * s}rem`, fontWeight: w(700), lineHeight: 1.25 + lh, letterSpacing: "-0.02em" },
  h3: { fontSize: `${1.75 * s}rem`, fontWeight: w(700), lineHeight: 1.3 + lh, letterSpacing: "-0.015em" },
  h4: { fontSize: `${1.5 * s}rem`, fontWeight: w(600), lineHeight: 1.35 + lh },
  h5: { fontSize: `${1.25 * s}rem`, fontWeight: w(600), lineHeight: 1.4 + lh },
  h6: { fontSize: `${1 * s}rem`, fontWeight: w(600), lineHeight: 1.5 + lh },
  body1: { fontSize: `${0.9375 * s}rem`, fontWeight: w(400), lineHeight: 1.6 + lh },
  body2: { fontSize: `${0.8125 * s}rem`, fontWeight: w(400), lineHeight: 1.6 + lh },
  button: { fontWeight: w(600), textTransform: "none", fontSize: `${0.875 * s}rem` },
  };
}

const sharedShape = { borderRadius: 16 };

// ── Mode-specific palettes ──

function getPalette(mode) {
  const dark = mode === "dark";
  return {
    mode,
    primary: dark
      ? { main: "#8b5cf6", light: "#a855f7", dark: "#7c3aed", contrastText: "#fff" }
      : { main: "#6C5CE7", light: "#A29BFE", dark: "#5A4BD1", contrastText: "#fff" },
    secondary: dark
      ? { main: "#22d3ee", light: "#67e8f9", dark: "#06b6d4", contrastText: "#000" }
      : { main: "#00B894", light: "#55EFC4", dark: "#00A381", contrastText: "#fff" },
    success: { main: "#22c55e", light: "#4ade80", dark: "#16a34a", contrastText: "#fff" },
    warning: { main: "#FDCB6E", light: "#FFEAA7", dark: "#E1B54A", contrastText: "#000" },
    error: { main: "#E17055", light: "#FAB1A0", dark: "#C0392B", contrastText: "#fff" },
    info: dark
      ? { main: "#3b82f6", light: "#60a5fa", dark: "#2563eb", contrastText: "#fff" }
      : { main: "#0984E3", light: "#74B9FF", dark: "#0767B5", contrastText: "#fff" },
    background: {
      default: dark ? "#13131f" : "transparent",
      paper: dark ? "#1c1c2e" : "#ffffff",
    },
    text: {
      primary: dark ? "#f0f0f5" : "#1A1A1A",
      secondary: dark ? "rgba(240,240,245,0.65)" : "#8B8680",
      disabled: dark ? "rgba(240,240,245,0.35)" : "rgba(0,0,0,0.3)",
    },
    divider: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)",
    action: {
      hover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
      selected: dark ? "rgba(139,92,246,0.15)" : "rgba(108,92,231,0.12)",
      focus: dark ? "rgba(139,92,246,0.2)" : "rgba(108,92,231,0.2)",
    },
  };
}

// ── Mode-specific component overrides ──

function getComponents(mode, tokens) {
  const dark = mode === "dark";
  const t = (d, l) => (dark ? d : l);

  // Primary accent — derived from preset tokens
  const accent = tokens.accent.main;
  const accentLight = tokens.accent.light;
  const accentGradient = tokens.gradients.primary;
  // Compute accent rgba for shadows (extract RGB from hex)
  const _hexToRgb = (hex) => {
    const c = hex.replace("#", "");
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)].join(",");
  };
  const accentRgb = _hexToRgb(accent);
  const accentShadow = `rgba(${accentRgb},0.35)`;
  const accentShadowHover = `rgba(${accentRgb},0.5)`;

  // Card / surface values
  const glassBg = t("#1c1c2e", "#ffffff");
  const glassBorder = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.04)");
  const glassBorderHover = t("rgba(255,255,255,0.14)", "rgba(0,0,0,0.08)");
  const cardShadow = t("0 4px 20px rgba(0,0,0,0.4)", "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)");
  const dialogBg = t("#1e1e32", "#ffffff");
  const inputBg = t("rgba(255,255,255,0.06)", "#f8f9fa");
  const inputBorder = t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.1)");
  const inputBorderHover = t("rgba(255,255,255,0.25)", "rgba(0,0,0,0.2)");
  const menuBg = t("#1e1e32", "#ffffff");
  const chipBg = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.04)");
  const chipBorder = t("rgba(255,255,255,0.15)", "rgba(0,0,0,0.08)");
  const switchTrack = t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.12)");
  const progressBg = t("rgba(255,255,255,0.06)", "rgba(0,0,0,0.06)");
  const iconColor = t("rgba(255,255,255,0.6)", "rgba(0,0,0,0.45)");
  const iconHoverBg = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.05)");
  const tooltipBg = t("rgba(20,20,40,0.95)", "#2D3436");
  const scrollThumb = t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.12)");
  const scrollThumbHover = t("rgba(255,255,255,0.22)", "rgba(0,0,0,0.2)");
  const textPrimary = t("#f0f0f5", "#1A1A1A");
  const textSecondary = t("rgba(240,240,245,0.65)", "#8B8680");
  const textMuted = t("rgba(240,240,245,0.45)", "rgba(0,0,0,0.35)");
  const textFaint = t("rgba(240,240,245,0.35)", "rgba(0,0,0,0.2)");
  const tabColor = t("rgba(255,255,255,0.4)", "rgba(0,0,0,0.4)");
  const menuItemHover = t("rgba(255,255,255,0.06)", "rgba(0,0,0,0.03)");
  const backdropBg = t("rgba(0,0,0,0.5)", "rgba(0,0,0,0.25)");
  const bodyBg = t("#13131f", "transparent");

  // FullCalendar CSS for the current mode
  const fcBg = "transparent";
  const fcBorder = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.06)");
  const fcTodayBg = `rgba(${accentRgb},0.08)`;
  const fcHeaderCellBg = t("rgba(255,255,255,0.04)", "rgba(0,0,0,0.01)");
  const fcHeaderCellBorder = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.06)");
  const fcHeaderText = t("rgba(240,240,245,0.55)", "rgba(0,0,0,0.4)");
  const fcDayNum = t("rgba(240,240,245,0.7)", "rgba(0,0,0,0.6)");
  const fcOtherDay = t("rgba(240,240,245,0.3)", "rgba(0,0,0,0.2)");
  const fcGridBorder = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.04)");
  const fcBtnBg = t("rgba(255,255,255,0.08)", "rgba(0,0,0,0.05)");
  const fcBtnBorder = t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.1)");
  const fcBtnText = t("rgba(255,255,255,0.7)", "rgba(0,0,0,0.6)");
  const fcBtnHover = t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.08)");
  const fcBtnActiveText = t("#fff", "#1a1a2e");
  const fcTimeLabel = t("rgba(255,255,255,0.35)", "rgba(0,0,0,0.35)");
  const colorScheme = dark ? "dark" : "light";

  return {
    MuiCssBaseline: {
      styleOverrides: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
        body {
          background: ${bodyBg};
          color: ${textPrimary};
          min-height: 100vh; min-height: 100dvh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
        }
        a { text-decoration: none; color: inherit; }
        @media (pointer: coarse) { * { -webkit-tap-highlight-color: transparent; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${scrollThumb}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${scrollThumbHover}; }

        .fc {
          --fc-bg-color: ${fcBg}; --fc-border-color: ${fcBorder};
          --fc-today-bg-color: ${fcTodayBg}; --fc-highlight-color: rgba(${accentRgb},0.1);
          --fc-event-bg-color: rgba(${accentRgb},0.85); --fc-event-border-color: transparent;
          --fc-neutral-bg-color: ${fcBg}; --fc-page-bg-color: ${fcBg};
          --fc-now-indicator-color: #f43f5e; --fc-event-text-color: #fff;
          font-family: "Inter", sans-serif;
        }
        .fc .fc-col-header-cell { background: ${fcHeaderCellBg}; border-bottom: 1px solid ${fcHeaderCellBorder} !important; }
        .fc .fc-col-header-cell-cushion { color: ${fcHeaderText}; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; padding: 10px 0; }
        .fc .fc-daygrid-day-number { color: ${fcDayNum}; font-weight: 500; font-size: 0.8125rem; padding: 8px; text-decoration: none; }
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { background: ${accentGradient}; color: #fff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
        .fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number { color: ${fcOtherDay}; }
        .fc-event { border-radius: 6px !important; padding: 2px 8px !important; font-size: 0.75rem !important; font-weight: 500 !important; border: none !important; cursor: pointer; }
        .fc-event.event-primary { background: rgba(${accentRgb},0.85) !important; }
        .fc-event.event-error { background: rgba(244,63,94,0.85) !important; }
        .fc-event.event-success { background: rgba(34,197,94,0.85) !important; }
        .fc-event.event-warning { background: rgba(245,158,11,0.85) !important; color: #000 !important; }
        .fc-event.event-info { background: rgba(59,130,246,0.85) !important; }
        .fc-event.event-dark { background: rgba(100,116,139,0.85) !important; }
        .fc-event.event-secondary { background: rgba(6,182,212,0.85) !important; }
        .fc .fc-scrollgrid { border: none !important; }
        .fc .fc-scrollgrid td, .fc .fc-scrollgrid th { border-color: ${fcGridBorder} !important; }
        .fc .fc-toolbar-title { color: ${textPrimary}; font-weight: 700; font-size: 1.25rem; }
        .fc .fc-button-primary { background: ${fcBtnBg} !important; border: 1px solid ${fcBtnBorder} !important; border-radius: 10px !important; font-weight: 500 !important; text-transform: capitalize !important; color: ${fcBtnText} !important; font-size: 0.8125rem !important; padding: 6px 14px !important; transition: all 0.2s ease !important; }
        .fc .fc-button-primary:hover { background: ${fcBtnHover} !important; color: ${fcBtnActiveText} !important; }
        .fc .fc-button-primary:focus { box-shadow: none !important; }
        .fc .fc-button-primary.fc-button-active { background: rgba(${accentRgb},0.25) !important; border-color: rgba(${accentRgb},0.5) !important; color: ${fcBtnActiveText} !important; }
        .fc .fc-daygrid-body-unbalanced .fc-daygrid-day-events { min-height: 1.5em; }
        .fc .fc-timegrid-slot { height: 48px; }
        .fc .fc-timegrid-slot-label-cushion { color: ${fcTimeLabel}; font-size: 0.75rem; }
        .fc .fc-timegrid-now-indicator-line { border-color: #f43f5e !important; }
        .fc th, .fc td { border-color: ${fcGridBorder} !important; }
        .fc .fc-more-link { color: ${accentLight}; font-weight: 600; }
        @media (max-width: 599px) { .MuiDialog-paper { margin: 0 !important; max-height: 100% !important; height: 100% !important; border-radius: 0 !important; } }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: glassBg,
          border: dark ? `1px solid ${glassBorder}` : "none",
          borderRadius: 20, boxShadow: cardShadow,
          color: textPrimary, transition: "box-shadow 0.3s ease", overflow: "visible",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        elevation1: { background: t("#1c1c2e", "#ffffff") },
        elevation8: { background: t("#1c1c2e", "#ffffff"), border: dark ? `1px solid ${glassBorder}` : "none" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 14, textTransform: "none", fontWeight: 600, padding: "10px 24px", fontSize: "0.875rem", transition: "all 0.25s ease" },
        contained: {
          background: accentGradient, boxShadow: `0 4px 15px ${accentShadow}`, color: "#fff",
          "&:hover": { boxShadow: `0 6px 20px ${accentShadowHover}`, transform: "translateY(-1px)", filter: "brightness(1.1)" },
          "&:active": { transform: "translateY(0)" },
        },
        containedSuccess: { background: "linear-gradient(135deg, #22c55e 0%, #4ade80 100%)", boxShadow: "0 4px 15px rgba(34,197,94,0.35)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)", boxShadow: "0 6px 20px rgba(34,197,94,0.5)" } },
        containedError: { background: "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)", boxShadow: "0 4px 15px rgba(244,63,94,0.35)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)", boxShadow: "0 6px 20px rgba(244,63,94,0.5)" } },
        containedInfo: { background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.35)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)", boxShadow: "0 6px 20px rgba(59,130,246,0.5)" } },
        containedWarning: { background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)", boxShadow: "0 4px 15px rgba(245,158,11,0.35)", color: "#000", "&:hover": { background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)", boxShadow: "0 6px 20px rgba(245,158,11,0.5)", color: "#000" } },
        containedSecondary: { background: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)", boxShadow: "0 4px 15px rgba(6,182,212,0.35)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)", boxShadow: "0 6px 20px rgba(6,182,212,0.5)" } },
        outlined: { borderColor: t("rgba(255,255,255,0.15)", "rgba(0,0,0,0.15)"), color: t("rgba(255,255,255,0.8)", "rgba(0,0,0,0.7)"), "&:hover": { borderColor: t("rgba(255,255,255,0.35)", "rgba(0,0,0,0.3)"), background: t("rgba(255,255,255,0.04)", "rgba(0,0,0,0.03)"), transform: "translateY(-1px)" } },
        text: { color: t("rgba(255,255,255,0.65)", "rgba(0,0,0,0.55)"), "&:hover": { background: t("rgba(255,255,255,0.06)", "rgba(0,0,0,0.04)"), color: textPrimary } },
        sizeSmall: { padding: "6px 16px", fontSize: "0.8125rem", borderRadius: 10 },
        sizeLarge: { padding: "14px 32px", fontSize: "1rem", borderRadius: 16 },
      },
    },
    MuiDialog: { styleOverrides: { paper: { background: dialogBg, ...(dark && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }), border: dark ? `1px solid ${glassBorder}` : "none", borderRadius: 24, boxShadow: t("0 24px 80px rgba(0,0,0,0.3)", "0 8px 40px rgba(0,0,0,0.12)") } } },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700, fontSize: "1.25rem", padding: "24px 24px 8px" } } },
    MuiDialogContent: { styleOverrides: { root: { padding: "16px 24px" } } },
    MuiDialogActions: { styleOverrides: { root: { padding: "8px 24px 24px", gap: 8 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 12, background: inputBg, transition: "all 0.2s ease", "& fieldset": { borderColor: inputBorder, transition: "border-color 0.2s ease" }, "&:hover fieldset": { borderColor: `${inputBorderHover} !important` }, "&.Mui-focused fieldset": { borderColor: `${accent} !important`, borderWidth: "1.5px !important" }, "&.Mui-focused": { background: `rgba(${accentRgb},0.04)` } },
        input: { color: textPrimary, "&::placeholder": { color: textFaint, opacity: 1 } },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: textMuted, "&.Mui-focused": { color: accentLight } } } },
    MuiInputBase: { styleOverrides: { root: { color: textPrimary }, input: { "&::placeholder": { color: textFaint, opacity: 1 }, "&[type='date'], &[type='time']": { colorScheme } } } },
    MuiSelect: { styleOverrides: { icon: { color: textMuted }, select: { color: textPrimary } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: "0.875rem", borderRadius: 8, margin: "2px 6px", padding: "8px 12px", transition: "all 0.15s ease", "&:hover": { background: menuItemHover }, "&.Mui-selected": { background: `${accent}1A`, "&:hover": { background: `${accent}28` } } } } },
    MuiMenu: { styleOverrides: { paper: { background: `${menuBg} !important`, border: dark ? `1px solid ${glassBorder}` : "none", borderRadius: "16px !important", boxShadow: t("0 12px 40px rgba(0,0,0,0.25) !important", "0 4px 24px rgba(0,0,0,0.1) !important"), marginTop: 4 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 10, fontWeight: 500, fontSize: "0.8125rem", transition: "all 0.2s ease", height: 32 }, filled: { background: chipBg, "&:hover": { background: t("rgba(255,255,255,0.12)", "rgba(0,0,0,0.08)") } }, outlined: { borderColor: chipBorder, "&:hover": { background: t("rgba(255,255,255,0.04)", "rgba(0,0,0,0.03)") } }, deleteIcon: { color: textMuted, "&:hover": { color: textSecondary } } } },
    MuiSwitch: { styleOverrides: { root: { width: 52, height: 32, padding: 0 }, switchBase: { padding: 4, "&.Mui-checked": { transform: "translateX(20px)", color: "#fff", "& + .MuiSwitch-track": { background: accentGradient, opacity: 1, border: "none" } } }, track: { borderRadius: 16, background: switchTrack, opacity: 1, transition: "background 0.3s ease" }, thumb: { width: 24, height: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 8, height: 6, background: progressBg }, bar: { borderRadius: 8 }, barColorPrimary: { background: `linear-gradient(90deg, ${accent}, ${accentLight})` } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 40 }, indicator: { background: `linear-gradient(90deg, ${accent}, ${accentLight})`, borderRadius: 2, height: 3 }, flexContainer: { gap: 4 } } },
    MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 500, fontSize: "0.875rem", minHeight: 40, padding: "8px 16px", color: tabColor, borderRadius: 10, transition: "all 0.2s ease", "&.Mui-selected": { color: textPrimary, fontWeight: 600 }, "&:hover": { color: textSecondary, background: t("rgba(255,255,255,0.04)", "rgba(0,0,0,0.04)") } } } },
    MuiDivider: { styleOverrides: { root: { borderColor: t("rgba(255,255,255,0.06)", "rgba(0,0,0,0.06)") } } },
    MuiIconButton: { styleOverrides: { root: { color: iconColor, transition: "all 0.2s ease", "&:hover": { background: iconHoverBg, color: textPrimary } }, sizeSmall: { padding: 6 } } },
    MuiTooltip: { styleOverrides: { tooltip: { background: tooltipBg, backdropFilter: "blur(12px)", border: `1px solid ${glassBorder}`, borderRadius: 10, fontSize: "0.75rem", fontWeight: 500, padding: "8px 12px", color: "#fff" }, arrow: { color: tooltipBg } } },
    MuiFab: { styleOverrides: { root: { background: accentGradient, boxShadow: `0 6px 24px ${accentShadow}`, transition: "all 0.3s ease", "&:hover": { boxShadow: `0 8px 32px ${accentShadowHover}`, transform: "scale(1.05)", filter: "brightness(1.1)" }, "&:active": { transform: "scale(0.95)" } } } },
    MuiBackdrop: { styleOverrides: { root: { background: backdropBg } } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: "0.875rem" } } },
    MuiAvatar: { styleOverrides: { root: { boxShadow: "0 4px 12px rgba(0,0,0,0.2)" } } },
    MuiCardContent: { styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } } },
    MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
    MuiFormLabel: { styleOverrides: { root: { fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: textMuted, marginBottom: 4 } } },
  };
}

// ── Export theme factory ──

export function createAppTheme(mode = "dark", fontFamily, preset = "default") {
  const typoBase = getTypographyBase(fontFamily);
  const tokens = getTokens(mode, preset);
  const basePalette = getPalette(mode);

  // Override MUI primary + action colors with preset accent
  const _hexToRgb = (hex) => {
    const c = hex.replace("#", "");
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)].join(",");
  };
  const aRgb = _hexToRgb(tokens.accent.main);
  const palette = {
    ...basePalette,
    primary: {
      main: tokens.accent.main,
      light: tokens.accent.light,
      dark: tokens.accent.dark,
      contrastText: "#fff",
    },
    action: {
      ...basePalette.action,
      selected: `rgba(${aRgb},0.15)`,
      focus: `rgba(${aRgb},0.2)`,
    },
  };

  return createTheme({
    palette,
    typography: {
      ...typoBase,
      subtitle1: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.5, color: mode === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" },
      subtitle2: { fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.5, color: mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" },
      caption: { fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.5, color: mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" },
      overline: { fontSize: "0.6875rem", fontWeight: 700, lineHeight: 1.5, letterSpacing: "0.1em", textTransform: "uppercase", color: mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)" },
    },
    shape: sharedShape,
    components: getComponents(mode, tokens),
  });
}

// Default export for backward compat
const theme = createAppTheme("dark");
export default theme;

