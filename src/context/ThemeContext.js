import { createContext, useContext, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";

const ThemeContext = createContext(null);

export function ThemeModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("famcal_dark_mode");
    return stored === null ? false : stored === "true";
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

  const value = useMemo(() => ({ darkMode, toggleDarkMode, setMode }), [darkMode, toggleDarkMode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeModeProvider.propTypes = { children: PropTypes.node.isRequired };

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used inside ThemeModeProvider");
  return ctx;
}
