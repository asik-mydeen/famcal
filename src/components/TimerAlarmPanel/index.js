/* eslint-disable react/prop-types */
import { useState, memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { useTimerAlarm } from "context/TimerAlarmContext";
import SlidePanel from "components/SlidePanel";

// Timer presets in minutes
const TIMER_PRESETS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
];

// Recurring options for alarms
const RECURRING_OPTIONS = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
];

/**
 * TimerAlarmPanel -- Full management panel for timers and alarms.
 * Uses SlidePanel for consistent drawer behavior.
 *
 * Props:
 *   open (bool)    -- whether the panel is visible
 *   onClose (fn)   -- called when panel should close
 */
function TimerAlarmPanel({ open, onClose }) {
  const { darkMode } = useThemeMode();
  const {
    timers,
    alarms,
    addTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    addAlarm,
    toggleAlarm,
    removeAlarm,
  } = useTimerAlarm();

  // Inline form state: timers
  const [showTimerForm, setShowTimerForm] = useState(false);
  const [timerLabel, setTimerLabel] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("");

  // Inline form state: alarms
  const [showAlarmForm, setShowAlarmForm] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState("");
  const [alarmTime, setAlarmTime] = useState("");
  const [alarmRecurring, setAlarmRecurring] = useState("none");

  const handleStartTimer = (label, minutes) => {
    if (!minutes || minutes <= 0) return;
    addTimer({
      id: `timer-${Date.now()}`,
      label: label || `${minutes} min timer`,
      icon: "timer",
      duration: minutes * 60,
      remaining: minutes * 60,
      status: "running",
    });
    setTimerLabel("");
    setTimerMinutes("");
    setShowTimerForm(false);
  };

  const handlePresetClick = (preset) => {
    handleStartTimer(preset.label, preset.minutes);
  };

  const handleSaveAlarm = () => {
    if (!alarmTime) return;

    // Build a Date from the time input (HH:mm)
    const [hours, mins] = alarmTime.split(":").map(Number);
    const alarmDate = new Date();
    alarmDate.setHours(hours, mins, 0, 0);

    addAlarm({
      id: `alarm-${Date.now()}`,
      title: alarmTitle || "Alarm",
      icon: "alarm",
      time: alarmDate.toISOString(),
      recurring: alarmRecurring,
      enabled: true,
    });

    setAlarmTitle("");
    setAlarmTime("");
    setAlarmRecurring("none");
    setShowAlarmForm(false);
  };

  // Format remaining seconds to M:SS or H:MM:SS
  const formatRemaining = (seconds) => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Format alarm time for display
  const formatAlarmTime = (timeValue) => {
    const d = new Date(timeValue);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Shared styles
  const sectionLabel = {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "text.secondary",
    mb: 1.5,
  };

  const cardSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    px: 2,
    py: 1.5,
    borderRadius: "14px",
    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
    mb: 1,
  };

  const actionBtnSx = {
    width: 32,
    height: 32,
    color: "text.secondary",
    "&:hover": {
      background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    },
  };

  const addBtnSx = {
    display: "flex",
    alignItems: "center",
    gap: 0.75,
    px: 2,
    py: 1,
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
    color: darkMode ? "#a78bfa" : "#6C5CE7",
    background: darkMode ? "rgba(108,92,231,0.1)" : "rgba(108,92,231,0.06)",
    border: `1px dashed ${darkMode ? "rgba(108,92,231,0.3)" : "rgba(108,92,231,0.2)"}`,
    transition: "all 0.2s ease",
    touchAction: "manipulation",
    "&:hover": {
      background: darkMode ? "rgba(108,92,231,0.18)" : "rgba(108,92,231,0.12)",
    },
  };

  const presetBtnSx = {
    px: 1.5,
    py: 0.75,
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.8rem",
    color: darkMode ? "#a78bfa" : "#6C5CE7",
    background: darkMode ? "rgba(108,92,231,0.1)" : "rgba(108,92,231,0.06)",
    border: `1px solid ${darkMode ? "rgba(108,92,231,0.2)" : "rgba(108,92,231,0.15)"}`,
    transition: "all 0.2s ease",
    touchAction: "manipulation",
    "&:hover": {
      background: darkMode ? "rgba(108,92,231,0.2)" : "rgba(108,92,231,0.12)",
      transform: "translateY(-1px)",
    },
  };

  const formCardSx = {
    display: "flex",
    flexDirection: "column",
    gap: 1.5,
    p: 2,
    borderRadius: "14px",
    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
  };

  const submitBtnSx = {
    px: 2,
    py: 1,
    borderRadius: "12px",
    background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    touchAction: "manipulation",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(108,92,231,0.3)",
    },
  };

  const cancelBtnSx = {
    px: 2,
    py: 1,
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "text.secondary",
    "&:hover": {
      background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    },
  };

  const activeTimers = timers.filter((t) => t.status === "running" || t.status === "paused");

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Timers & Alarms"
      icon="timer"
      width={420}
    >
      {/* ---- Timers Section ---- */}
      <Box>
        <Typography sx={sectionLabel}>Active Timers</Typography>

        <AnimatePresence mode="popLayout">
          {activeTimers.map((timer) => (
            <motion.div
              key={timer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Box sx={cardSx}>
                {/* Left: icon + label + time */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      background: darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: "1.1rem", color: darkMode ? "#a78bfa" : "#6C5CE7" }}>
                      {timer.icon || "timer"}
                    </Icon>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timer.label}
                    </Typography>
                    <motion.div
                      key={timer.remaining}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "1.3rem",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: timer.remaining < 60
                            ? "#ef4444"
                            : darkMode
                              ? "#a78bfa"
                              : "#6C5CE7",
                          lineHeight: 1.2,
                        }}
                      >
                        {formatRemaining(timer.remaining)}
                      </Typography>
                    </motion.div>
                  </Box>
                </Box>

                {/* Right: pause/resume + cancel */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() =>
                      timer.status === "running" ? pauseTimer(timer.id) : resumeTimer(timer.id)
                    }
                    sx={actionBtnSx}
                  >
                    <Icon sx={{ fontSize: "1.1rem" }}>
                      {timer.status === "running" ? "pause" : "play_arrow"}
                    </Icon>
                  </IconButton>
                  <IconButton size="small" onClick={() => cancelTimer(timer.id)} sx={actionBtnSx}>
                    <Icon sx={{ fontSize: "1rem" }}>close</Icon>
                  </IconButton>
                </Box>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeTimers.length === 0 && !showTimerForm && (
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: "text.secondary",
              textAlign: "center",
              py: 2,
            }}
          >
            No active timers
          </Typography>
        )}

        {/* Inline Add Timer Form */}
        <AnimatePresence>
          {showTimerForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{ ...formCardSx, mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Label (optional)"
                  value={timerLabel}
                  onChange={(e) => setTimerLabel(e.target.value)}
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "10px",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    },
                  }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Minutes"
                  type="number"
                  inputProps={{ min: 1, max: 600 }}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value)}
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "10px",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    },
                  }}
                />

                {/* Quick Presets */}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {TIMER_PRESETS.map((preset) => (
                    <Box
                      key={preset.minutes}
                      onClick={() => handlePresetClick(preset)}
                      sx={presetBtnSx}
                    >
                      {preset.label}
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Box
                    onClick={() => {
                      setShowTimerForm(false);
                      setTimerLabel("");
                      setTimerMinutes("");
                    }}
                    sx={cancelBtnSx}
                  >
                    Cancel
                  </Box>
                  <Box
                    onClick={() => handleStartTimer(timerLabel, Number(timerMinutes))}
                    sx={submitBtnSx}
                  >
                    Start
                  </Box>
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Timer Button */}
        {!showTimerForm && (
          <Box onClick={() => setShowTimerForm(true)} sx={{ ...addBtnSx, mt: 1 }}>
            <Icon sx={{ fontSize: "1rem" }}>add</Icon>
            Add Timer
          </Box>
        )}
      </Box>

      {/* Divider */}
      <Box
        sx={{
          height: 1,
          background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          my: 1,
        }}
      />

      {/* ---- Alarms Section ---- */}
      <Box>
        <Typography sx={sectionLabel}>Alarms</Typography>

        <AnimatePresence mode="popLayout">
          {alarms.map((alarm) => (
            <motion.div
              key={alarm.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Box sx={cardSx}>
                {/* Left: icon + title + time */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      background: darkMode ? "rgba(251,146,60,0.12)" : "rgba(251,146,60,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: "1.1rem", color: darkMode ? "#fb923c" : "#ea580c" }}>
                      {alarm.icon || "alarm"}
                    </Icon>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {alarm.title}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: alarm.enabled
                            ? darkMode
                              ? "#fb923c"
                              : "#ea580c"
                            : "text.disabled",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatAlarmTime(alarm.time)}
                      </Typography>
                      {alarm.recurring && alarm.recurring !== "none" && (
                        <Box
                          sx={{
                            px: 0.75,
                            py: 0.15,
                            borderRadius: "6px",
                            background: darkMode
                              ? "rgba(251,146,60,0.1)"
                              : "rgba(251,146,60,0.08)",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            color: darkMode ? "#fb923c" : "#ea580c",
                            textTransform: "capitalize",
                          }}
                        >
                          {alarm.recurring}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Right: toggle + delete */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <Switch
                    size="small"
                    checked={alarm.enabled}
                    onChange={() => toggleAlarm(alarm.id)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: darkMode ? "#a78bfa" : "#6C5CE7",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: darkMode ? "#a78bfa" : "#6C5CE7",
                      },
                    }}
                  />
                  <IconButton size="small" onClick={() => removeAlarm(alarm.id)} sx={actionBtnSx}>
                    <Icon sx={{ fontSize: "1rem" }}>delete_outline</Icon>
                  </IconButton>
                </Box>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {alarms.length === 0 && !showAlarmForm && (
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: "text.secondary",
              textAlign: "center",
              py: 2,
            }}
          >
            No alarms set
          </Typography>
        )}

        {/* Inline Add Alarm Form */}
        <AnimatePresence>
          {showAlarmForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{ ...formCardSx, mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Title (optional)"
                  value={alarmTitle}
                  onChange={(e) => setAlarmTitle(e.target.value)}
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "10px",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    },
                  }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Time"
                  type="time"
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "10px",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    },
                  }}
                />
                <Select
                  size="small"
                  value={alarmRecurring}
                  onChange={(e) => setAlarmRecurring(e.target.value)}
                  sx={{
                    borderRadius: "10px",
                    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  }}
                >
                  {RECURRING_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>

                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Box
                    onClick={() => {
                      setShowAlarmForm(false);
                      setAlarmTitle("");
                      setAlarmTime("");
                      setAlarmRecurring("none");
                    }}
                    sx={cancelBtnSx}
                  >
                    Cancel
                  </Box>
                  <Box onClick={handleSaveAlarm} sx={submitBtnSx}>
                    Save
                  </Box>
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Alarm Button */}
        {!showAlarmForm && (
          <Box onClick={() => setShowAlarmForm(true)} sx={{ ...addBtnSx, mt: 1 }}>
            <Icon sx={{ fontSize: "1rem" }}>add</Icon>
            Add Alarm
          </Box>
        )}
      </Box>
    </SlidePanel>
  );
}

export default memo(TimerAlarmPanel);
