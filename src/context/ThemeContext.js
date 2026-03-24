import { createContext, useContext, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { getTokens, getPresetNames } from "theme/tokens";
import { alpha as alphaHelper, gradient as gradientHelper } from "theme/helpers";

const ThemeContext = createContext(null);

export function ThemeModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("famcal_dark_mode");
    return stored === null ? false : stored === "true";
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

  const setPreset = useCallback((name) => {
    setPresetState(name);
    localStorage.setItem("famcal_theme_preset", name);
  }, []);

  const value = useMemo(
    () => ({ darkMode, toggleDarkMode, setMode, preset, setPreset }),
    [darkMode, toggleDarkMode, setMode, preset, setPreset]
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
