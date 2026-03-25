import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import SlidePanel from "components/SlidePanel";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import PageShell from "components/PageShell";
import ChoreGrid from "components/ChoreGrid";
import { useFamilyController, TASK_CATEGORIES } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";
import { getTokens } from "theme/tokens";

const staticTokens = getTokens("light");
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: staticTokens.priority.low },
  { value: "medium", label: "Medium", color: staticTokens.priority.medium },
  { value: "high", label: "High", color: staticTokens.priority.high },
];

const RECURRING_PATTERNS = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
];

function Chores() {
  const [state, dispatch] = useFamilyController();
  const { tasks, members } = state;
  const { tokens, alpha, gradient, darkMode } = useAppTheme();

  // View state
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [listFilter, setListFilter] = useState("all"); // all, today, upcoming, done

  // Week navigation (for grid view)
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    category: "chores",
    due_date: "",
    due_time: "",
    priority: "medium",
    points_value: 10,
    recurring: false,
    recurring_pattern: "daily",
  });

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    // Today's tasks: due today + all recurring tasks
    const todayTasks = tasks.filter((t) => t.due_date === today || t.recurring);
    // Completed: non-recurring completed OR recurring completed today
    const isCompletedToday = (t) =>
      t.completed || (t.recurring && t.completed_at === today);
    const completed = todayTasks.filter(isCompletedToday).length;
    const pending = todayTasks.filter((t) => !isCompletedToday(t)).length;
    const pointsToday = todayTasks
      .filter(isCompletedToday)
      .reduce((sum, t) => sum + (t.points_value || 0), 0);

    return {
      progress: todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 0,
      pending,
      completed,
      pointsToday,
    };
  }, [tasks]);

  // --- Filtered Tasks ---
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by selected member
    if (selectedMemberId) {
      filtered = filtered.filter((t) => t.assigned_to === selectedMemberId);
    }

    // Filter by list view tab
    if (viewMode === "list") {
      const today = new Date().toISOString().split("T")[0];
      if (listFilter === "today") {
        // Show tasks due today + recurring tasks (they're always "due today")
        filtered = filtered.filter((t) => t.due_date === today || t.recurring);
      } else if (listFilter === "upcoming") {
        filtered = filtered.filter((t) => t.due_date > today && !t.completed);
      } else if (listFilter === "done") {
        // Non-recurring: permanently completed. Recurring: completed today.
        filtered = filtered.filter((t) =>
          t.completed || (t.recurring && t.completed_at === today)
        );
      }
    }

    // Sort by priority (high first) then due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return filtered.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 1;
      const pb = priorityOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  }, [tasks, selectedMemberId, viewMode, listFilter]);

  // --- Handlers ---

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const handleThisWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  };

  const getWeekLabel = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const handleToggleComplete = (taskId, date, memberId, dateStr) => {
    dispatch({
      type: "COMPLETE_TASK",
      value: { taskId, memberId, date: dateStr || new Date().toISOString().split("T")[0] },
    });
  };

  const handleUncomplete = (taskId) => {
    dispatch({
      type: "UNCOMPLETE_TASK",
      value: { taskId },
    });
  };

  const handleOpenAddDialog = () => {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      assigned_to: members[0]?.id || "",
      category: "chores",
      due_date: new Date().toISOString().split("T")[0],
      due_time: "",
      priority: "medium",
      points_value: 10,
      recurring: false,
      recurring_pattern: "daily",
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      category: task.category || "chores",
      due_date: task.due_date || "",
      due_time: task.due_time || "",
      priority: task.priority || "medium",
      points_value: task.points_value || 10,
      recurring: task.recurring || false,
      recurring_pattern: task.recurring_pattern || "daily",
    });
    setOpenDialog(true);
  };

  const handleSubmitTask = () => {
    if (!formData.title.trim()) return;

    const taskData = {
      ...formData,
      family_id: state.family.id,
      completed: false,
      completed_at: null,
      completed_by: null,
    };

    if (editingTask) {
      dispatch({
        type: "UPDATE_TASK",
        value: { id: editingTask.id, ...taskData },
      });
    } else {
      dispatch({
        type: "ADD_TASK",
        value: { id: `task-${Date.now()}`, ...taskData },
      });
    }

    setOpenDialog(false);
  };

  const handleDeleteTask = (taskId) => {
    dispatch({ type: "REMOVE_TASK", value: taskId });
  };

  const getMemberById = (id) => members.find((m) => m.id === id);

  const getPriorityColor = (priority) => {
    return PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || "#94a3b8";
  };

  return (
    <PageShell>
      {/* Stats Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={3}>
            <GlassCard delay={0} hover={false}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    background: darkMode ? alpha(tokens.accent.main, 0.15) : alpha(tokens.accent.main, 0.08),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: "1.25rem", color: darkMode ? tokens.accent.light : tokens.accent.main }}>
                    trending_up
                  </Icon>
                </Box>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {stats.progress}%
                  </Typography>
                  <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                    Today&apos;s Progress
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>

          <Grid item xs={6} md={3}>
            <GlassCard delay={0.1} hover={false}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    background: darkMode ? alpha(tokens.priority.medium, 0.15) : alpha(tokens.priority.medium, 0.08),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: "1.25rem", color: tokens.priority.medium }}>
                    pending_actions
                  </Icon>
                </Box>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {stats.pending}
                  </Typography>
                  <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                    Pending
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>

          <Grid item xs={6} md={3}>
            <GlassCard delay={0.2} hover={false}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    background: darkMode ? alpha(tokens.priority.low, 0.15) : alpha(tokens.priority.low, 0.08),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: "1.25rem", color: tokens.priority.low }}>
                    check_circle
                  </Icon>
                </Box>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {stats.completed}
                  </Typography>
                  <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                    Completed
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>

          <Grid item xs={6} md={3}>
            <GlassCard delay={0.3} hover={false}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    background: darkMode ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: "1.25rem", color: "#fbbf24" }}>
                    star
                  </Icon>
                </Box>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {stats.pointsToday}
                  </Typography>
                  <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                    Points Today
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>
        </Grid>

        {/* Controls Bar */}
        <GlassCard sx={{ mb: 3 }}>
          <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
            {/* View Toggle */}
            <Box display="flex" gap={0.5}>
              <Tooltip title="Grid View">
                <IconButton
                  size="small"
                  onClick={() => setViewMode("grid")}
                  sx={{
                    background:
                      viewMode === "grid"
                        ? darkMode
                          ? alpha(tokens.accent.main, 0.2)
                          : alpha(tokens.accent.main, 0.1)
                        : "transparent",
                    color: viewMode === "grid" ? (darkMode ? tokens.accent.light : tokens.accent.main) : darkMode ? alpha("#fff", 0.6) : "inherit",
                    "&:hover": {
                      background:
                        viewMode === "grid"
                          ? darkMode
                            ? alpha(tokens.accent.main, 0.3)
                            : alpha(tokens.accent.main, 0.15)
                          : darkMode
                          ? alpha("#fff", 0.05)
                          : alpha("#000", 0.05),
                    },
                  }}
                >
                  <Icon>grid_view</Icon>
                </IconButton>
              </Tooltip>
              <Tooltip title="List View">
                <IconButton
                  size="small"
                  onClick={() => setViewMode("list")}
                  sx={{
                    background:
                      viewMode === "list"
                        ? darkMode
                          ? alpha(tokens.accent.main, 0.2)
                          : alpha(tokens.accent.main, 0.1)
                        : "transparent",
                    color: viewMode === "list" ? (darkMode ? tokens.accent.light : tokens.accent.main) : darkMode ? alpha("#fff", 0.6) : "inherit",
                    "&:hover": {
                      background:
                        viewMode === "list"
                          ? darkMode
                            ? alpha(tokens.accent.main, 0.3)
                            : alpha(tokens.accent.main, 0.15)
                          : darkMode
                          ? alpha("#fff", 0.05)
                          : alpha("#000", 0.05),
                    },
                  }}
                >
                  <Icon>list</Icon>
                </IconButton>
              </Tooltip>
            </Box>

            {/* Member Filters */}
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                label="All"
                size="small"
                onClick={() => setSelectedMemberId(null)}
                sx={{
                  background: !selectedMemberId
                    ? darkMode
                      ? alpha(tokens.accent.main, 0.2)
                      : alpha(tokens.accent.main, 0.1)
                    : darkMode
                    ? alpha("#fff", 0.05)
                    : "#f1f5f9",
                  color: !selectedMemberId ? (darkMode ? tokens.accent.light : tokens.accent.main) : "inherit",
                  fontWeight: !selectedMemberId ? 600 : 400,
                  borderRadius: "19px",
                  touchAction: "manipulation",
                }}
              />
              {members.map((member) => (
                <Chip
                  key={member.id}
                  avatar={
                    <Avatar
                      src={member.avatar_url}
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: member.avatar_color,
                        fontSize: "0.75rem",
                      }}
                    >
                      {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                    </Avatar>
                  }
                  label={member.name}
                  size="small"
                  onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                  sx={{
                    background:
                      selectedMemberId === member.id
                        ? darkMode
                          ? alpha(tokens.accent.main, 0.2)
                          : alpha(tokens.accent.main, 0.1)
                        : darkMode
                        ? alpha("#fff", 0.05)
                        : "#f1f5f9",
                    color: selectedMemberId === member.id ? (darkMode ? tokens.accent.light : tokens.accent.main) : "inherit",
                    fontWeight: selectedMemberId === member.id ? 600 : 400,
                    borderRadius: "19px",
                    touchAction: "manipulation",
                  }}
                />
              ))}
            </Box>

            {/* Week Navigation (Grid View Only) */}
            {viewMode === "grid" && (
              <Box display="flex" alignItems="center" gap={1} ml="auto">
                <IconButton size="small" onClick={handlePrevWeek}>
                  <Icon>chevron_left</Icon>
                </IconButton>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleThisWeek}
                  sx={{
                    minWidth: "auto",
                    px: 2,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: darkMode ? "#fff" : "#1a1a1a",
                  }}
                >
                  {getWeekLabel()}
                </Button>
                <IconButton size="small" onClick={handleNextWeek}>
                  <Icon>chevron_right</Icon>
                </IconButton>
              </Box>
            )}
          </Box>
        </GlassCard>

        {/* Grid View */}
        {viewMode === "grid" && (
          <GlassCard>
            <ChoreGrid
              tasks={filteredTasks}
              members={members}
              weekStart={weekStart}
              onToggleComplete={handleToggleComplete}
              onUncomplete={handleUncomplete}
              onEdit={handleOpenEditDialog}
              onDelete={handleDeleteTask}
            />
          </GlassCard>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <>
            {/* Filter Tabs */}
            <Box display="flex" gap={1} mb={2}>
              {[
                { key: "all", label: "All", icon: "list" },
                { key: "today", label: "Today", icon: "today" },
                { key: "upcoming", label: "Upcoming", icon: "event" },
                { key: "done", label: "Done", icon: "check_circle" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="small"
                  startIcon={<Icon>{tab.icon}</Icon>}
                  onClick={() => setListFilter(tab.key)}
                  sx={{
                    background:
                      listFilter === tab.key
                        ? darkMode
                          ? alpha(tokens.accent.main, 0.2)
                          : alpha(tokens.accent.main, 0.1)
                        : "transparent",
                    color: listFilter === tab.key ? (darkMode ? tokens.accent.light : tokens.accent.main) : darkMode ? alpha("#fff", 0.6) : "inherit",
                    fontWeight: listFilter === tab.key ? 600 : 400,
                    borderRadius: "12px",
                    px: 2,
                    "&:hover": {
                      background:
                        listFilter === tab.key
                          ? darkMode
                            ? alpha(tokens.accent.main, 0.3)
                            : alpha(tokens.accent.main, 0.15)
                          : darkMode
                          ? alpha("#fff", 0.05)
                          : alpha("#000", 0.05),
                    },
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </Box>

            {/* Task List */}
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, idx) => {
                const member = getMemberById(task.assigned_to);
                const category = TASK_CATEGORIES.find((c) => c.key === task.category);
                const todayStr = new Date().toISOString().split("T")[0];
                const isDone = task.completed || (task.recurring && task.completed_at === todayStr);
                const isOverdue = !isDone && !task.recurring && task.due_date && task.due_date < todayStr;
                const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(task.due_date)) / 86400000) : 0;
                const priorityMultiplier = { high: 2, medium: 1, low: 0.5 }[task.priority] || 1;
                const earnedPoints = Math.ceil((task.points_value || 10) * priorityMultiplier);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <GlassCard
                      sx={{
                        mb: 2,
                        borderLeft: isOverdue
                          ? daysOverdue >= 3
                            ? `4px solid ${tokens.priority.high}`
                            : `4px solid ${tokens.priority.medium}`
                          : task.priority === "high" && !isDone
                          ? `4px solid ${tokens.priority.high}`
                          : member
                          ? `4px solid ${member.avatar_color}`
                          : darkMode
                          ? `4px solid ${alpha("#fff", 0.1)}`
                          : "4px solid #e2e8f0",
                        ...(isOverdue && daysOverdue >= 3 && {
                          animation: "pulse-border 2s infinite",
                          "@keyframes pulse-border": {
                            "0%, 100%": { borderLeftColor: tokens.priority.high },
                            "50%": { borderLeftColor: tokens.priority.medium },
                          },
                        }),
                      }}
                    >
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        <Box flex={1}>
                          <Typography
                            variant="h6"
                            fontSize="1rem"
                            fontWeight={600}
                            color={darkMode ? "#fff" : "#1a1a1a"}
                            sx={{
                              textDecoration: (task.completed || (task.recurring && task.completed_at === new Date().toISOString().split("T")[0])) ? "line-through" : "none",
                              opacity: (task.completed || (task.recurring && task.completed_at === new Date().toISOString().split("T")[0])) ? 0.6 : 1,
                            }}
                          >
                            {task.title}
                          </Typography>
                          {task.description && (
                            <Typography
                              fontSize="0.85rem"
                              color={darkMode ? alpha("#fff", 0.6) : "text.secondary"}
                              mt={0.5}
                            >
                              {task.description}
                            </Typography>
                          )}

                          {/* Meta row */}
                          <Box display="flex" flexWrap="wrap" alignItems="center" gap={1.5} mt={1.5}>
                            {member && (
                              <Chip
                                avatar={
                                  <Avatar
                                    src={member.avatar_url}
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      bgcolor: member.avatar_color,
                                      fontSize: "0.7rem",
                                    }}
                                  >
                                    {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                                  </Avatar>
                                }
                                label={member.name}
                                size="small"
                                sx={{
                                  height: "24px",
                                  fontSize: "0.75rem",
                                  borderRadius: "12px",
                                }}
                              />
                            )}
                            {category && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Icon sx={{ fontSize: "1rem", color: category.color }}>
                                  {category.icon}
                                </Icon>
                                <Typography fontSize="0.75rem" color={darkMode ? alpha("#fff", 0.6) : "text.secondary"}>
                                  {category.label}
                                </Typography>
                              </Box>
                            )}
                            {task.due_date && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Icon sx={{ fontSize: "1rem", color: darkMode ? alpha("#fff", 0.5) : "#94a3b8" }}>
                                  event
                                </Icon>
                                <Typography fontSize="0.75rem" color={darkMode ? alpha("#fff", 0.6) : "text.secondary"}>
                                  {new Date(task.due_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </Typography>
                              </Box>
                            )}
                            {task.due_time && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Icon sx={{ fontSize: "1rem", color: darkMode ? alpha("#fff", 0.5) : "#94a3b8" }}>
                                  schedule
                                </Icon>
                                <Typography fontSize="0.75rem" color={darkMode ? alpha("#fff", 0.6) : "text.secondary"}>
                                  {task.due_time}
                                </Typography>
                              </Box>
                            )}
                            <Chip
                              label={task.priority}
                              size="small"
                              sx={{
                                height: "22px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                borderRadius: "8px",
                                bgcolor: alpha(getPriorityColor(task.priority), 0.12),
                                color: getPriorityColor(task.priority),
                              }}
                            />
                            <Box
                              sx={{
                                background: darkMode ? alpha("#fff", 0.08) : "#f8f9fa",
                                borderRadius: "12px",
                                px: 1.5,
                                py: 0.25,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: darkMode ? tokens.accent.light : tokens.accent.main,
                              }}
                            >
                              {earnedPoints}pt{priorityMultiplier !== 1 && (
                                <Typography component="span" sx={{ fontSize: "0.6rem", ml: 0.5, opacity: 0.7 }}>
                                  ({priorityMultiplier}x)
                                </Typography>
                              )}
                            </Box>
                            {isOverdue && (
                              <Chip
                                icon={<Icon sx={{ fontSize: "0.875rem !important", color: daysOverdue >= 3 ? tokens.priority.high : tokens.priority.medium }}>warning</Icon>}
                                label={daysOverdue === 1 ? "Overdue 1d" : `Overdue ${daysOverdue}d`}
                                size="small"
                                sx={{
                                  height: "24px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  borderRadius: "12px",
                                  bgcolor: alpha(daysOverdue >= 3 ? tokens.priority.high : tokens.priority.medium, 0.1),
                                  color: daysOverdue >= 3 ? tokens.priority.high : tokens.priority.medium,
                                }}
                              />
                            )}
                            {task.recurring && (
                              <Chip
                                icon={<Icon sx={{ fontSize: "0.875rem !important", color: tokens.accent.light }}>loop</Icon>}
                                label={task.recurring_pattern || "Daily"}
                                size="small"
                                sx={{
                                  height: "24px",
                                  fontSize: "0.7rem",
                                  borderRadius: "12px",
                                  bgcolor: alpha(tokens.accent.main, 0.08),
                                  color: tokens.accent.light,
                                }}
                              />
                            )}
                            {task.completed && (() => {
                              const completedMember = members.find((m) => m.id === task.completed_by);
                              return (
                                <Chip
                                  icon={<Icon sx={{ fontSize: "0.875rem !important", color: tokens.priority.low }}>check_circle</Icon>}
                                  label={completedMember ? `Done by ${completedMember.name?.split(" ")[0]}` : "Completed"}
                                  size="small"
                                  sx={{
                                    height: "24px",
                                    fontSize: "0.7rem",
                                    borderRadius: "12px",
                                    bgcolor: alpha(tokens.priority.low, 0.1),
                                    color: tokens.priority.low,
                                  }}
                                />
                              );
                            })()}
                          </Box>
                        </Box>

                        {/* Actions */}
                        <Box display="flex" gap={1}>
                          {(() => {
                            const todayStr = new Date().toISOString().split("T")[0];
                            const isDoneToday = task.completed_at === todayStr;
                            // Recurring: completable daily. Non-recurring: one-time toggle.
                            const showComplete = task.recurring ? !isDoneToday : !task.completed;
                            const showUndo = task.recurring ? isDoneToday : task.completed;
                            if (showComplete) {
                              return (
                                <Tooltip title="Complete">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleComplete(task.id, new Date(), task.assigned_to)}
                                    sx={{ color: tokens.priority.low }}
                                  >
                                    <Icon>check_circle_outline</Icon>
                                  </IconButton>
                                </Tooltip>
                              );
                            }
                            if (showUndo) {
                              return (
                                <Tooltip title="Undo completion">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleUncomplete(task.id)}
                                    sx={{ color: tokens.priority.low }}
                                  >
                                    <Icon>check_circle</Icon>
                                  </IconButton>
                                </Tooltip>
                              );
                            }
                            return null;
                          })()}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(task)}
                              sx={{
                                color: darkMode ? alpha("#fff", 0.6) : "#64748b",
                              }}
                            >
                              <Icon>edit</Icon>
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteTask(task.id)}
                              sx={{
                                color: tokens.priority.high,
                              }}
                            >
                              <Icon>delete</Icon>
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <GlassCard>
                <Box py={6} textAlign="center">
                  <Icon
                    sx={{
                      fontSize: "4rem",
                      color: darkMode ? alpha("#fff", 0.2) : "#cbd5e1",
                      mb: 2,
                    }}
                  >
                    event_busy
                  </Icon>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={darkMode ? alpha("#fff", 0.5) : "text.secondary"}
                    mb={1}
                  >
                    No tasks found
                  </Typography>
                  <Typography fontSize="0.9rem" color={darkMode ? alpha("#fff", 0.4) : "text.secondary"}>
                    Try changing the filters or add a new task
                  </Typography>
                </Box>
              </GlassCard>
            )}
          </>
        )}

        {/* Add Task FAB */}
        <Fab
          color="primary"
          sx={{
            position: "fixed",
            bottom: { xs: 90, md: 28 },
            left: { xs: "50%", md: 28 },
            transform: { xs: "translateX(-50%)", md: "none" },
            right: "auto",
            background: gradient("primary"),
            boxShadow: `0 8px 24px ${alpha(tokens.accent.main, 0.35)}`,
            "&:hover": {
              background: gradient("primary"),
              boxShadow: `0 12px 32px ${alpha(tokens.accent.main, 0.45)}`,
              filter: "brightness(0.95)",
            },
          }}
          onClick={handleOpenAddDialog}
        >
          <Icon>add</Icon>
        </Fab>

        {/* Add/Edit Task Panel */}
        <SlidePanel
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          title={editingTask ? "Edit Task" : "Add Task"}
          subtitle={editingTask ? "Update task details" : "Create a new task"}
          icon="assignment"
          width={480}
          actions={
            <>
              <Button
                variant="outlined"
                onClick={() => setOpenDialog(false)}
                sx={{ borderRadius: "12px", px: 3 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitTask}
                disabled={!formData.title.trim()}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  background: gradient("primary"),
                  "&:hover": {
                    background: gradient("primary"),
                    filter: "brightness(0.95)",
                  },
                }}
              >
                {editingTask ? "Update" : "Add"}
              </Button>
            </>
          }
        >
          <TextField
            fullWidth
            label="Task Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            autoFocus
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            select
            label="Assign To"
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          >
            {members.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar
                    src={member.avatar_url}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: member.avatar_color,
                      fontSize: "0.75rem",
                    }}
                  >
                    {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                  </Avatar>
                  {member.name}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {TASK_CATEGORIES.map((cat) => (
              <MenuItem key={cat.key} value={cat.key}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Icon sx={{ fontSize: "1.25rem", color: cat.color }}>{cat.icon}</Icon>
                  {cat.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Due Date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="time"
              label="Due Time"
              value={formData.due_time}
              onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: p.color,
                      }}
                    />
                    {p.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="Points"
              value={formData.points_value}
              onChange={(e) =>
                setFormData({ ...formData, points_value: parseInt(e.target.value, 10) || 0 })
              }
              inputProps={{ min: 0, max: 100 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              select
              label="Recurring"
              value={formData.recurring ? "yes" : "no"}
              onChange={(e) => setFormData({ ...formData, recurring: e.target.value === "yes" })}
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
            {formData.recurring && (
              <TextField
                fullWidth
                select
                label="Recurring Pattern"
                value={formData.recurring_pattern}
                onChange={(e) => setFormData({ ...formData, recurring_pattern: e.target.value })}
              >
                {RECURRING_PATTERNS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </SlidePanel>
    </PageShell>
  );
}

export default Chores;
