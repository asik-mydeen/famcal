import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Icon from "@mui/material/Icon";
import { motion, AnimatePresence } from "framer-motion";

const FAMILY_MESSAGES = [
  "Together we grow stronger every day.",
  "Small moments make the biggest memories.",
  "A family that plans together stays together.",
  "Every day is a chance to be kind.",
  "Home is where your story begins.",
  "Celebrate the little wins.",
  "You are loved more than you know.",
  "Make today count.",
];

/**
 * AmbientScreen — full-screen family hub display shown when the app is idle
 * and no photo slideshow is configured. Shows clock, today's agenda, a
 * rotating member spotlight, and a rotating motivational message.
 */
function AmbientScreen({ members, events, tasks, onDismiss }) {
  // ── Clock ──
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setDateStr(
        now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Today's events ──
  const todayEvents = (() => {
    const today = new Date().toISOString().split("T")[0];
    return (events || [])
      .filter((e) => (e.start || "").split("T")[0] === today)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);
  })();

  // ── Member spotlight rotation (every 8 seconds) ──
  const [memberIndex, setMemberIndex] = useState(0);
  const [memberVisible, setMemberVisible] = useState(true);

  useEffect(() => {
    if (!members || members.length === 0) return;
    const id = setInterval(() => {
      // Fade out, swap, fade in
      setMemberVisible(false);
      setTimeout(() => {
        setMemberIndex((prev) => (prev + 1) % members.length);
        setMemberVisible(true);
      }, 500);
    }, 8000);
    return () => clearInterval(id);
  }, [members]);

  const spotlightMember = members && members.length > 0 ? members[memberIndex] : null;

  const pendingTaskCount = (member) =>
    (tasks || []).filter(
      (t) => t.assigned_to === member.id && !t.completed
    ).length;

  // ── Rotating bottom message (every 30 seconds) ──
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % FAMILY_MESSAGES.length);
        setMsgVisible(true);
      }, 600);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box
      onClick={onDismiss}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        p: { xs: 3, md: 4 },
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Top: Clock */}
      <Box sx={{ textAlign: "center", mb: { xs: 2, md: 4 }, flexShrink: 0 }}>
        <Typography
          sx={{
            fontSize: { xs: "3.5rem", md: "5rem" },
            fontWeight: 200,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textShadow: "0 2px 20px rgba(0,0,0,0.4)",
          }}
        >
          {time}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "1rem", md: "1.2rem" },
            opacity: 0.6,
            mt: 0.5,
            fontWeight: 300,
            letterSpacing: "0.01em",
          }}
        >
          {dateStr}
        </Typography>
      </Box>

      {/* Middle: Agenda + Member spotlight */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          gap: { xs: 2, md: 4 },
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        {/* Left panel: Today's agenda (40%) */}
        <Box
          sx={{
            flex: "0 0 40%",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              opacity: 0.4,
              letterSpacing: "0.12em",
              fontSize: "0.7rem",
              mb: 1.5,
              display: "block",
            }}
          >
            Today
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {todayEvents.map((e) => {
              let timeLabel = "All day";
              if (!e.allDay && e.start) {
                timeLabel = new Date(e.start).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
              }
              // Event color dot: use className (stored as MUI color name) or avatar_color
              const dotColor = e.dotColor || "#6C5CE7";

              return (
                <Box
                  key={e.id}
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    py: 1.25,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: dotColor,
                      flexShrink: 0,
                      mt: "2px",
                    }}
                  />
                  <Typography
                    sx={{
                      opacity: 0.55,
                      minWidth: 52,
                      fontSize: "0.8rem",
                      fontWeight: 400,
                      flexShrink: 0,
                    }}
                  >
                    {timeLabel}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.title}
                  </Typography>
                </Box>
              );
            })}

            {todayEvents.length === 0 && (
              <Typography sx={{ opacity: 0.35, mt: 2, fontSize: "0.9rem" }}>
                No events today
              </Typography>
            )}
          </Box>
        </Box>

        {/* Divider */}
        <Box
          sx={{
            width: "1px",
            background: "rgba(255,255,255,0.08)",
            flexShrink: 0,
            alignSelf: "stretch",
          }}
        />

        {/* Right panel: Member spotlight (60%) */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <AnimatePresence mode="wait">
            {spotlightMember && memberVisible && (
              <motion.div
                key={spotlightMember.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ textAlign: "center", width: "100%" }}
              >
                <Avatar
                  src={spotlightMember.avatar_url || undefined}
                  sx={{
                    width: { xs: 72, md: 96 },
                    height: { xs: 72, md: 96 },
                    bgcolor: spotlightMember.avatar_color || "#6C5CE7",
                    fontSize: { xs: "2rem", md: "2.5rem" },
                    mx: "auto",
                    mb: 2,
                    boxShadow: `0 0 40px ${spotlightMember.avatar_color || "#6C5CE7"}55`,
                    border: `3px solid ${spotlightMember.avatar_color || "#6C5CE7"}88`,
                  }}
                >
                  {spotlightMember.avatar_emoji || spotlightMember.name?.[0]?.toUpperCase() || "?"}
                </Avatar>

                <Typography
                  sx={{
                    fontSize: { xs: "1.4rem", md: "1.8rem" },
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    mb: 1,
                  }}
                >
                  {spotlightMember.name}
                </Typography>

                {/* Task count badge */}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 2,
                    py: 0.75,
                    borderRadius: "20px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <Icon sx={{ fontSize: "0.9rem !important", opacity: 0.6 }}>task_alt</Icon>
                  <Typography sx={{ fontSize: "0.85rem", opacity: 0.75 }}>
                    {pendingTaskCount(spotlightMember)} pending task
                    {pendingTaskCount(spotlightMember) !== 1 ? "s" : ""}
                  </Typography>
                </Box>

                {/* Points */}
                {spotlightMember.points > 0 && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      px: 2,
                      py: 0.75,
                      ml: 1,
                      borderRadius: "20px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Icon sx={{ fontSize: "0.9rem !important", opacity: 0.6 }}>emoji_events</Icon>
                    <Typography sx={{ fontSize: "0.85rem", opacity: 0.75 }}>
                      {spotlightMember.points} pts
                    </Typography>
                  </Box>
                )}

                {/* Member indicator dots */}
                {members.length > 1 && (
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 2.5 }}>
                    {members.map((m, i) => (
                      <Box
                        key={m.id}
                        sx={{
                          width: i === memberIndex ? 18 : 6,
                          height: 6,
                          borderRadius: "3px",
                          bgcolor: i === memberIndex
                            ? (m.avatar_color || "#6C5CE7")
                            : "rgba(255,255,255,0.2)",
                          transition: "all 0.4s ease",
                        }}
                      />
                    ))}
                  </Box>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fallback: no members */}
          {(!members || members.length === 0) && (
            <Typography sx={{ opacity: 0.3, fontSize: "0.9rem" }}>
              Add family members in Settings
            </Typography>
          )}
        </Box>
      </Box>

      {/* Bottom: rotating message */}
      <Box
        sx={{
          textAlign: "center",
          mt: { xs: 2, md: 3 },
          flexShrink: 0,
          minHeight: 28,
        }}
      >
        <AnimatePresence mode="wait">
          {msgVisible && (
            <motion.div
              key={msgIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Typography
                sx={{
                  opacity: 0.35,
                  fontSize: { xs: "0.8rem", md: "0.9rem" },
                  fontStyle: "italic",
                  fontWeight: 300,
                  letterSpacing: "0.02em",
                }}
              >
                {FAMILY_MESSAGES[msgIndex]}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Tap to dismiss hint */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 20,
          color: "rgba(255,255,255,0.2)",
          pointerEvents: "none",
          fontSize: "0.72rem",
        }}
      >
        Tap to dismiss
      </Box>
    </Box>
  );
}

AmbientScreen.propTypes = {
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      avatar_color: PropTypes.string,
      avatar_emoji: PropTypes.string,
      avatar_url: PropTypes.string,
      points: PropTypes.number,
    })
  ),
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      start: PropTypes.string,
      allDay: PropTypes.bool,
    })
  ),
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      assigned_to: PropTypes.string,
      completed: PropTypes.bool,
    })
  ),
  onDismiss: PropTypes.func.isRequired,
};

AmbientScreen.defaultProps = {
  members: [],
  events: [],
  tasks: [],
};

export default AmbientScreen;
