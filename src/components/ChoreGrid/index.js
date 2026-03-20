import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";

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

function ChoreGrid({ tasks, members, weekStart, onToggleComplete, darkMode }) {
  const theme = useTheme();
  const weekDates = getWeekDates(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter recurring tasks only
  const recurringTasks = tasks.filter((t) => t.recurring);

  // Check task completion for a specific date
  const isTaskCompleted = (task, date) => {
    if (!task.completed) return false;
    if (!task.completed_at) return false;
    const completedDate = new Date(task.completed_at);
    return isSameDay(completedDate, date);
  };

  // Get cell status for a task on a specific date
  const getCellStatus = (task, date) => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(today);
    todayOnly.setHours(0, 0, 0, 0);

    if (isTaskCompleted(task, date)) return "done";
    if (dateOnly < todayOnly) return "missed";
    if (isSameDay(dateOnly, todayOnly)) return "pending";
    return "future";
  };

  // Get member color
  const getMemberColor = (memberId) => {
    const member = members.find((m) => m.id === memberId);
    return member?.avatar_color || "#6C5CE7";
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
          background: darkMode ? "rgba(255,255,255,0.05)" : "#f8f9fa",
          border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e9ecef",
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
            color: darkMode ? "#fff" : "#1a1a1a",
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
                  ? darkMode
                    ? "rgba(124,58,237,0.15)"
                    : "rgba(108,92,231,0.06)"
                  : darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "#ffffff",
                fontWeight: isToday ? 700 : 600,
                fontSize: "0.7rem",
                color: isToday
                  ? darkMode
                    ? "#a78bfa"
                    : "#6C5CE7"
                  : darkMode
                  ? "rgba(255,255,255,0.7)"
                  : "#64748b",
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
        {recurringTasks.map((task) => {
          const memberColor = getMemberColor(task.assigned_to);
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
                  p: 2,
                  background: darkMode ? "rgba(255,255,255,0.02)" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: memberColor,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  fontSize="0.8rem"
                  fontWeight={500}
                  color={darkMode ? "#fff" : "#1a1a1a"}
                  sx={{ flex: 1 }}
                >
                  {task.title}
                </Typography>
                <Box
                  sx={{
                    background: darkMode ? "rgba(255,255,255,0.08)" : "#f8f9fa",
                    borderRadius: "12px",
                    px: 1,
                    py: 0.25,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: darkMode ? "#a78bfa" : "#7c3aed",
                  }}
                >
                  {task.points_value}pt
                </Box>
              </Box>

              {/* Day Cells */}
              {weekDates.map((date, idx) => {
                const status = getCellStatus(task, date);
                const isToday = isSameDay(date, today);
                const isPending = status === "pending";

                return (
                  <Box
                    key={idx}
                    onClick={
                      isPending
                        ? () => onToggleComplete(task.id, date, task.assigned_to)
                        : undefined
                    }
                    sx={{
                      p: 2,
                      background: isToday
                        ? darkMode
                          ? "rgba(124,58,237,0.08)"
                          : "rgba(108,92,231,0.03)"
                        : darkMode
                        ? "rgba(255,255,255,0.02)"
                        : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isPending ? "pointer" : "default",
                      touchAction: isPending ? "manipulation" : "none",
                      transition: "background 0.2s ease, transform 0.15s ease",
                      ...(isPending && {
                        "&:hover": {
                          background: darkMode
                            ? "rgba(124,58,237,0.15)"
                            : "rgba(108,92,231,0.08)",
                          transform: "scale(1.05)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }),
                    }}
                  >
                    {status === "done" && (
                      <Icon
                        sx={{
                          fontSize: "24px",
                          color: "#22c55e",
                        }}
                      >
                        check_circle
                      </Icon>
                    )}
                    {status === "pending" && (
                      <Icon
                        sx={{
                          fontSize: "24px",
                          color: darkMode ? "rgba(255,255,255,0.3)" : "#94a3b8",
                        }}
                      >
                        radio_button_unchecked
                      </Icon>
                    )}
                    {status === "missed" && (
                      <Icon
                        sx={{
                          fontSize: "24px",
                          color: "#ef4444",
                        }}
                      >
                        close
                      </Icon>
                    )}
                    {status === "future" && null}
                  </Box>
                );
              })}
            </Box>
          );
        })}

        {/* Empty State */}
        {recurringTasks.length === 0 && (
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
                color: darkMode ? "rgba(255,255,255,0.2)" : "#cbd5e1",
                mb: 2,
              }}
            >
              event_busy
            </Icon>
            <Typography
              color={darkMode ? "rgba(255,255,255,0.5)" : "text.secondary"}
              fontSize="0.9rem"
            >
              No recurring chores yet. Add some from the + button below.
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
  darkMode: PropTypes.bool,
};

export default ChoreGrid;
