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

const MOODS = [
  { key: "happy", emoji: "\uD83D\uDE0A", label: "Happy", color: "#22c55e" },
  { key: "good", emoji: "\uD83D\uDC4D", label: "Good", color: "#3b82f6" },
  { key: "okay", emoji: "\uD83D\uDE10", label: "Okay", color: "#94a3b8" },
  { key: "tired", emoji: "\uD83D\uDE34", label: "Tired", color: "#8b5cf6" },
  { key: "stressed", emoji: "\uD83D\uDE30", label: "Stressed", color: "#f59e0b" },
  { key: "sad", emoji: "\uD83D\uDE22", label: "Sad", color: "#6366f1" },
  { key: "angry", emoji: "\uD83D\uDE24", label: "Angry", color: "#ef4444" },
  { key: "excited", emoji: "\uD83E\uDD29", label: "Excited", color: "#ec4899" },
];

function getMoodConfig(moodKey) {
  return MOODS.find((m) => m.key === moodKey) || MOODS[2];
}

export { MOODS, getMoodConfig };

function MoodBoard({ variant = "full" }) {
  const [state, dispatch] = useFamilyController();
  const { members, moodCheckins: rawMoodCheckins } = state;
  const moodCheckins = rawMoodCheckins || [];
  const { tokens, alpha, darkMode } = useAppTheme();

  const [checkinMember, setCheckinMember] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showNote, setShowNote] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Today's check-ins per member
  const todayMoods = useMemo(() => {
    const map = {};
    moodCheckins.forEach((c) => {
      if (c.checkin_date === todayStr) {
        map[c.member_id] = c;
      }
    });
    return map;
  }, [moodCheckins, todayStr]);

  // Last 7 days for weekly trend
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  const getMemberWeekMoods = (memberId) => {
    return weekDates.map((date) => {
      const checkin = moodCheckins.find((c) => c.member_id === memberId && c.checkin_date === date);
      return checkin ? getMoodConfig(checkin.mood) : null;
    });
  };

  const handleSelectMood = (memberId, moodKey) => {
    dispatch({
      type: "ADD_MOOD_CHECKIN",
      value: {
        id: `mood-${Date.now()}`,
        family_id: state.family.id,
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

  // Compact variant for HeaderBar badge
  if (variant === "badge") {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {members.slice(0, 4).map((member) => {
          const mood = todayMoods[member.id];
          if (!mood) return null;
          const config = getMoodConfig(mood.mood);
          return (
            <Tooltip key={member.id} title={`${member.name}: ${config.label}`} arrow>
              <Typography fontSize="0.85rem" sx={{ lineHeight: 1 }}>
                {config.emoji}
              </Typography>
            </Tooltip>
          );
        })}
      </Box>
    );
  }

  // Sidebar widget variant
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
              <Box
                key={member.id}
                sx={{
                  display: "flex", alignItems: "center", gap: 1,
                  p: 1, borderRadius: "10px",
                  bgcolor: darkMode ? alpha("#fff", 0.03) : alpha("#000", 0.01),
                }}
              >
                <Avatar
                  src={member.avatar_url}
                  sx={{ width: 24, height: 24, bgcolor: member.avatar_color, fontSize: "0.65rem" }}
                >
                  {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                </Avatar>
                <Typography fontSize="0.78rem" color={darkMode ? "#fff" : "#1a1a1a"} flex={1}>
                  {member.name.split(" ")[0]}
                </Typography>
                {config ? (
                  <Typography fontSize="1rem">{config.emoji}</Typography>
                ) : (
                  <Typography fontSize="0.7rem" color={darkMode ? "rgba(255,255,255,0.3)" : "#94a3b8"}>
                    --
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Full variant for calendar sidebar
  return (
    <GlassCard>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>mood</Icon>
        <Typography fontSize="0.95rem" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
          Feelings Check-In
        </Typography>
      </Box>

      {/* Per-member mood display + check-in */}
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
                  p: 1.5, borderRadius: "12px",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  bgcolor: config
                    ? darkMode ? alpha(config.color, 0.08) : alpha(config.color, 0.04)
                    : darkMode ? alpha("#fff", 0.03) : alpha("#000", 0.01),
                  border: "1px solid",
                  borderColor: config
                    ? alpha(config.color, darkMode ? 0.2 : 0.12)
                    : darkMode ? alpha("#fff", 0.06) : alpha("#000", 0.04),
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: darkMode ? alpha("#fff", 0.05) : alpha("#000", 0.02),
                    transform: "translateY(-1px)",
                  },
                  "&:active": { transform: "scale(0.97)" },
                }}
              >
                <Avatar
                  src={member.avatar_url}
                  sx={{ width: 32, height: 32, bgcolor: member.avatar_color, fontSize: "0.75rem" }}
                >
                  {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                </Avatar>
                <Box flex={1}>
                  <Typography fontSize="0.85rem" fontWeight={600} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {member.name.split(" ")[0]}
                  </Typography>
                  {/* Weekly trend: emoji row */}
                  <Box display="flex" gap={0.25} mt={0.25}>
                    {weekMoods.map((wm, i) => (
                      <Typography key={i} fontSize="0.65rem" sx={{ opacity: wm ? 1 : 0.3, lineHeight: 1 }}>
                        {wm ? wm.emoji : "\u2022"}
                      </Typography>
                    ))}
                  </Box>
                </Box>
                {config ? (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography fontSize="1.3rem">{config.emoji}</Typography>
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

              {/* Mood Selection Row */}
              <AnimatePresence>
                {isCheckinActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box sx={{ mt: 1, px: 0.5 }}>
                      <Box display="flex" flexWrap="wrap" gap={0.75} mb={1}>
                        {MOODS.map((m) => (
                          <Box
                            key={m.key}
                            onClick={() => {
                              if (!showNote) handleSelectMood(member.id, m.key);
                            }}
                            sx={{
                              display: "flex", flexDirection: "column", alignItems: "center",
                              gap: 0.25, p: 1, borderRadius: "12px",
                              cursor: "pointer",
                              touchAction: "manipulation",
                              bgcolor: mood?.mood === m.key
                                ? alpha(m.color, darkMode ? 0.2 : 0.12)
                                : darkMode ? alpha("#fff", 0.03) : alpha("#000", 0.01),
                              border: "1px solid",
                              borderColor: mood?.mood === m.key
                                ? alpha(m.color, darkMode ? 0.35 : 0.25)
                                : "transparent",
                              transition: "all 0.15s ease",
                              "&:hover": {
                                bgcolor: alpha(m.color, darkMode ? 0.15 : 0.08),
                                transform: "scale(1.08)",
                              },
                              "&:active": { transform: "scale(0.95)" },
                              minWidth: 52,
                            }}
                          >
                            <Typography fontSize="1.3rem">{m.emoji}</Typography>
                            <Typography fontSize="0.6rem" fontWeight={600} color={m.color}>
                              {m.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Note toggle + input */}
                      {!showNote ? (
                        <Button
                          size="small"
                          startIcon={<Icon sx={{ fontSize: "1rem !important" }}>edit_note</Icon>}
                          onClick={() => setShowNote(true)}
                          sx={{
                            fontSize: "0.75rem", textTransform: "none",
                            color: darkMode ? "rgba(255,255,255,0.5)" : "text.secondary",
                          }}
                        >
                          Add a note
                        </Button>
                      ) : (
                        <Box display="flex" gap={1} alignItems="flex-end">
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            maxRows={2}
                            placeholder="How are you feeling?"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            autoFocus
                          />
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => { setShowNote(false); setNoteText(""); }}
                              sx={{ color: darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8" }}
                            >
                              <Icon sx={{ fontSize: "1.2rem !important" }}>close</Icon>
                            </IconButton>
                          </Box>
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
