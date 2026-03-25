import { useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";

// Helper functions for week dates
function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function getDayLabel(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function isDateInWeek(date, weekStart) {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d >= start && d < end;
}

function ChoreGrid({ tasks, members, weekStart, onToggleComplete, onUncomplete, onEdit, onDelete }) {
  const { tokens, darkMode } = useAppTheme();
  const weekDates = getWeekDates(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [justCompleted, setJustCompleted] = useState(null); // { taskId, dateIdx } for animation

  // Show: all recurring + incomplete non-recurring + recently completed non-recurring
  const gridTasks = tasks.filter((t) => {
    if (t.recurring) return true; // Always show recurring
    if (!t.completed) return true;
    if (t.completed_at) return isDateInWeek(t.completed_at, weekStart);
    return false;
  });

  // Check if a task applies to a specific date
  const taskAppliesToDate = (task, date) => {
    if (task.recurring) return true;
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date + "T00:00:00");
    return isSameDay(dueDate, date);
  };

  // Check task completion for a specific date
  const isTaskCompletedOnDate = (task, date) => {
    if (!task.completed_at) return false;
    const completedDate = new Date(task.completed_at);
    // For recurring: check if completed_at matches this specific date
    // For non-recurring: completed is permanent
    if (task.recurring) return isSameDay(completedDate, date);
    return task.completed;
  };

  // Get cell status for a task on a specific date
  const getCellStatus = (task, date) => {
    if (!taskAppliesToDate(task, date)) return "empty";

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(today);
    todayOnly.setHours(0, 0, 0, 0);

    if (isTaskCompletedOnDate(task, date)) return "done";
    if (dateOnly > todayOnly) return "future";
    if (isSameDay(dateOnly, todayOnly)) return "pending";
    return "missed"; // past and not completed
  };

  const handleCellClick = (task, date, dateIdx, status) => {
    if (status === "done" && onUncomplete) {
      onUncomplete(task.id);
    } else if (status === "pending" || status === "missed") {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      onToggleComplete(task.id, date, task.assigned_to, dateStr);
      setJustCompleted({ taskId: task.id, dateIdx });
      setTimeout(() => setJustCompleted(null), 1200);
    }
  };


  return (
    <Box
      sx={{
        overflowX: "auto",
        pb: 2,
        touchAction: "pan-x pan-y",
      }}
    >
      <Box
        sx={{
          minWidth: "800px",
          display: "grid",
          gridTemplateColumns: "240px repeat(7, 1fr)",
          gap: "1px",
          background: tokens.glass.overlay,
          border: `1px solid ${tokens.glass.border || "rgba(0,0,0,0.06)"}`,
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {/* Header Row */}
        <Box
          sx={{
            p: 2,
            background: darkMode ? "rgba(255,255,255,0.03)" : "#ffffff",
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "text.primary",
            display: "flex",
            alignItems: "center",
          }}
        >
          Chore
        </Box>
        {weekDates.map((date, idx) => {
          const isToday = isSameDay(date, today);
          return (
            <Box
              key={idx}
              sx={{
                p: 2,
                background: isToday
                  ? alpha(tokens.accent.main, darkMode ? 0.15 : 0.06)
                  : darkMode ? "rgba(255,255,255,0.03)" : "#ffffff",
                fontWeight: isToday ? 700 : 600,
                fontSize: "0.7rem",
                color: isToday ? tokens.accent.light : "text.secondary",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                textAlign: "center",
              }}
            >
              <Typography fontSize="inherit" fontWeight="inherit">
                {getDayLabel(date)}
              </Typography>
              <Typography fontSize="0.65rem" fontWeight={400}>
                {date.getDate()}
              </Typography>
            </Box>
          );
        })}

        {/* Task Rows */}
        {gridTasks.map((task) => {
          const member = members.find((m) => m.id === task.assigned_to);
          const memberColor = member?.avatar_color || "#6C5CE7";
          const memberName = member?.name?.split(" ")[0] || "Unassigned";
          return (
            <Box
              key={task.id}
              sx={{
                display: "contents",
              }}
            >
              {/* Task Name Cell */}
              <Box
                sx={{
                  p: 1.5,
                  background: darkMode ? "rgba(255,255,255,0.02)" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {/* Member avatar */}
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: memberColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: memberColor === "#FDCB6E" ? "#1a1a1a" : "#fff",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    overflow: "hidden",
                  }}
                >
                  {member?.avatar_url ? (
                    <Box component="img" src={member.avatar_url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    memberName.charAt(0)
                  )}
                </Box>
                {/* Task info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      fontSize="0.8rem"
                      fontWeight={600}
                      color={task.completed ? "text.secondary" : (darkMode ? "#fff" : "#1a1a1a")}
                      sx={{
                        lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        textDecoration: task.completed ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </Typography>
                    {task.recurring && (
                      <Tooltip title={`Repeats ${task.recurring_pattern || "daily"}`} arrow>
                        <Icon sx={{ fontSize: "0.75rem !important", color: tokens.accent.light, flexShrink: 0 }}>loop</Icon>
                      </Tooltip>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                    <Typography fontSize="0.65rem" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {memberName}
                    </Typography>
                    {task.completed && task.completed_by && (() => {
                      const completedMember = members.find((m) => m.id === task.completed_by);
                      return completedMember ? (
                        <Typography fontSize="0.6rem" sx={{ color: tokens.priority.low, lineHeight: 1.2 }}>
                          &bull; done by {completedMember.name?.split(" ")[0]}
                        </Typography>
                      ) : null;
                    })()}
                  </Box>
                </Box>
                {/* Points badge */}
                <Box
                  sx={{
                    background: tokens.glass.overlay,
                    borderRadius: "12px",
                    px: 0.75,
                    py: 0.25,
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: tokens.accent.light,
                    flexShrink: 0,
                  }}
                >
                  {task.points_value || 10}pt
                </Box>
                {/* Edit/Delete actions */}
                <Box sx={{ display: "flex", flexShrink: 0, opacity: 0.4, "&:hover": { opacity: 1 }, transition: "opacity 0.2s" }}>
                  {onEdit && (
                    <IconButton size="small" onClick={() => onEdit(task)} sx={{ p: 0.5, color: "text.secondary" }}>
                      <Icon sx={{ fontSize: "0.9rem !important" }}>edit</Icon>
                    </IconButton>
                  )}
                  {onDelete && (
                    <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.5, color: tokens.priority.high }}>
                      <Icon sx={{ fontSize: "0.9rem !important" }}>delete</Icon>
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Day Cells */}
              {weekDates.map((date, idx) => {
                const status = getCellStatus(task, date);
                const isToday = isSameDay(date, today);
                const isClickable = status === "pending" || status === "missed" || status === "done";
                const isAnimating = justCompleted?.taskId === task.id && justCompleted?.dateIdx === idx;

                return (
                  <Box
                    key={idx}
                    onClick={isClickable ? () => handleCellClick(task, date, idx, status) : undefined}
                    sx={{
                      p: 2,
                      background: isToday
                        ? alpha(tokens.accent.main, darkMode ? 0.08 : 0.03)
                        : darkMode ? "rgba(255,255,255,0.02)" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      cursor: isClickable ? "pointer" : "default",
                      touchAction: isClickable ? "manipulation" : "none",
                      transition: "background 0.2s ease, transform 0.15s ease",
                      ...(isClickable && {
                        "&:hover": {
                          background: alpha(tokens.accent.main, darkMode ? 0.15 : 0.08),
                          transform: "scale(1.05)",
                        },
                        "&:active": { transform: "scale(0.98)" },
                      }),
                    }}
                  >
                    {status === "done" && (
                      <Tooltip title={(() => {
                        const cm = members.find((m) => m.id === task.completed_by);
                        return cm ? `Tap to undo — Done by ${cm.name}` : "Tap to undo";
                      })()} arrow>
                        <motion.div
                          initial={isAnimating ? { scale: 0 } : false}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Icon sx={{ fontSize: "24px", color: tokens.priority.low }}>
                            check_circle
                          </Icon>
                        </motion.div>
                      </Tooltip>
                    )}
                    {status === "pending" && (
                      <Tooltip title="Tap to complete" arrow>
                        <Icon sx={{ fontSize: "24px", color: "text.disabled" }}>
                          radio_button_unchecked
                        </Icon>
                      </Tooltip>
                    )}
                    {status === "missed" && (
                      <Tooltip title="Missed — tap to complete late" arrow>
                        <Icon sx={{ fontSize: "24px", color: tokens.priority.high, opacity: 0.6 }}>
                          radio_button_unchecked
                        </Icon>
                      </Tooltip>
                    )}
                    {(status === "future" || status === "empty") && null}
                    {/* Points popup animation */}
                    <AnimatePresence>
                      {isAnimating && (
                        <motion.div
                          initial={{ opacity: 1, y: 0 }}
                          animate={{ opacity: 0, y: -30 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1 }}
                          style={{ position: "absolute", top: 0, pointerEvents: "none" }}
                        >
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: tokens.priority.low }}>
                            +{task.points_value || 10}pt
                          </Typography>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                );
              })}
            </Box>
          );
        })}

        {/* Empty State */}
        {gridTasks.length === 0 && (
          <Box
            sx={{
              gridColumn: "1 / -1",
              p: 6,
              textAlign: "center",
              background: darkMode ? "rgba(255,255,255,0.02)" : "#ffffff",
            }}
          >
            <Icon
              sx={{
                fontSize: "48px",
                color: "text.disabled",
                mb: 2,
              }}
            >
              event_busy
            </Icon>
            <Typography
              color="text.secondary"
              fontSize="0.9rem"
            >
              No chores yet. Add some from the + button below.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

ChoreGrid.propTypes = {
  tasks: PropTypes.array.isRequired,
  members: PropTypes.array.isRequired,
  weekStart: PropTypes.instanceOf(Date).isRequired,
  onToggleComplete: PropTypes.func.isRequired,
  onUncomplete: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};

export default ChoreGrid;
