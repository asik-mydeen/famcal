import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import { useFamilyController } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";

// Mood definitions — Material Icons + gradient colors (no emojis)
const MOODS = [
  { key: "happy", icon: "sentiment_very_satisfied", label: "Happy", color: "#22c55e", gradient: "linear-gradient(135deg, #22c55e, #4ade80)" },
  { key: "good", icon: "sentiment_satisfied", label: "Good", color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)" },
  { key: "okay", icon: "sentiment_neutral", label: "Okay", color: "#94a3b8", gradient: "linear-gradient(135deg, #94a3b8, #cbd5e1)" },
  { key: "tired", icon: "bedtime", label: "Tired", color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
  { key: "stressed", icon: "psychology_alt", label: "Stressed", color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
  { key: "sad", icon: "sentiment_dissatisfied", label: "Sad", color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1, #818cf8)" },
  { key: "angry", icon: "sentiment_very_dissatisfied", label: "Angry", color: "#ef4444", gradient: "linear-gradient(135deg, #ef4444, #f87171)" },
  { key: "excited", icon: "celebration", label: "Excited", color: "#ec4899", gradient: "linear-gradient(135deg, #ec4899, #f472b6)" },
];

function getMoodConfig(moodKey) {
  return MOODS.find((m) => m.key === moodKey) || MOODS[2];
}

export { MOODS, getMoodConfig };

// Mood icon pill — reusable across all variants
function MoodPill({ mood, size = "medium", selected, onClick, darkMode }) {
  const sz = size === "small" ? 28 : size === "large" ? 48 : 36;
  const iconSz = size === "small" ? "0.9rem" : size === "large" ? "1.5rem" : "1.2rem";
  const labelSz = size === "small" ? "0.55rem" : "0.65rem";

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25,
        cursor: onClick ? "pointer" : "default",
        touchAction: "manipulation",
        transition: "all 0.2s ease",
        "&:hover": onClick ? { transform: "translateY(-2px)" } : {},
        "&:active": onClick ? { transform: "scale(0.92)" } : {},
      }}
    >
      <Box sx={{
        width: sz, height: sz, borderRadius: "50%",
        background: selected ? mood.gradient : darkMode ? `${mood.color}20` : `${mood.color}12`,
        border: `2px solid ${selected ? mood.color : "transparent"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: selected ? `0 4px 14px ${mood.color}44` : "none",
        transition: "all 0.2s ease",
      }}>
        <Icon sx={{
          fontSize: `${iconSz} !important`,
          color: selected ? "#fff" : mood.color,
        }}>
          {mood.icon}
        </Icon>
      </Box>
      {size !== "small" && (
        <Typography sx={{ fontSize: labelSz, fontWeight: 600, color: selected ? mood.color : darkMode ? "rgba(255,255,255,0.5)" : "text.secondary" }}>
          {mood.label}
        </Typography>
      )}
    </Box>
  );
}

MoodPill.propTypes = {
  mood: PropTypes.object.isRequired,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  darkMode: PropTypes.bool,
};

function MoodBoard({ variant = "full" }) {
  const [state, dispatch] = useFamilyController();
  const { members, moodCheckins: rawMoodCheckins } = state;
  const moodCheckins = rawMoodCheckins || [];
  const { tokens, darkMode } = useAppTheme();
  const alpha = (hex, opacity) => `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;

  const [checkinMember, setCheckinMember] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showNote, setShowNote] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const todayMoods = useMemo(() => {
    const map = {};
    moodCheckins.forEach((c) => {
      if (c.checkin_date === todayStr) map[c.member_id] = c;
    });
    return map;
  }, [moodCheckins, todayStr]);

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  const getMemberWeekMoods = (memberId) =>
    weekDates.map((date) => {
      const checkin = moodCheckins.find((c) => c.member_id === memberId && c.checkin_date === date);
      return checkin ? getMoodConfig(checkin.mood) : null;
    });

  const handleSelectMood = (memberId, moodKey) => {
    dispatch({
      type: "ADD_MOOD_CHECKIN",
      value: {
        id: `mood-${Date.now()}`,
        family_id: state.family?.id,
        member_id: memberId,
        mood: moodKey,
        note: noteText.trim() || null,
        checkin_date: todayStr,
        created_at: new Date().toISOString(),
      },
    });
    setCheckinMember(null);
    setNoteText("");
    setShowNote(false);
  };

  // ── Badge variant (HeaderBar) ──
  if (variant === "badge") {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {members.slice(0, 4).map((member) => {
          const mood = todayMoods[member.id];
          if (!mood) return null;
          const config = getMoodConfig(mood.mood);
          return (
            <Tooltip key={member.id} title={`${member.name}: ${config.label}`} arrow>
              <Box sx={{
                width: 20, height: 20, borderRadius: "50%",
                background: config.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon sx={{ fontSize: "0.7rem !important", color: "#fff" }}>{config.icon}</Icon>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  }

  // ── Widget variant (sidebar) ──
  if (variant === "widget") {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>mood</Icon>
          <Typography fontSize="0.85rem" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
            Today&apos;s Moods
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {members.map((member) => {
            const mood = todayMoods[member.id];
            const config = mood ? getMoodConfig(mood.mood) : null;
            return (
              <Box key={member.id} sx={{
                display: "flex", alignItems: "center", gap: 1,
                p: 1, borderRadius: "10px",
                bgcolor: config ? alpha(config.color, 0.06) : darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)",
              }}>
                <Avatar src={member.avatar_url} sx={{ width: 24, height: 24, bgcolor: member.avatar_color, fontSize: "0.65rem" }}>
                  {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                </Avatar>
                <Typography fontSize="0.78rem" color={darkMode ? "#fff" : "#1a1a1a"} flex={1}>
                  {member.name.split(" ")[0]}
                </Typography>
                {config ? (
                  <Box sx={{ width: 22, height: 22, borderRadius: "50%", background: config.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon sx={{ fontSize: "0.8rem !important", color: "#fff" }}>{config.icon}</Icon>
                  </Box>
                ) : (
                  <Typography fontSize="0.7rem" color={darkMode ? "rgba(255,255,255,0.3)" : "#94a3b8"}>--</Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // ── Full variant (calendar sidebar) ──
  return (
    <GlassCard>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>mood</Icon>
        <Typography fontSize="0.95rem" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
          Feelings Check-In
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {members.map((member) => {
          const mood = todayMoods[member.id];
          const config = mood ? getMoodConfig(mood.mood) : null;
          const isCheckinActive = checkinMember === member.id;
          const weekMoods = getMemberWeekMoods(member.id);

          return (
            <Box key={member.id}>
              <Box
                onClick={() => setCheckinMember(isCheckinActive ? null : member.id)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5,
                  p: 1.5, borderRadius: "14px",
                  cursor: "pointer", touchAction: "manipulation",
                  bgcolor: config ? alpha(config.color, 0.06) : darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)",
                  border: "1px solid",
                  borderColor: config ? alpha(config.color, 0.15) : darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  transition: "all 0.2s ease",
                  "&:hover": { bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", transform: "translateY(-1px)" },
                  "&:active": { transform: "scale(0.97)" },
                }}
              >
                <Avatar src={member.avatar_url} sx={{ width: 32, height: 32, bgcolor: member.avatar_color, fontSize: "0.75rem" }}>
                  {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontSize="0.85rem" fontWeight={600} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {member.name.split(" ")[0]}
                  </Typography>
                  {/* Weekly trend — icon dots */}
                  <Box display="flex" gap={0.5} mt={0.25}>
                    {weekMoods.map((wm, i) => (
                      <Box key={i} sx={{
                        width: 14, height: 14, borderRadius: "50%",
                        background: wm ? wm.gradient : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {wm && <Icon sx={{ fontSize: "0.5rem !important", color: "#fff" }}>{wm.icon}</Icon>}
                      </Box>
                    ))}
                  </Box>
                </Box>
                {config ? (
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: config.gradient,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 3px 10px ${config.color}40`,
                    }}>
                      <Icon sx={{ fontSize: "1.1rem !important", color: "#fff" }}>{config.icon}</Icon>
                    </Box>
                    <Typography fontSize="0.75rem" fontWeight={600} color={config.color}>
                      {config.label}
                    </Typography>
                  </Box>
                ) : (
                  <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8"}>
                    Tap to check in
                  </Typography>
                )}
              </Box>

              {/* Mood Selection Grid */}
              <AnimatePresence>
                {isCheckinActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box sx={{ mt: 1.5, px: 0.5 }}>
                      <Box display="flex" flexWrap="wrap" gap={1.5} justifyContent="center" mb={1.5}>
                        {MOODS.map((m) => (
                          <MoodPill
                            key={m.key}
                            mood={m}
                            size="medium"
                            selected={mood?.mood === m.key}
                            darkMode={darkMode}
                            onClick={() => { if (!showNote) handleSelectMood(member.id, m.key); }}
                          />
                        ))}
                      </Box>

                      {!showNote ? (
                        <Button
                          size="small"
                          startIcon={<Icon sx={{ fontSize: "1rem !important" }}>edit_note</Icon>}
                          onClick={() => setShowNote(true)}
                          sx={{ fontSize: "0.75rem", textTransform: "none", color: darkMode ? "rgba(255,255,255,0.5)" : "text.secondary" }}
                        >
                          Add a note
                        </Button>
                      ) : (
                        <Box display="flex" gap={1} alignItems="flex-end">
                          <TextField
                            size="small" fullWidth multiline maxRows={2}
                            placeholder="How are you feeling?"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            autoFocus
                          />
                          <IconButton size="small" onClick={() => { setShowNote(false); setNoteText(""); }}
                            sx={{ color: darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8" }}
                          >
                            <Icon sx={{ fontSize: "1.2rem !important" }}>close</Icon>
                          </IconButton>
                        </Box>
                      )}

                      {mood?.note && (
                        <Typography
                          fontSize="0.75rem"
                          color={darkMode ? "rgba(255,255,255,0.5)" : "text.secondary"}
                          sx={{ mt: 0.5, fontStyle: "italic" }}
                        >
                          &quot;{mood.note}&quot;
                        </Typography>
                      )}
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          );
        })}
      </Box>
    </GlassCard>
  );
}

MoodBoard.propTypes = {
  variant: PropTypes.oneOf(["full", "widget", "badge"]),
};

export default MoodBoard;
