import { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { getTokens, getPresetNames } from "theme/tokens";
import { alpha as alphaHelper, gradient as gradientHelper } from "theme/helpers";

const ThemeContext = createContext(null);

/** Returns true if current hour is in the "night" window (7PM-7AM). */
function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
}

export function ThemeModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("famcal_dark_mode");
    return stored === null ? false : stored === "true";
  });

  const [autoTheme, setAutoThemeState] = useState(() => {
    return localStorage.getItem("famcal_auto_theme") === "true";
  });

  const [preset, setPresetState] = useState(() => {
    return localStorage.getItem("famcal_theme_preset") || "default";
  });

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("famcal_dark_mode", String(next));
      return next;
    });
  }, []);

  const setMode = useCallback((value) => {
    setDarkMode(value);
    localStorage.setItem("famcal_dark_mode", String(value));
  }, []);

  const setAutoTheme = useCallback((enabled) => {
    setAutoThemeState(enabled);
    localStorage.setItem("famcal_auto_theme", String(enabled));
    if (enabled) {
      // Immediately apply based on current time
      const shouldBeDark = isNightTime();
      setDarkMode(shouldBeDark);
      localStorage.setItem("famcal_dark_mode", String(shouldBeDark));
    }
  }, []);

  const setPreset = useCallback((name) => {
    setPresetState(name);
    localStorage.setItem("famcal_theme_preset", name);
  }, []);

  // Auto day/night: check every 60 seconds
  useEffect(() => {
    if (!autoTheme) return;
    const check = () => {
      const shouldBeDark = isNightTime();
      setDarkMode((prev) => {
        if (prev !== shouldBeDark) {
          localStorage.setItem("famcal_dark_mode", String(shouldBeDark));
          return shouldBeDark;
        }
        return prev;
      });
    };
    // Run immediately on mount/enable
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [autoTheme]);

  // Listen for theme changes from dashboard/kiosk sync
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.preset) setPreset(e.detail.preset);
      if (e.detail?.darkMode !== undefined) setMode(e.detail.darkMode);
    };
    window.addEventListener("famcal-theme-change", handler);
    return () => window.removeEventListener("famcal-theme-change", handler);
  }, [setPreset, setMode]);

  const value = useMemo(
    () => ({ darkMode, toggleDarkMode, setMode, autoTheme, setAutoTheme, preset, setPreset }),
    [darkMode, toggleDarkMode, setMode, autoTheme, setAutoTheme, preset, setPreset]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeModeProvider.propTypes = { children: PropTypes.node.isRequired };

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used inside ThemeModeProvider");
  return ctx;
}

/**
 * Extended theme hook — returns mode, tokens, and helpers.
 * Primary API for components consuming the theme engine.
 *
 * Usage:
 *   const { tokens, alpha, gradient, darkMode } = useAppTheme();
 *   <Box sx={{ color: tokens.priority.high, background: alpha("#6C5CE7", 0.1) }}>
 */
export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used inside ThemeModeProvider");

  const { darkMode, preset } = ctx;
  const mode = darkMode ? "dark" : "light";

  const tokens = useMemo(() => getTokens(mode, preset), [mode, preset]);

  const gradientFn = useCallback((name) => gradientHelper(tokens, name), [tokens]);

  return useMemo(
    () => ({
      ...ctx,
      tokens,
      mode,
      alpha: alphaHelper,
      gradient: gradientFn,
      presetNames: getPresetNames(),
    }),
    [ctx, tokens, mode, gradientFn]
  );
}
