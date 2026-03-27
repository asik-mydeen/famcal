import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import PageShell from "components/PageShell";
import SlidePanel from "components/SlidePanel";
import { useFamilyController } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";

const ROUTINE_TYPES = [
  { value: "morning", label: "Morning", icon: "wb_sunny", color: "#f59e0b" },
  { value: "afternoon", label: "Afternoon", icon: "wb_cloudy", color: "#3b82f6" },
  { value: "bedtime", label: "Bedtime", icon: "bedtime", color: "#8b5cf6" },
  { value: "custom", label: "Custom", icon: "tune", color: "#6C5CE7" },
];

const DEFAULT_STEP_ICONS = [
  "check_circle", "brush", "restaurant", "backpack", "local_laundry_service",
  "shower", "menu_book", "self_improvement", "directions_walk", "music_note",
];

function Routines() {
  const [state, dispatch] = useFamilyController();
  const { routines, members } = state;
  const { tokens, alpha, gradient, darkMode } = useAppTheme();

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "morning",
    member_id: "",
    steps: [{ title: "", icon: "check_circle", duration_minutes: 5, points_value: 5 }],
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter routines by selected member
  const filteredRoutines = useMemo(() => {
    let filtered = routines.filter((r) => r.active !== false);
    if (selectedMemberId) {
      filtered = filtered.filter((r) => r.member_id === selectedMemberId);
    }
    return filtered.sort((a, b) => {
      const typeOrder = { morning: 0, afternoon: 1, bedtime: 2, custom: 3 };
      return (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
    });
  }, [routines, selectedMemberId]);

  // Compute stats
  const stats = useMemo(() => {
    let totalSteps = 0;
    let completedSteps = 0;
    let totalPoints = 0;
    filteredRoutines.forEach((r) => {
      (r.steps || []).forEach((s) => {
        totalSteps++;
        const done = (s.completions || []).some(
          (c) => c.completed_date === todayStr
        );
        if (done) {
          completedSteps++;
          totalPoints += s.points_value || 5;
        }
      });
    });
    const routinesComplete = filteredRoutines.filter((r) => {
      const steps = r.steps || [];
      return steps.length > 0 && steps.every((s) =>
        (s.completions || []).some((c) => c.completed_date === todayStr)
      );
    }).length;
    return {
      totalSteps,
      completedSteps,
      totalPoints,
      routinesComplete,
      progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };
  }, [filteredRoutines, todayStr]);

  const getTypeConfig = (type) => ROUTINE_TYPES.find((t) => t.value === type) || ROUTINE_TYPES[3];

  const isStepCompleted = useCallback((step) => {
    return (step.completions || []).some((c) => c.completed_date === todayStr);
  }, [todayStr]);

  const handleCompleteStep = useCallback((stepId, memberId) => {
    dispatch({
      type: "COMPLETE_ROUTINE_STEP",
      value: { routine_step_id: stepId, member_id: memberId },
    });
  }, [dispatch]);

  const handleUncompleteStep = useCallback((stepId, memberId) => {
    dispatch({
      type: "UNCOMPLETE_ROUTINE_STEP",
      value: { routine_step_id: stepId, member_id: memberId },
    });
  }, [dispatch]);

  const handleOpenAdd = () => {
    setEditingRoutine(null);
    setForm({
      name: "",
      type: "morning",
      member_id: members[0]?.id || "",
      steps: [{ title: "", icon: "check_circle", duration_minutes: 5, points_value: 5 }],
    });
    setPanelOpen(true);
  };

  const handleOpenEdit = (routine) => {
    setEditingRoutine(routine);
    setForm({
      name: routine.name,
      type: routine.type,
      member_id: routine.member_id,
      steps: (routine.steps || []).map((s) => ({
        id: s.id,
        title: s.title,
        icon: s.icon || "check_circle",
        duration_minutes: s.duration_minutes || 5,
        points_value: s.points_value || 5,
      })),
    });
    setPanelOpen(true);
  };

  const handleAddStep = () => {
    setForm({
      ...form,
      steps: [...form.steps, { title: "", icon: "check_circle", duration_minutes: 5, points_value: 5 }],
    });
  };

  const handleRemoveStep = (idx) => {
    if (form.steps.length <= 1) return;
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });
  };

  const handleUpdateStep = (idx, field, value) => {
    const steps = [...form.steps];
    steps[idx] = { ...steps[idx], [field]: value };
    setForm({ ...form, steps });
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.member_id) return;
    const validSteps = form.steps.filter((s) => s.title.trim());
    if (validSteps.length === 0) return;

    const typeConfig = getTypeConfig(form.type);

    if (editingRoutine) {
      dispatch({
        type: "UPDATE_ROUTINE",
        value: {
          id: editingRoutine.id,
          name: form.name.trim(),
          type: form.type,
          member_id: form.member_id,
          icon: typeConfig.icon,
        },
      });
      // For simplicity, we don't rewrite steps on edit — just update the routine metadata
    } else {
      const routineId = `routine-${Date.now()}`;
      dispatch({
        type: "ADD_ROUTINE",
        value: {
          id: routineId,
          family_id: state.family.id,
          name: form.name.trim(),
          type: form.type,
          member_id: form.member_id,
          icon: typeConfig.icon,
          sort_order: routines.length,
          active: true,
          steps: validSteps.map((s, idx) => ({
            id: `step-${Date.now()}-${idx}`,
            routine_id: routineId,
            title: s.title.trim(),
            icon: s.icon || "check_circle",
            duration_minutes: s.duration_minutes || 5,
            points_value: s.points_value || 5,
            sort_order: idx,
            completions: [],
          })),
        },
      });
    }

    setPanelOpen(false);
  };

  const handleDelete = (routineId) => {
    dispatch({ type: "REMOVE_ROUTINE", value: routineId });
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
                  width: 40, height: 40, borderRadius: "12px",
                  background: darkMode ? alpha(tokens.accent.main, 0.15) : alpha(tokens.accent.main, 0.08),
                  display: "flex", alignItems: "center", justifyContent: "center",
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
                  width: 40, height: 40, borderRadius: "12px",
                  background: darkMode ? alpha("#22c55e", 0.15) : alpha("#22c55e", 0.08),
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon sx={{ fontSize: "1.25rem", color: "#22c55e" }}>check_circle</Icon>
              </Box>
              <Box flex={1}>
                <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                  {stats.completedSteps}/{stats.totalSteps}
                </Typography>
                <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                  Steps Done
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
                  width: 40, height: 40, borderRadius: "12px",
                  background: darkMode ? alpha("#8b5cf6", 0.15) : alpha("#8b5cf6", 0.08),
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon sx={{ fontSize: "1.25rem", color: "#8b5cf6" }}>playlist_add_check</Icon>
              </Box>
              <Box flex={1}>
                <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                  {stats.routinesComplete}
                </Typography>
                <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                  Routines Done
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
                  width: 40, height: 40, borderRadius: "12px",
                  background: darkMode ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon sx={{ fontSize: "1.25rem", color: "#fbbf24" }}>star</Icon>
              </Box>
              <Box flex={1}>
                <Typography variant="h5" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                  {stats.totalPoints}
                </Typography>
                <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                  Points Earned
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Member Filter Chips */}
      <GlassCard sx={{ mb: 3 }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          <Typography fontSize="0.85rem" fontWeight={600} color={darkMode ? "#fff" : "#1a1a1a"} mr={1}>
            <Icon sx={{ fontSize: "1.2rem !important", verticalAlign: "middle", mr: 0.5 }}>filter_list</Icon>
            Filter
          </Typography>
          <Chip
            label="All"
            size="small"
            onClick={() => setSelectedMemberId(null)}
            sx={{
              background: !selectedMemberId
                ? darkMode ? alpha(tokens.accent.main, 0.2) : alpha(tokens.accent.main, 0.1)
                : darkMode ? alpha("#fff", 0.05) : "#f1f5f9",
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
                  sx={{ width: 24, height: 24, bgcolor: member.avatar_color, fontSize: "0.75rem" }}
                >
                  {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                </Avatar>
              }
              label={member.name}
              size="small"
              onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
              sx={{
                background: selectedMemberId === member.id
                  ? darkMode ? alpha(tokens.accent.main, 0.2) : alpha(tokens.accent.main, 0.1)
                  : darkMode ? alpha("#fff", 0.05) : "#f1f5f9",
                color: selectedMemberId === member.id ? (darkMode ? tokens.accent.light : tokens.accent.main) : "inherit",
                fontWeight: selectedMemberId === member.id ? 600 : 400,
                borderRadius: "19px",
                touchAction: "manipulation",
              }}
            />
          ))}
        </Box>
      </GlassCard>

      {/* Routine Cards */}
      <AnimatePresence mode="popLayout">
        {filteredRoutines.map((routine, idx) => {
          const member = members.find((m) => m.id === routine.member_id);
          const typeConfig = getTypeConfig(routine.type);
          const steps = routine.steps || [];
          const completedCount = steps.filter((s) => isStepCompleted(s)).length;
          const totalCount = steps.length;
          const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isAllDone = totalCount > 0 && completedCount === totalCount;
          const routinePoints = steps.reduce((sum, s) => {
            const done = isStepCompleted(s);
            return sum + (done ? (s.points_value || 5) : 0);
          }, 0);

          return (
            <motion.div
              key={routine.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <GlassCard
                sx={{
                  mb: 2,
                  borderLeft: member ? `4px solid ${member.avatar_color}` : `4px solid ${typeConfig.color}`,
                  ...(isAllDone && {
                    borderLeft: `4px solid #22c55e`,
                  }),
                }}
              >
                {/* Routine Header */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: "12px",
                      background: isAllDone
                        ? darkMode ? alpha("#22c55e", 0.15) : alpha("#22c55e", 0.08)
                        : darkMode ? alpha(typeConfig.color, 0.15) : alpha(typeConfig.color, 0.08),
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon sx={{ fontSize: "1.2rem !important", color: isAllDone ? "#22c55e" : typeConfig.color }}>
                      {isAllDone ? "celebration" : typeConfig.icon}
                    </Icon>
                  </Box>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontWeight={700} fontSize="1.1rem" color={darkMode ? "#fff" : "#1a1a1a"}>
                        {routine.name}
                      </Typography>
                      <Chip
                        label={typeConfig.label}
                        size="small"
                        sx={{
                          height: "22px", fontSize: "0.65rem", fontWeight: 700,
                          borderRadius: "8px",
                          bgcolor: alpha(typeConfig.color, 0.12),
                          color: typeConfig.color,
                        }}
                      />
                    </Box>
                    {member && (
                      <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                        <Avatar
                          src={member.avatar_url}
                          sx={{ width: 18, height: 18, bgcolor: member.avatar_color, fontSize: "0.6rem" }}
                        >
                          {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                        </Avatar>
                        <Typography fontSize="0.78rem" color={darkMode ? "rgba(255,255,255,0.6)" : "text.secondary"}>
                          {member.name}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {routinePoints > 0 && (
                      <Box
                        sx={{
                          background: darkMode ? alpha("#fbbf24", 0.15) : alpha("#fbbf24", 0.08),
                          borderRadius: "12px", px: 1.5, py: 0.25,
                          fontSize: "0.78rem", fontWeight: 700,
                          color: "#fbbf24",
                        }}
                      >
                        +{routinePoints}pt
                      </Box>
                    )}
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenEdit(routine)}
                        sx={{ color: darkMode ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
                      >
                        <Icon sx={{ fontSize: "1.2rem !important" }}>edit</Icon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(routine.id)}
                        sx={{ color: tokens.priority?.high || "#ef4444" }}
                      >
                        <Icon sx={{ fontSize: "1.2rem !important" }}>delete</Icon>
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      flex: 1, height: 8, borderRadius: 4,
                      bgcolor: darkMode ? alpha("#fff", 0.08) : alpha("#000", 0.04),
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        background: isAllDone
                          ? "linear-gradient(135deg, #22c55e 0%, #4ade80 100%)"
                          : gradient("primary"),
                      },
                    }}
                  />
                  <Typography fontSize="0.78rem" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
                    {completedCount}/{totalCount}
                  </Typography>
                </Box>

                {/* Steps */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {steps.map((step, sIdx) => {
                    const done = isStepCompleted(step);
                    return (
                      <motion.div
                        key={step.id}
                        initial={false}
                        animate={done ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <Box
                          onClick={() => {
                            if (member) {
                              if (done) {
                                handleUncompleteStep(step.id, member.id);
                              } else {
                                handleCompleteStep(step.id, member.id);
                              }
                            }
                          }}
                          sx={{
                            display: "flex", alignItems: "center", gap: 1.5,
                            p: 1.5, borderRadius: "12px",
                            cursor: member ? "pointer" : "default",
                            touchAction: "manipulation",
                            bgcolor: done
                              ? darkMode ? alpha("#22c55e", 0.08) : alpha("#22c55e", 0.04)
                              : darkMode ? alpha("#fff", 0.03) : alpha("#000", 0.01),
                            border: "1px solid",
                            borderColor: done
                              ? darkMode ? alpha("#22c55e", 0.2) : alpha("#22c55e", 0.15)
                              : darkMode ? alpha("#fff", 0.06) : alpha("#000", 0.04),
                            transition: "all 0.2s ease",
                            "&:hover": member ? {
                              bgcolor: done
                                ? darkMode ? alpha("#22c55e", 0.12) : alpha("#22c55e", 0.08)
                                : darkMode ? alpha("#fff", 0.05) : alpha("#000", 0.02),
                              transform: "translateY(-1px)",
                            } : {},
                            "&:active": member ? { transform: "scale(0.97)" } : {},
                          }}
                        >
                          {/* Step Number / Check */}
                          <Box
                            sx={{
                              width: 32, height: 32, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              bgcolor: done
                                ? "#22c55e"
                                : darkMode ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                              transition: "all 0.2s ease",
                            }}
                          >
                            {done ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              >
                                <Icon sx={{ fontSize: "1.2rem !important", color: "#fff" }}>check</Icon>
                              </motion.div>
                            ) : (
                              <Typography fontSize="0.75rem" fontWeight={700} color={darkMode ? "rgba(255,255,255,0.5)" : "#94a3b8"}>
                                {sIdx + 1}
                              </Typography>
                            )}
                          </Box>

                          {/* Step Icon */}
                          <Icon sx={{
                            fontSize: "1.2rem !important",
                            color: done ? "#22c55e" : darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8",
                          }}>
                            {step.icon || "check_circle"}
                          </Icon>

                          {/* Step Title */}
                          <Box flex={1}>
                            <Typography
                              fontSize="0.9rem"
                              fontWeight={done ? 600 : 500}
                              color={darkMode ? "#fff" : "#1a1a1a"}
                              sx={{
                                textDecoration: done ? "line-through" : "none",
                                opacity: done ? 0.7 : 1,
                              }}
                            >
                              {step.title}
                            </Typography>
                          </Box>

                          {/* Duration + Points */}
                          <Box display="flex" alignItems="center" gap={1}>
                            {step.duration_minutes > 0 && (
                              <Typography fontSize="0.7rem" color={darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8"}>
                                {step.duration_minutes}m
                              </Typography>
                            )}
                            <Box
                              sx={{
                                background: done
                                  ? darkMode ? alpha("#22c55e", 0.15) : alpha("#22c55e", 0.08)
                                  : darkMode ? alpha("#fff", 0.06) : alpha("#000", 0.04),
                                borderRadius: "8px", px: 1, py: 0.25,
                                fontSize: "0.7rem", fontWeight: 600,
                                color: done ? "#22c55e" : darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8",
                              }}
                            >
                              {step.points_value || 5}pt
                            </Box>
                          </Box>
                        </Box>
                      </motion.div>
                    );
                  })}
                </Box>

                {/* All Done Celebration */}
                {isAllDone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                  >
                    <Box
                      sx={{
                        mt: 2, py: 1.5, borderRadius: "12px",
                        background: darkMode
                          ? "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(74,222,128,0.1) 100%)"
                          : "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(74,222,128,0.04) 100%)",
                        border: `1px solid ${alpha("#22c55e", darkMode ? 0.25 : 0.15)}`,
                        textAlign: "center",
                      }}
                    >
                      <Typography fontSize="1.3rem" mb={0.5}>
                        {String.fromCodePoint(0x1F389)}
                      </Typography>
                      <Typography fontSize="0.9rem" fontWeight={700} color="#22c55e">
                        All done! Great job!
                      </Typography>
                      <Typography fontSize="0.75rem" color={darkMode ? "rgba(255,255,255,0.5)" : "text.secondary"}>
                        +{steps.reduce((sum, s) => sum + (s.points_value || 5), 0)} points earned
                      </Typography>
                    </Box>
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty State */}
      {filteredRoutines.length === 0 && (
        <GlassCard>
          <Box py={6} textAlign="center">
            <Icon
              sx={{
                fontSize: "4rem",
                color: darkMode ? alpha("#fff", 0.2) : "#cbd5e1",
                mb: 2,
              }}
            >
              playlist_add_check
            </Icon>
            <Typography
              variant="h6" fontWeight={600}
              color={darkMode ? alpha("#fff", 0.5) : "text.secondary"} mb={1}
            >
              No routines yet
            </Typography>
            <Typography fontSize="0.9rem" color={darkMode ? alpha("#fff", 0.4) : "text.secondary"}>
              Create morning or bedtime routines to help your family stay on track
            </Typography>
          </Box>
        </GlassCard>
      )}

      {/* Add Routine FAB */}
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
        onClick={handleOpenAdd}
      >
        <Icon>add</Icon>
      </Fab>

      {/* Add/Edit Routine Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingRoutine ? "Edit Routine" : "New Routine"}
        subtitle={editingRoutine ? "Update routine details" : "Create a step-by-step routine"}
        icon="playlist_add_check"
        width={520}
        actions={
          <>
            <Button
              variant="outlined"
              onClick={() => setPanelOpen(false)}
              sx={{ borderRadius: "12px", px: 3 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!form.name.trim() || !form.member_id || !form.steps.some((s) => s.title.trim())}
              sx={{
                borderRadius: "12px", px: 3,
                background: gradient("primary"),
                "&:hover": { background: gradient("primary"), filter: "brightness(0.95)" },
              }}
            >
              {editingRoutine ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <TextField
          fullWidth
          label="Routine Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
          placeholder="e.g. Morning Routine"
        />
        <TextField
          fullWidth
          select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {ROUTINE_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              <Box display="flex" alignItems="center" gap={1}>
                <Icon sx={{ fontSize: "1.2rem !important", color: t.color }}>{t.icon}</Icon>
                {t.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          select
          label="Assign To"
          value={form.member_id}
          onChange={(e) => setForm({ ...form, member_id: e.target.value })}
        >
          {members.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar
                  src={member.avatar_url}
                  sx={{ width: 24, height: 24, bgcolor: member.avatar_color, fontSize: "0.75rem" }}
                >
                  {!member.avatar_url && (member.avatar_emoji || member.name[0])}
                </Avatar>
                {member.name}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* Steps */}
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography fontSize="0.85rem" fontWeight={700} color={darkMode ? "#fff" : "#1a1a1a"}>
              Steps
            </Typography>
            <Button
              size="small"
              startIcon={<Icon sx={{ fontSize: "1.2rem !important" }}>add</Icon>}
              onClick={handleAddStep}
              sx={{ color: tokens.accent.main, fontSize: "0.78rem", textTransform: "none" }}
            >
              Add Step
            </Button>
          </Box>
          {form.steps.map((step, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex", gap: 1, alignItems: "center", mb: 1.5,
                p: 1.5, borderRadius: "12px",
                bgcolor: darkMode ? alpha("#fff", 0.03) : alpha("#000", 0.01),
                border: "1px solid",
                borderColor: darkMode ? alpha("#fff", 0.06) : alpha("#000", 0.04),
              }}
            >
              <Typography fontSize="0.75rem" fontWeight={700} color={darkMode ? "rgba(255,255,255,0.4)" : "#94a3b8"} sx={{ width: 20 }}>
                {idx + 1}
              </Typography>
              <TextField
                size="small"
                placeholder="Step title"
                value={step.title}
                onChange={(e) => handleUpdateStep(idx, "title", e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                select
                value={step.icon}
                onChange={(e) => handleUpdateStep(idx, "icon", e.target.value)}
                sx={{ width: 80 }}
              >
                {DEFAULT_STEP_ICONS.map((ic) => (
                  <MenuItem key={ic} value={ic}>
                    <Icon sx={{ fontSize: "1.2rem !important" }}>{ic}</Icon>
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label="Min"
                value={step.duration_minutes}
                onChange={(e) => handleUpdateStep(idx, "duration_minutes", parseInt(e.target.value, 10) || 0)}
                sx={{ width: 65 }}
                inputProps={{ min: 0, max: 60 }}
              />
              <TextField
                size="small"
                type="number"
                label="Pts"
                value={step.points_value}
                onChange={(e) => handleUpdateStep(idx, "points_value", parseInt(e.target.value, 10) || 0)}
                sx={{ width: 60 }}
                inputProps={{ min: 0, max: 50 }}
              />
              {form.steps.length > 1 && (
                <IconButton size="small" onClick={() => handleRemoveStep(idx)} sx={{ color: tokens.priority?.high || "#ef4444" }}>
                  <Icon sx={{ fontSize: "1.2rem !important" }}>close</Icon>
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      </SlidePanel>
    </PageShell>
  );
}

export default Routines;
