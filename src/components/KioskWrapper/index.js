import { useState, useEffect, useRef, useCallback } from "react";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import PropTypes from "prop-types";

/**
 * KioskWrapper - Optimizes the app for wall-mounted displays
 *
 * Features when enabled:
 * - Fullscreen API (true fullscreen, not just browser tab)
 * - Wake Lock API (prevents screen sleep)
 * - Font scaling (1.0-1.5x)
 * - Auto-hide tabs after 5 seconds of inactivity
 * - Exit button always visible
 */
function KioskWrapper({ enabled, fontScale, onToggle, children }) {
  const [tabsVisible, setTabsVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Enter fullscreen via user gesture
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (request) {
      request.call(el).catch((err) => {
        console.warn("Fullscreen failed:", err.message);
      });
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      exit.call(document).catch(() => {});
    }
  }, []);

  // When enabled changes, enter/exit fullscreen
  useEffect(() => {
    if (enabled) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  }, [enabled, enterFullscreen, exitFullscreen]);

  // Listen for fullscreen exit (Esc key or browser UI) — sync state back
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFullscreen && enabled) {
        // User exited fullscreen via Esc — disable kiosk
        onToggle();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [enabled, onToggle]);

  // Wake Lock API
  useEffect(() => {
    if (enabled && "wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((wl) => { wakeLockRef.current = wl; })
        .catch(() => {});
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);

  // Font scaling
  useEffect(() => {
    if (enabled) {
      document.documentElement.style.fontSize = `${fontScale * 100}%`;
    }
    return () => { document.documentElement.style.fontSize = ""; };
  }, [enabled, fontScale]);

  // Auto-hide tabs
  useEffect(() => {
    if (!enabled) {
      setTabsVisible(true);
      return;
    }

    const resetHide = () => {
      setTabsVisible(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setTabsVisible(false), 5000);
    };

    const handleMove = (e) => {
      const y = e.clientY || e.touches?.[0]?.clientY || 999;
      if (y < 60) resetHide();
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("touchstart", handleMove, { passive: true });
    resetHide();

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("touchstart", handleMove);
      clearTimeout(hideTimerRef.current);
    };
  }, [enabled]);

  return (
    <Box sx={{ position: "relative" }}>
      {/* Exit kiosk button — always visible when in kiosk */}
      {enabled && (
        <Box
          onClick={onToggle}
          sx={{
            position: "fixed", top: 8, right: 8, zIndex: 9998,
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)",
            borderRadius: "8px", px: 1.5, py: 0.5, cursor: "pointer",
            opacity: 0.4, "&:hover": { opacity: 1 },
            transition: "opacity 0.2s ease",
            color: "white", fontSize: "0.7rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 0.5,
            touchAction: "manipulation",
          }}
        >
          <Icon sx={{ fontSize: "0.9rem" }}>fullscreen_exit</Icon>
          Exit Kiosk
        </Box>
      )}

      {/* Tab visibility wrapper */}
      <Box
        sx={{
          "& .kiosk-tab-strip": {
            transition: "opacity 0.3s ease, transform 0.3s ease",
            opacity: enabled && !tabsVisible ? 0 : 1,
            transform: enabled && !tabsVisible ? "translateY(-100%)" : "translateY(0)",
            pointerEvents: enabled && !tabsVisible ? "none" : "auto",
          },
        }}
      >
        {children}
      </Box>

      {/* Hint indicator when tabs are hidden */}
      {enabled && !tabsVisible && (
        <Box
          sx={{
            position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
            zIndex: 9997, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)",
            borderRadius: "0 0 12px 12px", px: 2, py: 0.5,
            color: "white", fontSize: "0.7rem", fontWeight: 500, opacity: 0.6,
            animation: "fadeInOut 3s ease-in-out",
            "@keyframes fadeInOut": {
              "0%": { opacity: 0 }, "20%": { opacity: 0.6 },
              "80%": { opacity: 0.6 }, "100%": { opacity: 0 },
            },
          }}
        >
          Touch top edge to show tabs
        </Box>
      )}
    </Box>
  );
}

KioskWrapper.propTypes = {
  enabled: PropTypes.bool.isRequired,
  fontScale: PropTypes.number.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default KioskWrapper;
