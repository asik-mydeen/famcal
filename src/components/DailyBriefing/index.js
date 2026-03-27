import { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";

// ── Mood emoji mapping ──
const MOOD_OPTIONS = [
  { key: "great", emoji: "\uD83D\uDE04", label: "Great" },
  { key: "good", emoji: "\uD83D\uDE42", label: "Good" },
  { key: "okay", emoji: "\uD83D\uDE10", label: "Okay" },
  { key: "tired", emoji: "\uD83D\uDE34", label: "Tired" },
  { key: "sad", emoji: "\uD83D\uDE22", label: "Sad" },
];

// ── Time-based greeting ──
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Format time (e.g., "3:45 PM") ──
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ── Format date (e.g., "Thu, Mar 28") ──
function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── Birthday helpers (reused from BirthdayWidget logic) ──
function getNextBirthday(member) {
  if (!member.birth_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bd = new Date(member.birth_date);
  const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  thisYearBd.setHours(0, 0, 0, 0);
  let targetBd = thisYearBd;
  if (thisYearBd < today) {
    targetBd = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
    targetBd.setHours(0, 0, 0, 0);
  }
  const daysUntil = Math.round((targetBd - today) / 86400000);
  return { name: member.name, daysUntil, avatarColor: member.avatar_color || "#6C5CE7", isBirthdayToday: daysUntil === 0 };
}

// ── Section header component ──
function SectionHeader({ icon, title, tokens, darkMode, count }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: "10px",
        background: alpha(tokens.accent.main, darkMode ? 0.15 : 0.08),
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>{icon}</Icon>
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", flex: 1 }}>
        {title}
      </Typography>
      {count !== undefined && (
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary" }}>
          {count}
        </Typography>
      )}
    </Box>
  );
}

SectionHeader.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  tokens: PropTypes.object.isRequired,
  darkMode: PropTypes.bool,
  count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

function DailyBriefing({ state, dispatch, weather, onDismiss }) {
  const { tokens, darkMode } = useAppTheme();
  const { members, events, tasks, meals, messages, moodCheckins, routines } = state;
  const todayStr = new Date().toISOString().split("T")[0];

  // Auto-dismiss timer (30 seconds)
  const [autoDismissCountdown, setAutoDismissCountdown] = useState(30);
  useEffect(() => {
    if (autoDismissCountdown <= 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => setAutoDismissCountdown((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [autoDismissCountdown, onDismiss]);

  // Reset auto-dismiss on interaction
  const handleInteraction = useCallback(() => {
    setAutoDismissCountdown(30);
  }, []);

  // ── Today's events ──
  const todaysEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter((e) => {
        const start = e.start || e.start_time;
        if (!start) return false;
        return start.split("T")[0] === todayStr;
      })
      .sort((a, b) => {
        const aTime = a.start || a.start_time || "";
        const bTime = b.start || b.start_time || "";
        return aTime.localeCompare(bTime);
      });
  }, [events, todayStr]);

  // ── Today's tasks grouped by member ──
  const tasksByMember = useMemo(() => {
    if (!tasks) return {};
    const todayTasks = tasks.filter((t) => {
      if (t.completed) return false;
      const due = t.due_date || t.dueDate;
      if (!due) return true; // No due date = show on today
      return due <= todayStr;
    });
    const grouped = {};
    todayTasks.forEach((t) => {
      const assignee = t.assigned_to || t.assignedTo || "unassigned";
      if (!grouped[assignee]) grouped[assignee] = [];
      grouped[assignee].push(t);
    });
    return grouped;
  }, [tasks, todayStr]);

  const totalTasksDue = useMemo(() => Object.values(tasksByMember).flat().length, [tasksByMember]);

  // ── Today's meals ──
  const todaysMeals = useMemo(() => {
    if (!meals) return [];
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    return meals.filter((m) => {
      const mealDay = (m.day_of_week || m.day || "").toLowerCase();
      return mealDay === dayOfWeek || (m.date && m.date === todayStr);
    });
  }, [meals, todayStr]);

  // ── Urgent / pinned messages ──
  const urgentMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter((m) => m.urgent || m.pinned);
  }, [messages]);

  // ── Mood check-ins for today ──
  const todayMoods = useMemo(() => {
    if (!moodCheckins) return {};
    const map = {};
    moodCheckins.forEach((m) => {
      if (m.checkin_date === todayStr) {
        map[m.member_id] = m.mood;
      }
    });
    return map;
  }, [moodCheckins, todayStr]);

  // ── Routines for today ──
  const routineProgress = useMemo(() => {
    if (!routines || routines.length === 0) return [];
    return routines.map((r) => {
      const steps = r.steps || [];
      const completed = steps.filter((s) => s.completed_at && s.completed_at.split("T")[0] === todayStr).length;
      return { ...r, total: steps.length, completed, pct: steps.length > 0 ? (completed / steps.length) * 100 : 0 };
    });
  }, [routines, todayStr]);

  // ── Birthdays this week ──
  const upcomingBirthdays = useMemo(() => {
    return members
      .map(getNextBirthday)
      .filter(Boolean)
      .filter((b) => b.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [members]);

  // ── Next 3 days preview ──
  const nextDaysPreview = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayEvents = (events || []).filter((e) => {
        const start = e.start || e.start_time || "";
        return start.split("T")[0] === dateStr;
      });
      const dayTasks = (tasks || []).filter((t) => {
        const due = t.due_date || t.dueDate;
        return due === dateStr && !t.completed;
      });
      days.push({
        date: d,
        dateStr,
        label: formatShortDate(dateStr),
        eventCount: dayEvents.length,
        taskCount: dayTasks.length,
      });
    }
    return days;
  }, [events, tasks]);

  // ── Mood check-in handler ──
  const handleMoodSelect = useCallback((memberId, mood) => {
    dispatch({
      type: "ADD_MOOD_CHECKIN",
      value: {
        id: crypto.randomUUID(),
        family_id: state.family?.id,
        member_id: memberId,
        mood,
        checkin_date: todayStr,
      },
    });
    handleInteraction();
  }, [dispatch, state.family?.id, todayStr, handleInteraction]);

  const getMemberName = useCallback((id) => {
    const m = members.find((m) => m.id === id);
    return m?.name || "Unassigned";
  }, [members]);

  const getMemberColor = useCallback((id) => {
    const m = members.find((m) => m.id === id);
    return m?.avatar_color || tokens.accent.main;
  }, [members, tokens]);

  // ── Weather display ──
  const weatherInfo = weather || state.weather;

  // Formatted date
  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: darkMode ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          overflow: "auto",
        }}
        onClick={handleInteraction}
      >
        <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 4 } }}>
          {/* Header: Greeting + Weather + Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
              <Box>
                <Typography sx={{
                  fontWeight: 800, fontSize: { xs: "1.6rem", md: "2rem" },
                  letterSpacing: "-0.03em", color: "text.primary", lineHeight: 1.2,
                }}>
                  {getGreeting()} {"\u2728"}
                </Typography>
                <Typography sx={{ fontSize: "0.95rem", color: "text.secondary", mt: 0.5 }}>
                  {dateDisplay}
                </Typography>
                {weatherInfo && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>
                      {weatherInfo.icon || "wb_sunny"}
                    </Icon>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "text.primary" }}>
                      {weatherInfo.temp || weatherInfo.temperature}
                    </Typography>
                    <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                      {weatherInfo.condition || weatherInfo.description}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {/* Auto-dismiss countdown */}
                <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
                  {autoDismissCountdown}s
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onDismiss}
                  sx={{
                    borderRadius: "12px", textTransform: "none", fontWeight: 600,
                    borderColor: "divider", color: "text.secondary",
                    touchAction: "manipulation",
                  }}
                >
                  Dismiss
                </Button>
              </Box>
            </Box>
          </motion.div>

          <Grid container spacing={2}>
            {/* ── Today's Schedule ── */}
            <Grid item xs={12} md={6}>
              <GlassCard delay={0.05} hover={false}>
                <SectionHeader icon="schedule" title="Today's Schedule" tokens={tokens} darkMode={darkMode}
                  count={`${todaysEvents.length} event${todaysEvents.length !== 1 ? "s" : ""}`} />
                {todaysEvents.length === 0 ? (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", py: 1 }}>
                    No events scheduled today
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {todaysEvents.slice(0, 6).map((evt) => {
                      const memberColor = getMemberColor(evt.member_id || evt.assigned_to);
                      return (
                        <Box key={evt.id} sx={{
                          display: "flex", alignItems: "center", gap: 1.5, py: 0.75, px: 1,
                          borderRadius: "8px", background: alpha(memberColor, darkMode ? 0.1 : 0.05),
                          borderLeft: `3px solid ${memberColor}`,
                        }}>
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: tokens.accent.light, minWidth: 60 }}>
                            {evt.allDay ? "All day" : formatTime(evt.start || evt.start_time)}
                          </Typography>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "text.primary", flex: 1 }} noWrap>
                            {evt.title}
                          </Typography>
                          {evt.member_id && (
                            <Box sx={{
                              width: 20, height: 20, borderRadius: "50%", bgcolor: memberColor,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.55rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                            }}>
                              {getMemberName(evt.member_id)?.[0]}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                    {todaysEvents.length > 6 && (
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", textAlign: "center", pt: 0.5 }}>
                        +{todaysEvents.length - 6} more
                      </Typography>
                    )}
                  </Box>
                )}
              </GlassCard>
            </Grid>

            {/* ── Tasks Due Today ── */}
            <Grid item xs={12} md={6}>
              <GlassCard delay={0.1} hover={false}>
                <SectionHeader icon="task_alt" title="Tasks Due Today" tokens={tokens} darkMode={darkMode}
                  count={`${totalTasksDue} task${totalTasksDue !== 1 ? "s" : ""}`} />
                {totalTasksDue === 0 ? (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", py: 1 }}>
                    All caught up!
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {Object.entries(tasksByMember).slice(0, 4).map(([memberId, memberTasks]) => {
                      const memberColor = getMemberColor(memberId);
                      return (
                        <Box key={memberId}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                            <Box sx={{
                              width: 20, height: 20, borderRadius: "50%", bgcolor: memberColor,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.55rem", fontWeight: 700, color: "#fff",
                            }}>
                              {getMemberName(memberId)?.[0]}
                            </Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary" }}>
                              {getMemberName(memberId)}
                            </Typography>
                          </Box>
                          {memberTasks.slice(0, 3).map((task) => (
                            <Box key={task.id} sx={{
                              display: "flex", alignItems: "center", gap: 1, py: 0.25, pl: 3.5,
                            }}>
                              <Icon sx={{ fontSize: "1.2rem !important", color: "text.disabled" }}>radio_button_unchecked</Icon>
                              <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }} noWrap>
                                {task.title}
                              </Typography>
                              {task.priority === "high" && (
                                <Icon sx={{ fontSize: "1.2rem !important", color: tokens.priority?.high || "#ef4444" }}>priority_high</Icon>
                              )}
                            </Box>
                          ))}
                          {memberTasks.length > 3 && (
                            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", pl: 3.5 }}>
                              +{memberTasks.length - 3} more
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </GlassCard>
            </Grid>

            {/* ── Today's Meals ── */}
            <Grid item xs={12} md={4}>
              <GlassCard delay={0.15} hover={false}>
                <SectionHeader icon="restaurant" title="Today's Meals" tokens={tokens} darkMode={darkMode} />
                {todaysMeals.length === 0 ? (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", py: 1 }}>
                    No meals planned
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {todaysMeals.map((meal) => (
                      <Box key={meal.id} sx={{
                        display: "flex", alignItems: "center", gap: 1, py: 0.5, px: 1,
                        borderRadius: "8px", background: alpha("#4ECDC4", darkMode ? 0.1 : 0.05),
                      }}>
                        <Icon sx={{ fontSize: "1.2rem !important", color: "#4ECDC4" }}>
                          {meal.meal_type === "breakfast" ? "egg_alt" :
                            meal.meal_type === "lunch" ? "lunch_dining" : "dinner_dining"}
                        </Icon>
                        <Box>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", textTransform: "capitalize" }}>
                            {meal.meal_type || "Meal"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }} noWrap>
                            {meal.title || meal.name}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </GlassCard>
            </Grid>

            {/* ── Family Messages ── */}
            <Grid item xs={12} md={4}>
              <GlassCard delay={0.2} hover={false}>
                <SectionHeader icon="forum" title="Messages" tokens={tokens} darkMode={darkMode}
                  count={urgentMessages.length > 0 ? `${urgentMessages.length} pinned` : undefined} />
                {urgentMessages.length === 0 ? (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", py: 1 }}>
                    No urgent messages
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {urgentMessages.slice(0, 3).map((msg) => (
                      <Box key={msg.id} sx={{
                        py: 0.75, px: 1, borderRadius: "8px",
                        background: alpha(msg.urgent ? "#ef4444" : tokens.accent.main, darkMode ? 0.1 : 0.05),
                        borderLeft: msg.urgent ? "3px solid #ef4444" : "none",
                      }}>
                        <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }} noWrap>
                          {msg.content || msg.text}
                        </Typography>
                        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mt: 0.25 }}>
                          {msg.author || getMemberName(msg.member_id)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </GlassCard>
            </Grid>

            {/* ── Mood Check-In ── */}
            <Grid item xs={12} md={4}>
              <GlassCard delay={0.25} hover={false}>
                <SectionHeader icon="mood" title="Mood Check-In" tokens={tokens} darkMode={darkMode} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {members.map((member) => {
                    const existingMood = todayMoods[member.id];
                    return (
                      <Box key={member.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                          <Box sx={{
                            width: 22, height: 22, borderRadius: "50%", bgcolor: member.avatar_color || tokens.accent.main,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.55rem", fontWeight: 700, color: "#fff",
                          }}>
                            {member.name?.[0]}
                          </Box>
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.primary", flex: 1 }}>
                            {member.name}
                          </Typography>
                          {existingMood && (
                            <Typography sx={{ fontSize: "0.95rem" }}>
                              {MOOD_OPTIONS.find((m) => m.key === existingMood)?.emoji || ""}
                            </Typography>
                          )}
                        </Box>
                        {!existingMood && (
                          <Box sx={{ display: "flex", gap: 0.5, pl: 3.5 }}>
                            {MOOD_OPTIONS.map((mood) => (
                              <Box
                                key={mood.key}
                                onClick={(e) => { e.stopPropagation(); handleMoodSelect(member.id, mood.key); }}
                                sx={{
                                  cursor: "pointer", touchAction: "manipulation",
                                  fontSize: "1.1rem", p: 0.25, borderRadius: "8px",
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                    transform: "scale(1.3)",
                                    background: alpha(tokens.accent.main, 0.1),
                                  },
                                  "&:active": { transform: "scale(0.9)" },
                                }}
                                title={mood.label}
                              >
                                {mood.emoji}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </GlassCard>
            </Grid>

            {/* ── Routine Status ── */}
            {routineProgress.length > 0 && (
              <Grid item xs={12} md={6}>
                <GlassCard delay={0.3} hover={false}>
                  <SectionHeader icon="checklist_rtl" title="Routine Progress" tokens={tokens} darkMode={darkMode} />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {routineProgress.slice(0, 4).map((routine) => (
                      <Box key={routine.id}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>
                            {routine.title || routine.name}
                          </Typography>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary" }}>
                            {routine.completed}/{routine.total}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={routine.pct}
                          sx={{
                            height: 6, borderRadius: 3,
                            bgcolor: alpha(tokens.accent.main, darkMode ? 0.1 : 0.06),
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 3,
                              background: routine.pct >= 100
                                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                                : `linear-gradient(135deg, ${tokens.accent.main} 0%, ${tokens.accent.light} 100%)`,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </GlassCard>
              </Grid>
            )}

            {/* ── Birthdays ── */}
            {upcomingBirthdays.length > 0 && (
              <Grid item xs={12} md={routineProgress.length > 0 ? 6 : 4}>
                <GlassCard delay={0.35} hover={false}>
                  <SectionHeader icon="cake" title="Birthdays" tokens={tokens} darkMode={darkMode} />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {upcomingBirthdays.map((bd) => (
                      <Box key={bd.name} sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        py: 0.5, px: 1, borderRadius: "8px",
                        background: alpha(bd.avatarColor, darkMode ? 0.12 : 0.06),
                      }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{
                            width: 24, height: 24, borderRadius: "50%", bgcolor: bd.avatarColor,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", fontWeight: 700, color: "#fff",
                          }}>
                            {bd.name?.[0]}
                          </Box>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>
                            {bd.name}
                          </Typography>
                        </Box>
                        <Typography sx={{
                          fontSize: "0.75rem", fontWeight: 700,
                          color: bd.isBirthdayToday ? "#22c55e" : tokens.accent.light,
                        }}>
                          {bd.isBirthdayToday ? "Today!" : `in ${bd.daysUntil}d`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </GlassCard>
              </Grid>
            )}

            {/* ── Next 3 Days Preview ── */}
            <Grid item xs={12}>
              <GlassCard delay={0.4} hover={false}>
                <SectionHeader icon="event_upcoming" title="Upcoming" tokens={tokens} darkMode={darkMode} count="Next 3 days" />
                <Grid container spacing={1.5}>
                  {nextDaysPreview.map((day) => (
                    <Grid item xs={4} key={day.dateStr}>
                      <Box sx={{
                        py: 1, px: 1.5, borderRadius: "12px", textAlign: "center",
                        background: alpha(tokens.accent.main, darkMode ? 0.06 : 0.03),
                        border: `1px solid ${alpha(tokens.accent.main, darkMode ? 0.1 : 0.06)}`,
                      }}>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "text.primary", mb: 0.25 }}>
                          {day.label}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5 }}>
                          {day.eventCount > 0 && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                              <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>event</Icon>
                              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary" }}>
                                {day.eventCount}
                              </Typography>
                            </Box>
                          )}
                          {day.taskCount > 0 && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                              <Icon sx={{ fontSize: "1.2rem !important", color: "#f59e0b" }}>task_alt</Icon>
                              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary" }}>
                                {day.taskCount}
                              </Typography>
                            </Box>
                          )}
                          {day.eventCount === 0 && day.taskCount === 0 && (
                            <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
                              Free day
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </GlassCard>
            </Grid>
          </Grid>

          {/* Bottom dismiss area */}
          <Box sx={{ textAlign: "center", mt: 3, mb: 2 }}>
            <Button
              variant="contained"
              onClick={onDismiss}
              sx={{
                borderRadius: "12px", textTransform: "none", px: 4, py: 1, fontWeight: 600,
                background: `linear-gradient(135deg, ${tokens.accent.main} 0%, ${tokens.accent.light} 100%)`,
                "&:hover": { background: `linear-gradient(135deg, ${tokens.accent.dark || tokens.accent.main} 0%, ${tokens.accent.main} 100%)` },
                touchAction: "manipulation",
              }}
            >
              <Icon sx={{ mr: 1, fontSize: "1.2rem !important" }}>arrow_forward</Icon>
              Start your day
            </Button>
          </Box>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
}

DailyBriefing.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  weather: PropTypes.object,
  onDismiss: PropTypes.func.isRequired,
};

export default DailyBriefing;
