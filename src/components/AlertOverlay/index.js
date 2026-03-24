/* eslint-disable react/prop-types */
import { useEffect, useRef, memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { useTimerAlarm } from "context/TimerAlarmContext";

/**
 * AlertOverlay -- Full-screen overlay displayed when a timer completes
 * or an alarm fires.
 *
 * Reads `activeAlert` from TimerAlarmContext and renders the appropriate UI.
 * Auto-dismisses after 60 seconds if the user does not interact.
 */
function AlertOverlay() {
  const { darkMode } = useThemeMode();
  const { activeAlert, dismissAlert, extendTimer } = useTimerAlarm();
  const autoDismissRef = useRef(null);

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    if (activeAlert) {
      autoDismissRef.current = setTimeout(() => {
        dismissAlert();
      }, 60000);
    }
    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    };
  }, [activeAlert, dismissAlert]);

  const handleDismiss = () => {
    dismissAlert();
  };

  const handleExtendOrSnooze = () => {
    // extendTimer(minutes) — context handles re-adding the timer with extra time
    extendTimer(5);
  };

  const isTimer = activeAlert?.type === "timer";
  const data = activeAlert?.data || {};

  return (
    <AnimatePresence>
      {activeAlert && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          onClick={handleDismiss}
        >
          {/* Card */}
          <Box
            component={motion.div}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: "90%",
              maxWidth: 380,
              borderRadius: "24px",
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 2.5,
              background: darkMode
                ? "rgba(255,255,255,0.06)"
                : "#ffffff",
              border: darkMode
                ? "1px solid rgba(255,255,255,0.1)"
                : "none",
              boxShadow: darkMode
                ? "0 24px 80px rgba(0,0,0,0.5)"
                : "0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)",
            }}
          >
            {/* Pulsing Icon */}
            <Box
              component={motion.div}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              sx={{
                width: 80,
                height: 80,
                borderRadius: "24px",
                background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 32px rgba(108,92,231,0.35)",
              }}
            >
              <Icon sx={{ color: "#ffffff", fontSize: "2.2rem" }}>
                {isTimer ? "timer" : "alarm"}
              </Icon>
            </Box>

            {/* Title */}
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.4rem",
                color: darkMode ? "#ffffff" : "#1A1A1A",
                lineHeight: 1.2,
              }}
            >
              {isTimer ? "Timer Done" : data.title || "Alarm"}
            </Typography>

            {/* Subtitle */}
            <Typography
              sx={{
                fontSize: "0.95rem",
                color: "text.secondary",
                lineHeight: 1.4,
              }}
            >
              {isTimer
                ? data.label || "Your timer has finished"
                : data.alarm_time
                  ? new Date(data.alarm_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Alarm"}
            </Typography>

            {/* Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                width: "100%",
                mt: 1,
              }}
            >
              {/* Extend / Snooze (secondary) */}
              <Box
                component={motion.div}
                whileTap={{ scale: 0.96 }}
                onClick={handleExtendOrSnooze}
                sx={{
                  flex: 1,
                  py: 1.5,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: darkMode ? "rgba(255,255,255,0.8)" : "#344767",
                  background: darkMode
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                  "&:hover": {
                    background: darkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.06)",
                  },
                }}
              >
                <Icon sx={{ fontSize: "1.1rem" }}>snooze</Icon>
                {isTimer ? "+5 min" : "Snooze 5 min"}
              </Box>

              {/* Dismiss (primary) */}
              <Box
                component={motion.div}
                whileTap={{ scale: 0.96 }}
                onClick={handleDismiss}
                sx={{
                  flex: 1,
                  py: 1.5,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                  boxShadow: "0 4px 16px rgba(108,92,231,0.3)",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 20px rgba(108,92,231,0.4)",
                  },
                }}
              >
                Dismiss
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}

export default memo(AlertOverlay);
