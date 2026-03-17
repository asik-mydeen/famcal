import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Grid from "@mui/material/Grid";
import Fab from "@mui/material/Fab";
import useMediaQuery from "@mui/material/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import { useFamilyController, TASK_CATEGORIES, MEMBER_COLORS } from "context/FamilyContext";

const PRIORITY_COLORS = {
  high: "#f43f5e",
  medium: "#f59e0b",
  low: "rgba(0,0,0,0.15)",
};

const INITIAL_TASK_FORM = {
  title: "",
  description: "",
  assigned_to: "",
  due_date: "",
  due_time: "",
  recurring: false,
  recurring_pattern: "daily",
  points_value: 10,
  category: "chores",
  priority: "medium",
};

function Tasks() {
  const [state, dispatch] = useFamilyController();
  const { members, tasks } = state;
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTask, setNewTask] = useState(INITIAL_TASK_FORM);
  const isSmall = useMediaQuery("(max-width:599px)");

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  // --- Derived data ---

  const todayTasks = useMemo(() => tasks.filter((t) => t.due_date === todayStr), [tasks, todayStr]);
  const todayCompleted = useMemo(() => todayTasks.filter((t) => t.completed).length, [todayTasks]);
  const todayTotal = todayTasks.length;
  const progressPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const pendingCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const pointsToday = useMemo(
    () =>
      todayTasks
        .filter((t) => t.completed)
        .reduce((sum, t) => sum + (t.points_value || 0), 0),
    [todayTasks]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (activeTab === 0) result = result.filter((t) => !t.completed);
    else if (activeTab === 1) result = result.filter((t) => t.due_date === todayStr && !t.completed);
    else if (activeTab === 2) result = result.filter((t) => t.due_date > todayStr && !t.completed);
    else if (activeTab === 3) result = result.filter((t) => t.completed);

    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });
  }, [tasks, activeTab, todayStr]);

  // --- Handlers ---

  const handleCompleteTask = useCallback(
    (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task && !task.completed) {
        dispatch({
          type: "COMPLETE_TASK",
          value: { taskId, memberId: task.assigned_to },
        });
      }
    },
    [tasks, dispatch]
  );

  const handleDeleteTask = useCallback(
    (taskId) => {
      dispatch({ type: "REMOVE_TASK", value: taskId });
    },
    [dispatch]
  );

  const handleFieldChange = useCallback((field, value) => {
    setNewTask((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddTask = useCallback(() => {
    if (!newTask.title || !newTask.assigned_to) return;
    dispatch({
      type: "ADD_TASK",
      value: {
        ...newTask,
        id: `task-${Date.now()}`,
        family_id: state.family.id,
        completed: false,
        completed_at: null,
        completed_by: null,
      },
    });
    setOpenDialog(false);
    setNewTask(INITIAL_TASK_FORM);
  }, [newTask, dispatch, state.family.id]);

  const handleOpenDialog = useCallback(() => setOpenDialog(true), []);
  const handleCloseDialog = useCallback(() => setOpenDialog(false), []);

  // --- Stat cards config ---

  const statCards = [
    {
      label: "Today's Progress",
      value: `${todayCompleted}/${todayTotal}`,
      subValue: `${progressPercent}%`,
      icon: "checklist",
      color: "#22c55e",
      hasProgress: true,
    },
    {
      label: "Pending",
      value: pendingCount,
      icon: "pending_actions",
      color: "#f59e0b",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: "check_circle",
      color: "#22c55e",
    },
    {
      label: "Points Today",
      value: `+${pointsToday}`,
      icon: "star",
      color: "#f59e0b",
    },
  ];

  // --- Render ---

  return (
    <Box sx={{ px: { xs: 2, sm: 2.5, xl: 3 }, py: { xs: 2, sm: 2.5 }, pb: { xs: 14, sm: 14, xl: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
            Tasks
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Manage and track your family tasks
          </Typography>
        </motion.div>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2.5, md: 3 } }}>
        {statCards.map((stat, index) => (
          <Grid item xs={6} md={3} key={stat.label}>
            <GlassCard delay={index * 0.1} hover sx={{ p: { xs: 2, sm: 2.5 }, height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: isSmall ? "0.6rem" : "0.65rem",
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: "text.primary",
                      mt: 0.5,
                      fontSize: isSmall ? "1.25rem" : "1.5rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: isSmall ? 38 : 46,
                    height: isSmall ? 38 : 46,
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${stat.color}18`,
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: isSmall ? "1.2rem !important" : "1.5rem !important", color: stat.color }}>
                    {stat.icon}
                  </Icon>
                </Box>
              </Box>
              {stat.hasProgress && (
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(34,197,94,0.12)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 3,
                        background: "linear-gradient(90deg, #22c55e, #4ade80)",
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontSize: "0.6rem", mt: 0.5, display: "block" }}
                  >
                    {progressPercent}% complete
                  </Typography>
                </Box>
              )}
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      {/* Filter Tabs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="standard"
            sx={{
              minHeight: 40,
              background: "background.paper",
              backdropFilter: "blur(12px)",
              border: "1px solid", borderColor: "divider",
              borderRadius: "16px",
              p: 0.5,
              "& .MuiTabs-indicator": {
                borderRadius: "12px",
                height: "100%",
                background: "action.hover",
              },
              "& .MuiTab-root": {
                minHeight: 36,
                fontSize: isSmall ? "0.75rem" : "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                color: "text.secondary",
                zIndex: 1,
                borderRadius: "12px",
                px: isSmall ? 2 : 2.5,
                transition: "color 0.2s",
                "&.Mui-selected": {
                  color: "text.primary",
                },
              },
            }}
          >
            <Tab label="All" />
            <Tab label="Today" />
            <Tab label="Upcoming" />
            <Tab label="Done" />
          </Tabs>
        </Box>
      </motion.div>

      {/* Task List */}
      <AnimatePresence mode="wait">
        {filteredTasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard
              hover={false}
              sx={{
                p: { xs: 4, md: 6 },
                textAlign: "center",
                border: "2px dashed", borderColor: "divider",
                background: "action.hover",
              }}
            >
              <Typography sx={{ fontSize: "2.5rem", mb: 1, opacity: 0.3 }}>
                {activeTab === 3 ? "\u2705" : "\uD83D\uDCCB"}
              </Typography>
              <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                {activeTab === 3 ? "No completed tasks yet" : "No tasks found"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.disabled", mt: 0.5 }}>
                {activeTab === 3 ? "Complete some tasks to see them here" : "Tap the + button to add a new task"}
              </Typography>
            </GlassCard>
          </motion.div>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {filteredTasks.map((task, index) => {
              const member = members.find((m) => m.id === task.assigned_to);
              const category = TASK_CATEGORIES.find((c) => c.key === task.category);
              const memberColor = member?.avatar_color || "rgba(0,0,0,0.15)";

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <Card
                    sx={{
                      position: "relative",
                      overflow: "hidden",
                      background: "background.paper",
                      backdropFilter: "blur(24px)",
                      border: "1px solid", borderColor: "divider",
                      borderRadius: "16px",
                      opacity: task.completed ? 0.5 : 1,
                      transition: "all 0.25s ease",
                      touchAction: "manipulation",
                      "&:hover": {
                        borderColor: "divider",
                        boxShadow: task.completed ? "none" : "0 8px 32px rgba(0,0,0,0.2)",
                      },
                    }}
                  >
                    {/* Left color border */}
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: memberColor,
                        borderRadius: "4px 0 0 4px",
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: { xs: 1.5, sm: 2 },
                        pl: { xs: 2.5, sm: 3 },
                        gap: 1,
                      }}
                    >
                      {/* Left section: category icon + task info */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.25, sm: 1.5 }, flex: 1, minWidth: 0 }}>
                        {/* Category icon */}
                        <Box
                          sx={{
                            width: isSmall ? 36 : 42,
                            height: isSmall ? 36 : 42,
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `${category?.color || "#64748b"}18`,
                            flexShrink: 0,
                          }}
                        >
                          <Icon sx={{ fontSize: isSmall ? "1.1rem !important" : "1.3rem !important", color: category?.color || "#64748b" }}>{category?.icon || "push_pin"}</Icon>
                        </Box>

                        {/* Task text */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              textDecoration: task.completed ? "line-through" : "none",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: isSmall ? "0.8rem" : "0.875rem",
                            }}
                          >
                            {task.title}
                          </Typography>

                          {/* Due date/time row */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.4, flexWrap: "wrap" }}>
                            {/* Member chip */}
                            {member && (
                              <Chip
                                label={isSmall ? member.name.charAt(0) : member.name}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  background: `${memberColor}20`,
                                  color: memberColor,
                                  border: `1px solid ${memberColor}30`,
                                  "& .MuiChip-label": { px: isSmall ? 0.75 : 1 },
                                }}
                              />
                            )}

                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary", fontSize: "0.65rem" }}
                            >
                              {task.due_date
                                ? new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "No date"}
                            </Typography>

                            {task.due_time && (
                              <>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "text.disabled", fontSize: "0.55rem" }}
                                >
                                  {"\u00B7"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "text.secondary", fontSize: "0.65rem" }}
                                >
                                  {task.due_time}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>

                      {/* Right section: priority, points, actions */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
                        {/* Priority dot */}
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium,
                            flexShrink: 0,
                          }}
                        />

                        {/* Points badge */}
                        <Chip
                          size="small"
                          icon={
                            <Icon sx={{ fontSize: "0.75rem !important", color: "#f59e0b !important" }}>star</Icon>
                          }
                          label={task.points_value}
                          sx={{
                            height: 26,
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.15)",
                            color: "#fbbf24",
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            "& .MuiChip-label": { px: 0.5 },
                          }}
                        />

                        {/* Complete button */}
                        {!task.completed && (
                          <IconButton
                            size="small"
                            onClick={() => handleCompleteTask(task.id)}
                            sx={{
                              color: "#22c55e",
                              background: "rgba(34,197,94,0.1)",
                              border: "1px solid rgba(34,197,94,0.2)",
                              width: isSmall ? 32 : 36,
                              height: isSmall ? 32 : 36,
                              transition: "all 0.2s",
                              "&:hover": {
                                background: "rgba(34,197,94,0.2)",
                                transform: "scale(1.1)",
                              },
                            }}
                          >
                            <Icon sx={{ fontSize: isSmall ? "1rem !important" : "1.2rem !important" }}>
                              check_circle
                            </Icon>
                          </IconButton>
                        )}

                        {/* Delete button */}
                        {!task.completed && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTask(task.id)}
                            sx={{
                              color: "text.disabled",
                              width: isSmall ? 28 : 32,
                              height: isSmall ? 28 : 32,
                              transition: "all 0.2s",
                              "&:hover": {
                                color: "#f43f5e",
                                background: "rgba(244,63,94,0.1)",
                              },
                            }}
                          >
                            <Icon sx={{ fontSize: isSmall ? "0.85rem !important" : "1rem !important" }}>close</Icon>
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        )}
      </AnimatePresence>

      {/* Add Task FAB */}
      <Fab
        onClick={handleOpenDialog}
        sx={{
          position: "fixed",
          bottom: 76,
          right: 20,
          zIndex: 1200,
          width: 56,
          height: 56,
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          color: "text.primary",
          boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
          "&:hover": {
            background: "linear-gradient(135deg, #6d28d9, #9333ea)",
            boxShadow: "0 12px 40px rgba(124,58,237,0.5)",
            transform: "scale(1.05)",
          },
          transition: "all 0.2s ease",
        }}
      >
        <Icon>add</Icon>
      </Fab>

      {/* Add Task Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isSmall}
        PaperProps={{
          sx: {
            background: "background.paper",
            border: isSmall ? "none" : "1px solid", borderColor: isSmall ? "transparent" : "divider",
            borderRadius: isSmall ? 0 : "24px",
            color: "text.primary",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
              New Task
            </Typography>
            {isSmall && (
              <IconButton onClick={handleCloseDialog} sx={{ color: "text.secondary" }}>
                <Icon>close</Icon>
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
            {/* Title */}
            <TextField
              fullWidth
              label="Task Title"
              placeholder="What needs to be done?"
              value={newTask.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              required
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description"
              placeholder="Add details (optional)"
              value={newTask.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              multiline
              rows={2}
            />

            {/* Assign to + Category */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Assign to"
                  value={newTask.assigned_to}
                  onChange={(e) => handleFieldChange("assigned_to", e.target.value)}
                  InputLabelProps={{ sx: { color: "text.secondary" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "text.primary",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "text.disabled" },
                      "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                    },
                    "& .MuiSvgIcon-root": { color: "text.secondary" },
                  }}
                >
                  {members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={newTask.category}
                  onChange={(e) => handleFieldChange("category", e.target.value)}
                  InputLabelProps={{ sx: { color: "text.secondary" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "text.primary",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "text.disabled" },
                      "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                    },
                    "& .MuiSvgIcon-root": { color: "text.secondary" },
                  }}
                >
                  {TASK_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.key} value={cat.key}>
                      <Icon sx={{ fontSize: "1rem !important", mr: 1, color: cat.color }}>{cat.icon}</Icon> {cat.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Due date + Due time + Priority */}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => handleFieldChange("due_date", e.target.value)}
                  InputLabelProps={{ shrink: true, sx: { color: "text.secondary" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "text.primary",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "text.disabled" },
                      "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                    },
                    "& input::-webkit-calendar-picker-indicator": { filter: "invert(0.7)" },
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  fullWidth
                  label="Due Time"
                  type="time"
                  value={newTask.due_time}
                  onChange={(e) => handleFieldChange("due_time", e.target.value)}
                  InputLabelProps={{ shrink: true, sx: { color: "text.secondary" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "text.primary",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "text.disabled" },
                      "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                    },
                    "& input::-webkit-calendar-picker-indicator": { filter: "invert(0.7)" },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Priority"
                  value={newTask.priority}
                  onChange={(e) => handleFieldChange("priority", e.target.value)}
                  InputLabelProps={{ sx: { color: "text.secondary" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "text.primary",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "text.disabled" },
                      "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                    },
                    "& .MuiSvgIcon-root": { color: "text.secondary" },
                  }}
                >
                  <MenuItem value="high">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" }} />
                      High
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                      Medium
                    </Box>
                  </MenuItem>
                  <MenuItem value="low">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "text.disabled" }} />
                      Low
                    </Box>
                  </MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Points + Recurring */}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={4}>
                <TextField
                  fullWidth
                  label="Points"
                  type="number"
                  value={newTask.points_value}
                  onChange={(e) => handleFieldChange("points_value", parseInt(e.target.value, 10) || 0)}
                  InputLabelProps={{ sx: { color: "text.secondary" } }}
                  inputProps={{ min: 0 }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "text.primary",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "text.disabled" },
                      "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newTask.recurring}
                      onChange={(e) => handleFieldChange("recurring", e.target.checked)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#7c3aed" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#7c3aed",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                      Recurring
                    </Typography>
                  }
                />
              </Grid>
              {newTask.recurring && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Repeat"
                    value={newTask.recurring_pattern}
                    onChange={(e) => handleFieldChange("recurring_pattern", e.target.value)}
                    InputLabelProps={{ sx: { color: "text.secondary" } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "text.primary",
                        "& fieldset": { borderColor: "divider" },
                        "&:hover fieldset": { borderColor: "text.disabled" },
                        "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                      },
                      "& .MuiSvgIcon-root": { color: "text.secondary" },
                    }}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          {!isSmall && (
            <Button
              variant="outlined"
              onClick={handleCloseDialog}
              sx={{
                color: "text.secondary",
                borderColor: "divider",
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                "&:hover": {
                  borderColor: "text.disabled",
                  background: "background.paper",
                },
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleAddTask}
            fullWidth={isSmall}
            disabled={!newTask.title || !newTask.assigned_to}
            sx={{
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              px: 4,
              py: 1.2,
              boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                boxShadow: "0 6px 24px rgba(34,197,94,0.4)",
              },
              "&.Mui-disabled": {
                background: "action.hover",
                color: "text.disabled",
              },
            }}
          >
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Tasks;
