import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "components/GlassCard";
import SlidePanel from "components/SlidePanel";
import PageShell from "components/PageShell";
import { useFamilyController } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";

const CATEGORIES = [
  { key: "medical", label: "Medical", icon: "local_hospital", color: "#ef4444" },
  { key: "contact", label: "Contacts", icon: "phone", color: "#3b82f6" },
  { key: "household", label: "Household", icon: "home", color: "#22c55e" },
  { key: "insurance", label: "Insurance", icon: "shield", color: "#8b5cf6" },
];

function getCategoryMeta(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
}

function Emergency() {
  const [state, dispatch] = useFamilyController();
  const { family, members, emergencyInfo } = state;
  const { tokens, gradient, darkMode } = useAppTheme();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [babysitterMode, setBabysitterMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");

  const [form, setForm] = useState({
    category: "medical",
    member_id: "",
    title: "",
    content: "",
    priority: 0,
  });

  const resetForm = useCallback(() => {
    setForm({ category: "medical", member_id: "", title: "", content: "", priority: 0 });
    setEditItem(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setAddOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((item) => {
    setEditItem(item);
    setForm({
      category: item.category,
      member_id: item.member_id || "",
      title: item.title,
      content: item.content,
      priority: item.priority || 0,
    });
    setAddOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editItem) {
      dispatch({
        type: "UPDATE_EMERGENCY_INFO",
        value: { id: editItem.id, ...form, member_id: form.member_id || null },
      });
    } else {
      dispatch({
        type: "ADD_EMERGENCY_INFO",
        value: {
          id: `ei-${Date.now()}`,
          ...form,
          member_id: form.member_id || null,
        },
      });
    }
    setAddOpen(false);
    resetForm();
  }, [form, editItem, dispatch, resetForm]);

  const handleRemove = useCallback((id) => {
    dispatch({ type: "REMOVE_EMERGENCY_INFO", value: id });
  }, [dispatch]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach((c) => { groups[c.key] = []; });
    (emergencyInfo || []).forEach((item) => {
      if (groups[item.category]) groups[item.category].push(item);
      else groups.medical.push(item);
    });
    // Sort by priority within each group
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });
    return groups;
  }, [emergencyInfo]);

  // Per-member medical info
  const memberMedical = useMemo(() => {
    return members.map((m) => ({
      member: m,
      items: (emergencyInfo || []).filter((e) => e.member_id === m.id && e.category === "medical"),
    })).filter((m) => m.items.length > 0);
  }, [members, emergencyInfo]);

  // Babysitter mode toggle
  const handleBabysitterToggle = useCallback(() => {
    if (babysitterMode) {
      setBabysitterMode(false);
      setPinInput("");
      return;
    }
    // If no pin set, prompt to create one
    if (!family.babysitter_pin) {
      setShowPinSetup(true);
      return;
    }
    // Otherwise just enter babysitter mode
    setBabysitterMode(true);
  }, [babysitterMode, family.babysitter_pin]);

  const handlePinSetup = useCallback(() => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) return;
    dispatch({ type: "SET_FAMILY", value: { ...family, babysitter_pin: newPin } });
    setShowPinSetup(false);
    setNewPin("");
    setBabysitterMode(true);
  }, [newPin, family, dispatch]);

  const handlePinExit = useCallback(() => {
    if (pinInput === family.babysitter_pin) {
      setBabysitterMode(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  }, [pinInput, family.babysitter_pin]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const getMemberName = useCallback((memberId) => {
    const m = members.find((mem) => mem.id === memberId);
    return m ? m.name : "Unknown";
  }, [members]);

  return (
    <PageShell>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 2.5, md: 3.5 }, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: "text.primary" }}>
            Emergency Info
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Critical info for babysitters and emergencies
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<Icon sx={{ fontSize: "1.2rem !important" }}>print</Icon>}
            onClick={handlePrint}
            sx={{ borderRadius: "12px", textTransform: "none", borderColor: "divider", color: "text.secondary", touchAction: "manipulation" }}
          >
            Print
          </Button>
          <Button
            variant={babysitterMode ? "contained" : "outlined"}
            startIcon={<Icon sx={{ fontSize: "1.2rem !important" }}>{babysitterMode ? "lock" : "child_care"}</Icon>}
            onClick={handleBabysitterToggle}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              touchAction: "manipulation",
              ...(babysitterMode
                ? {
                    background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                    color: "#fff",
                    "&:hover": { background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" },
                  }
                : {
                    borderColor: "divider",
                    color: "text.secondary",
                  }),
            }}
          >
            {babysitterMode ? "Exit Babysitter Mode" : "Babysitter Mode"}
          </Button>
        </Box>
      </Box>

      {/* Babysitter PIN exit overlay */}
      {babysitterMode && (
        <Box sx={{
          position: "fixed", bottom: 20, right: 20, zIndex: 1300,
          background: tokens.glass.bg, borderRadius: "16px", p: 2,
          border: `1px solid ${tokens.glass.border !== "none" ? tokens.glass.border : "transparent"}`,
          boxShadow: tokens.glass.shadow,
        }}>
          <Typography fontSize="0.78rem" color="text.secondary" sx={{ mb: 1 }}>Enter PIN to exit</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }}
              type="password"
              size="small"
              placeholder="4-digit PIN"
              error={pinError}
              helperText={pinError ? "Wrong PIN" : ""}
              inputProps={{ maxLength: 4, inputMode: "numeric" }}
              sx={{ width: 120 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handlePinExit}
              disabled={pinInput.length !== 4}
              sx={{ borderRadius: "12px", textTransform: "none", background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)" }}
            >
              Unlock
            </Button>
          </Box>
        </Box>
      )}

      {/* PIN setup dialog */}
      {showPinSetup && (
        <Box sx={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1400,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <Box sx={{
              background: darkMode ? "#1a1a2e" : "#fff",
              borderRadius: "20px", p: 4, maxWidth: 340, width: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}>
              <Typography fontWeight={700} fontSize="1.1rem" sx={{ mb: 0.5 }}>Set Babysitter PIN</Typography>
              <Typography fontSize="0.85rem" color="text.secondary" sx={{ mb: 2 }}>
                Create a 4-digit PIN to lock/unlock babysitter mode
              </Typography>
              <TextField
                fullWidth
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                type="password"
                placeholder="Enter 4-digit PIN"
                inputProps={{ maxLength: 4, inputMode: "numeric" }}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={() => { setShowPinSetup(false); setNewPin(""); }}
                  sx={{ borderRadius: "12px", textTransform: "none", borderColor: "divider", color: "text.secondary" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handlePinSetup}
                  disabled={newPin.length !== 4}
                  sx={{
                    borderRadius: "12px", textTransform: "none", fontWeight: 600,
                    background: "linear-gradient(135deg, #6C5CE7 0%, #a78bfa 100%)",
                    "&:hover": { background: "linear-gradient(135deg, #5b4bc4 0%, #9775fa 100%)" },
                  }}
                >
                  Set PIN
                </Button>
              </Box>
            </Box>
          </motion.div>
        </Box>
      )}

      {/* Per-Member Medical Cards */}
      {memberMedical.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography fontWeight={700} fontSize="1.1rem" sx={{ mb: 1.5, color: "text.primary" }}>
            <Icon sx={{ fontSize: "1.2rem !important", verticalAlign: "middle", mr: 0.5, color: "#ef4444" }}>person</Icon>
            Per-Member Medical Info
          </Typography>
          <Grid container spacing={2}>
            {memberMedical.map(({ member, items }) => (
              <Grid item xs={12} sm={6} md={4} key={member.id}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <GlassCard glow={member.avatar_color}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: "50%", bgcolor: member.avatar_color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 4px 14px ${member.avatar_color}44`,
                      }}>
                        {member.avatar_url ? (
                          <Box component="img" src={member.avatar_url} alt={member.name} sx={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <Icon sx={{ fontSize: "1.2rem !important", color: "#fff" }}>person</Icon>
                        )}
                      </Box>
                      <Typography fontWeight={700} fontSize="1rem">{member.name}</Typography>
                    </Box>
                    {items.map((item) => (
                      <Box key={item.id} sx={{ mb: 1, pl: 1, borderLeft: `3px solid ${alpha("#ef4444", 0.4)}`, py: 0.5 }}>
                        <Typography fontWeight={600} fontSize="0.85rem">{item.title}</Typography>
                        <Typography fontSize="0.78rem" color="text.secondary">{item.content}</Typography>
                      </Box>
                    ))}
                  </GlassCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Category Sections */}
      <Grid container spacing={2.5}>
        {CATEGORIES.map((cat, catIdx) => {
          const items = grouped[cat.key] || [];
          return (
            <Grid item xs={12} md={6} key={cat.key}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: catIdx * 0.08 }}>
                <GlassCard>
                  {/* Category Header */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: "12px",
                      background: alpha(cat.color, 0.12),
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon sx={{ fontSize: "1.2rem !important", color: cat.color }}>{cat.icon}</Icon>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700} fontSize="1rem">{cat.label}</Typography>
                      <Typography fontSize="0.7rem" color="text.secondary">{items.length} item{items.length !== 1 ? "s" : ""}</Typography>
                    </Box>
                  </Box>

                  {/* Items */}
                  {items.length === 0 ? (
                    <Typography fontSize="0.85rem" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No {cat.label.toLowerCase()} info yet
                    </Typography>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {items.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25, delay: idx * 0.03 }}
                        >
                          <Box sx={{
                            display: "flex", alignItems: "flex-start", gap: 1.5, py: 1.25,
                            borderBottom: idx < items.length - 1 ? "1px solid" : "none",
                            borderColor: "divider",
                          }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                                <Typography fontWeight={600} fontSize="0.9rem">{item.title}</Typography>
                                {item.priority > 0 && (
                                  <Chip
                                    label="Important"
                                    size="small"
                                    sx={{
                                      height: 18, fontSize: "0.6rem", fontWeight: 700,
                                      bgcolor: alpha(cat.color, 0.12), color: cat.color,
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography fontSize="0.82rem" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                                {item.content}
                              </Typography>
                              {item.member_id && (
                                <Typography fontSize="0.7rem" sx={{ color: alpha(cat.color, 0.8), mt: 0.5 }}>
                                  <Icon sx={{ fontSize: "0.7rem !important", verticalAlign: "middle", mr: 0.25 }}>person</Icon>
                                  {getMemberName(item.member_id)}
                                </Typography>
                              )}
                            </Box>
                            {!babysitterMode && (
                              <Box sx={{ display: "flex", flexShrink: 0, gap: 0.25 }}>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: "text.secondary", "&:hover": { color: tokens.accent.main } }}>
                                    <Icon sx={{ fontSize: "1rem !important" }}>edit</Icon>
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove">
                                  <IconButton size="small" onClick={() => handleRemove(item.id)} sx={{ color: "text.secondary", "&:hover": { color: "#ef4444" } }}>
                                    <Icon sx={{ fontSize: "1rem !important" }}>delete</Icon>
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </GlassCard>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* Add FAB (hidden in babysitter mode) */}
      {!babysitterMode && (
        <Fab
          onClick={openAdd}
          sx={{
            position: "fixed",
            bottom: { xs: 90, md: 28 },
            left: { xs: "50%", md: 28 },
            transform: { xs: "translateX(-50%)", md: "none" },
            right: "auto",
            background: gradient(tokens.accent.main, tokens.accent.light),
            color: "#fff",
            "&:hover": { background: gradient(tokens.accent.dark, tokens.accent.light) },
            boxShadow: `0 8px 32px ${alpha(tokens.accent.main, 0.4)}`,
            zIndex: 1000,
            touchAction: "manipulation",
          }}
        >
          <Icon>add</Icon>
        </Fab>
      )}

      {/* Add / Edit SlidePanel */}
      <SlidePanel
        open={addOpen}
        onClose={() => { setAddOpen(false); resetForm(); }}
        title={editItem ? "Edit Info" : "Add Emergency Info"}
        icon="local_hospital"
        width={480}
        actions={
          <>
            <Button
              variant="outlined"
              onClick={() => { setAddOpen(false); resetForm(); }}
              sx={{ color: "text.secondary", borderColor: "divider", textTransform: "none", borderRadius: "12px" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!form.title.trim() || !form.content.trim()}
              sx={{
                background: gradient(tokens.accent.main, tokens.accent.light),
                color: "#fff", textTransform: "none", borderRadius: "12px", fontWeight: 600,
                "&:hover": { background: gradient(tokens.accent.dark, tokens.accent.light) },
              }}
            >
              {editItem ? "Save Changes" : "Add Info"}
            </Button>
          </>
        }
      >
        {/* Category */}
        <Box>
          <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
            Category
          </Typography>
          <TextField
            select
            fullWidth
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            size="small"
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.key} value={c.key}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Icon sx={{ fontSize: "1.2rem !important", color: c.color }}>{c.icon}</Icon>
                  {c.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Member (optional) */}
        <Box>
          <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
            Member (optional)
          </Typography>
          <TextField
            select
            fullWidth
            value={form.member_id}
            onChange={(e) => setForm({ ...form, member_id: e.target.value })}
            size="small"
          >
            <MenuItem value="">Household (all members)</MenuItem>
            {members.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: m.avatar_color }} />
                  {m.name}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Title */}
        <Box>
          <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
            Title
          </Typography>
          <TextField
            fullWidth
            placeholder="e.g. Peanut Allergy, Dr. Smith, WiFi Password"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            size="small"
          />
        </Box>

        {/* Content */}
        <Box>
          <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
            Details
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Enter details..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            size="small"
          />
        </Box>

        {/* Priority */}
        <Box>
          <Typography variant="caption" fontWeight="bold" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}>
            Priority
          </Typography>
          <TextField
            select
            fullWidth
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            size="small"
          >
            <MenuItem value={0}>Normal</MenuItem>
            <MenuItem value={1}>Important</MenuItem>
            <MenuItem value={2}>Critical</MenuItem>
          </TextField>
        </Box>
      </SlidePanel>
    </PageShell>
  );
}

export default Emergency;
