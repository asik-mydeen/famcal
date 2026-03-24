/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useThemeMode } from "context/ThemeContext";
import { useTimerAlarm } from "context/TimerAlarmContext";

/**
 * TimerAlarmChips -- Always shows a timer icon in the header.
 * When timers/alarms are active, shows compact chip(s).
 * When nothing is active, shows a small clickable icon to open the panel.
 */
function TimerAlarmChips({ onOpenPanel }) {
  const { darkMode } = useThemeMode();
  const { timers, alarms } = useTimerAlarm();

  const activeTimer = timers.find((t) => t.running || t.remaining > 0);

  // Next upcoming enabled alarm — filter out invalid dates
  const nextAlarm = alarms
    .filter((a) => {
      if (!a.enabled) return false;
      const d = new Date(a.alarm_time);
      return !isNaN(d.getTime()); // Skip invalid dates
    })
    .sort((a, b) => new Date(a.alarm_time) - new Date(b.alarm_time))[0];

  const formatRemaining = (seconds) => {
    if (!seconds || isNaN(seconds)) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatAlarmTime = (timeValue) => {
    const d = new Date(timeValue);
    if (isNaN(d.getTime())) return "—";
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

  // If nothing active, show just a small icon button to access the panel
  if (!activeTimer && !nextAlarm) {
    return (
      <Tooltip title="Timers & Alarms" placement="bottom">
        <IconButton
          onClick={onOpenPanel}
          size="small"
          sx={{
            color: darkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
            "&:hover": {
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            },
          }}
        >
          <Icon sx={{ fontSize: "1.1rem" }}>timer</Icon>
        </IconButton>
      </Tooltip>
    );
  }

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
          <Icon sx={{ fontSize: "0.85rem", color: darkMode ? "#a78bfa" : "#6C5CE7" }}>
            {activeTimer.icon || "timer"}
          </Icon>
          <Typography sx={{
            fontSize: "0.8rem", fontWeight: 700,
            color: darkMode ? "#ffffff" : "#1A1A1A",
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatRemaining(activeTimer.remaining)}
          </Typography>
        </Box>
      )}

      {/* Next Alarm Chip (only ONE — the soonest) */}
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
          <Icon sx={{ fontSize: "0.85rem", color: darkMode ? "#fb923c" : "#ea580c" }}>alarm</Icon>
          <Typography sx={{
            fontSize: "0.8rem", fontWeight: 700,
            color: darkMode ? "#ffffff" : "#1A1A1A",
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatAlarmTime(nextAlarm.alarm_time)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default memo(TimerAlarmChips);
