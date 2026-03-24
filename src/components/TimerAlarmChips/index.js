/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useThemeMode } from "context/ThemeContext";
import { useTimerAlarm } from "context/TimerAlarmContext";

/**
 * TimerAlarmChips -- Compact header-bar chips showing the first active timer
 * and the next upcoming alarm.
 *
 * Props:
 *   onOpenPanel (fn) -- called when user clicks a chip to open TimerAlarmPanel
 */
function TimerAlarmChips({ onOpenPanel }) {
  const { darkMode } = useThemeMode();
  const { timers, alarms } = useTimerAlarm();

  // First active (running or paused) timer
  const activeTimer = timers.find((t) => t.running || t.remaining > 0);

  // Next upcoming enabled alarm (sorted by alarm_time ascending)
  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .sort((a, b) => {
      const toMin = (t) => {
        const d = new Date(t);
        return d.getHours() * 60 + d.getMinutes();
      };
      return toMin(a.alarm_time) - toMin(b.alarm_time);
    })[0];

  // Nothing to show -- render nothing so HeaderBar layout is unaffected
  if (!activeTimer && !nextAlarm) return null;

  // Format remaining seconds to MM:SS
  const formatRemaining = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Format alarm time to h:mm A
  const formatAlarmTime = (timeValue) => {
    const d = new Date(timeValue);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const isUrgent = activeTimer && activeTimer.remaining < 60;

  const chipBase = {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    px: 1.25,
    py: 0.5,
    maxHeight: 32,
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    touchAction: "manipulation",
    userSelect: "none",
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {/* Active Timer Chip */}
      {activeTimer && (
        <Box
          onClick={onOpenPanel}
          sx={{
            ...chipBase,
            background: darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)",
            border: `1px solid ${darkMode ? "rgba(108,92,231,0.3)" : "rgba(108,92,231,0.2)"}`,
            "&:hover": {
              background: darkMode ? "rgba(108,92,231,0.25)" : "rgba(108,92,231,0.14)",
            },
            ...(isUrgent && {
              animation: "timerChipPulse 1s ease-in-out infinite",
              "@keyframes timerChipPulse": {
                "0%, 100%": { boxShadow: "0 0 0 0 rgba(108,92,231,0.4)" },
                "50%": { boxShadow: "0 0 0 6px rgba(108,92,231,0)" },
              },
            }),
          }}
        >
          <Icon
            sx={{
              fontSize: "0.85rem",
              color: darkMode ? "#a78bfa" : "#6C5CE7",
            }}
          >
            {activeTimer.icon || "timer"}
          </Icon>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: darkMode ? "#ffffff" : "#1A1A1A",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatRemaining(activeTimer.remaining)}
          </Typography>
        </Box>
      )}

      {/* Next Alarm Chip */}
      {nextAlarm && (
        <Box
          onClick={onOpenPanel}
          sx={{
            ...chipBase,
            background: darkMode ? "rgba(251,146,60,0.12)" : "rgba(251,146,60,0.08)",
            border: `1px solid ${darkMode ? "rgba(251,146,60,0.25)" : "rgba(251,146,60,0.18)"}`,
            "&:hover": {
              background: darkMode ? "rgba(251,146,60,0.2)" : "rgba(251,146,60,0.14)",
            },
          }}
        >
          <Icon
            sx={{
              fontSize: "0.85rem",
              color: darkMode ? "#fb923c" : "#ea580c",
            }}
          >
            alarm
          </Icon>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: darkMode ? "#ffffff" : "#1A1A1A",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatAlarmTime(nextAlarm.alarm_time)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default memo(TimerAlarmChips);
