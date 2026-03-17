import { useState, useRef, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { motion } from "framer-motion";
import GlassCard from "components/GlassCard";
import { useFamilyController, MEMBER_COLORS } from "context/FamilyContext";
import { connectMemberCalendar, disconnectMemberCalendar } from "lib/googleCalendar";
import { uploadAvatar } from "lib/supabase";

const LEVEL_TITLES = [
  "",
  "Beginner",
  "Novice",
  "Learner",
  "Rising Star",
  "Achiever",
  "Expert",
  "Master",
  "Champion",
  "Legend",
  "Supreme",
];

function getLevelTitle(level) {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)] || "Supreme";
}

function Family() {
  const [state, dispatch] = useFamilyController();
  const { family, members, tasks } = state;
  const isSmall = useMediaQuery("(max-width:599px)");

  const [openDialog, setOpenDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    avatar_color: MEMBER_COLORS[0].value,
    avatar_emoji: "",
    google_calendar_id: "",
    avatar_url: "",
    birth_date: "",
  });

  // --- Helpers ---

  const getMemberStats = useMemo(() => {
    const statsMap = {};
    members.forEach((member) => {
      const memberTasks = tasks.filter((t) => t.assigned_to === member.id);
      const completed = memberTasks.filter((t) => t.completed).length;
      statsMap[member.id] = { completed };
    });
    return statsMap;
  }, [members, tasks]);

  // --- Dialog handlers ---

  const openAddDialog = () => {
    setEditingMember(null);
    const usedColors = members.map((m) => m.avatar_color);
    const nextColor =
      MEMBER_COLORS.find((c) => !usedColors.includes(c.value))?.value || MEMBER_COLORS[0].value;
    const nextEmoji = "";
    setFormData({
      name: "",
      avatar_color: nextColor,
      avatar_emoji: "",
      google_calendar_id: "",
      avatar_url: "",
      birth_date: "",
    });
    setOpenDialog(true);
  };

  const openEditDialog = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      avatar_color: member.avatar_color,
      avatar_emoji: member.avatar_emoji || "",
      google_calendar_id: member.google_calendar_id || "",
      birth_date: member.birth_date || "",
      avatar_url: member.avatar_url || "",
    });
    setOpenDialog(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    if (editingMember && !editingMember.id.startsWith("member-")) {
      setUploading(true);
      try {
        const url = await uploadAvatar(editingMember.id, file);
        setFormData((prev) => ({ ...prev, avatar_url: url }));
      } catch (err) {
        console.warn("Upload failed:", err.message);
      }
      setUploading(false);
    } else {
      const reader = new FileReader();
      reader.onload = () =>
        setFormData((prev) => ({ ...prev, avatar_url: reader.result, _pendingFile: file }));
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    const { _pendingFile, ...cleanData } = formData;

    if (editingMember) {
      dispatch({
        type: "UPDATE_MEMBER",
        value: { id: editingMember.id, ...cleanData },
      });
    } else {
      const tempId = `member-${Date.now()}`;
      dispatch({
        type: "ADD_MEMBER",
        value: {
          id: tempId,
          family_id: state.family.id,
          ...cleanData,
          points: 0,
          level: 1,
          streak_days: 0,
          visible: true,
        },
      });

      if (_pendingFile && state.isSupabaseConnected) {
        setTimeout(async () => {
          const currentMembers = state.members;
          const newMember = currentMembers.find(
            (m) => m.name === cleanData.name && !m.id.startsWith("member-")
          );
          if (newMember) {
            try {
              const url = await uploadAvatar(newMember.id, _pendingFile);
              dispatch({ type: "UPDATE_MEMBER", value: { id: newMember.id, avatar_url: url } });
            } catch (err) {
              console.warn("Post-save upload failed:", err.message);
            }
          }
        }, 1500);
      }
    }
    setOpenDialog(false);
  };

  const handleRemove = (memberId) => {
    dispatch({ type: "REMOVE_MEMBER", value: memberId });
    setDeleteDialog(null);
  };

  const handleConnect = async (member) => {
    setConnectingId(member.id);
    try {
      const result = await connectMemberCalendar(member.id);
      dispatch({
        type: "UPDATE_MEMBER",
        value: { id: member.id, google_calendar_id: result.calendarId },
      });
    } catch (err) {
      console.warn("Connect failed:", err.message);
    }
    setConnectingId(null);
  };

  const handleDisconnect = (member) => {
    disconnectMemberCalendar(member.id);
    dispatch({
      type: "UPDATE_MEMBER",
      value: { id: member.id, google_calendar_id: "" },
    });
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2.5, md: 3.5 } }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: "text.primary" }}>
          Family
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {members.length} member{members.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Member Cards Grid */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        {members.map((member, index) => {
          const level = Math.floor(member.points / 100) + 1;
          const levelTitle = getLevelTitle(level);
          const levelProgress = member.points % 100;
          const stats = getMemberStats[member.id] || { completed: 0 };

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
              <GlassCard glow={member.avatar_color} delay={index * 0.1}>
                {/* Avatar */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: member.avatar_color,
                      fontSize: "2.5rem",
                      overflow: "hidden",
                      boxShadow: `0 4px 24px ${member.avatar_color}55`,
                    }}
                  >
                    {member.avatar_url ? (
                      <Box
                        component="img"
                        src={member.avatar_url}
                        alt={member.name}
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Icon sx={{ fontSize: "2.2rem !important", color: "#fff", opacity: 0.85 }}>person</Icon>
                    )}
                  </Box>
                </Box>

                {/* Name + Age */}
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ color: "text.primary", textAlign: "center", mb: 0.25 }}
                >
                  {member.name}
                </Typography>
                {member.birth_date && (
                  <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", display: "block", mb: 0.75 }}>
                    {(() => {
                      const bd = new Date(member.birth_date);
                      const today = new Date();
                      let age = today.getFullYear() - bd.getFullYear();
                      if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
                      return `${age} years old`;
                    })()}
                  </Typography>
                )}

                {/* Level Badge */}
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                  <Chip
                    label={`Lv.${level} ${levelTitle}`}
                    size="small"
                    sx={{
                      backgroundColor: `${member.avatar_color}22`,
                      color: member.avatar_color,
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      border: `1px solid ${member.avatar_color}33`,
                    }}
                  />
                </Box>

                {/* Level Progress Bar */}
                <Box sx={{ px: 1, mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: "0.65rem" }}
                    >
                      {member.points} pts
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: "0.65rem" }}
                    >
                      {100 - levelProgress} to next
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={levelProgress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "action.hover",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 3,
                        backgroundColor: member.avatar_color,
                      },
                    }}
                  />
                </Box>

                {/* Stats Row */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  {/* Points */}
                  <Tooltip title="Total Points">
                    <Box sx={{ textAlign: "center" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Icon sx={{ fontSize: "0.9rem !important", color: "#f59e0b" }}>star</Icon>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: "text.primary" }}
                        >
                          {member.points}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "0.6rem" }}
                      >
                        Points
                      </Typography>
                    </Box>
                  </Tooltip>

                  {/* Streak */}
                  <Tooltip title="Consecutive days completing tasks">
                    <Box sx={{ textAlign: "center" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Icon sx={{ fontSize: "0.9rem !important", color: "#f43f5e" }}>
                          local_fire_department
                        </Icon>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: "text.primary" }}
                        >
                          {member.streak_days}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "0.6rem" }}
                      >
                        Streak
                      </Typography>
                    </Box>
                  </Tooltip>

                  {/* Tasks Done */}
                  <Tooltip title="Completed tasks">
                    <Box sx={{ textAlign: "center" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Icon sx={{ fontSize: "0.9rem !important", color: "#22c55e" }}>
                          check_circle
                        </Icon>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: "text.primary" }}
                        >
                          {stats.completed}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "0.6rem" }}
                      >
                        Done
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>

                {/* Google Calendar Indicator */}
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  {member.google_calendar_id ? (
                    <Chip
                      icon={
                        <Icon sx={{ fontSize: "0.85rem !important", color: "#22c55e !important" }}>
                          check_circle
                        </Icon>
                      }
                      label="Google Connected"
                      size="small"
                      onClick={() => handleDisconnect(member)}
                      sx={{
                        backgroundColor: "rgba(34,197,94,0.12)",
                        color: "#22c55e",
                        fontWeight: 600,
                        fontSize: "0.65rem",
                        border: "1px solid rgba(34,197,94,0.25)",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "rgba(34,197,94,0.2)",
                        },
                      }}
                    />
                  ) : (
                    <Chip
                      icon={
                        <Icon
                          sx={{
                            fontSize: "0.85rem !important",
                            color: "text.disabled",
                          }}
                        >
                          link_off
                        </Icon>
                      }
                      label={connectingId === member.id ? "Connecting..." : "Not Connected"}
                      size="small"
                      onClick={() => handleConnect(member)}
                      disabled={connectingId === member.id}
                      sx={{
                        backgroundColor: "background.paper",
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: "0.65rem",
                        border: "1px solid", borderColor: "divider",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    />
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(member)}
                      sx={{
                        color: "text.secondary",
                        "&:hover": { color: "#7c3aed", backgroundColor: "rgba(124,58,237,0.1)" },
                      }}
                    >
                      <Icon sx={{ fontSize: "1.1rem !important" }}>edit</Icon>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteDialog(member)}
                      sx={{
                        color: "text.secondary",
                        "&:hover": { color: "#f43f5e", backgroundColor: "rgba(244,63,94,0.1)" },
                      }}
                    >
                      <Icon sx={{ fontSize: "1.1rem !important" }}>delete</Icon>
                    </IconButton>
                  </Tooltip>
                </Box>
              </GlassCard>
            </Grid>
          );
        })}
      </Grid>

      {/* Add Member FAB */}
      <Fab
        onClick={openAddDialog}
        sx={{
          position: "fixed",
          bottom: 76,
          right: 20,
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          color: "text.primary",
          "&:hover": {
            background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
          },
          boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
          zIndex: 1000,
        }}
      >
        <Icon>person_add</Icon>
      </Fab>

      {/* Add / Edit Member Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isSmall}
        PaperProps={{
          sx: {
            background: "background.paper",
            border: "1px solid", borderColor: "divider",
            borderRadius: isSmall ? 0 : "24px",
            color: "text.primary",
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: "text.primary" }}>
              {editingMember ? "Edit Member" : "Add Member"}
            </Typography>
            {isSmall && (
              <IconButton onClick={() => setOpenDialog(false)} sx={{ color: "text.secondary" }}>
                <Icon>close</Icon>
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Name field */}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                mb: 0.75,
                display: "block",
              }}
            >
              Name
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
              size="small"
              sx={{ mb: 2.5 }}
            />

            {/* Birth Date */}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, mb: 0.75, display: "block" }}
            >
              Birth Date
            </Typography>
            <TextField
              fullWidth
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2.5 }}
            />

            {/* Photo Upload */}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                mb: 1,
                display: "block",
              }}
            >
              Profile Photo
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: formData.avatar_url
                    ? "transparent"
                    : `${formData.avatar_color}20`,
                  border: `2px dashed ${
                    formData.avatar_url
                      ? formData.avatar_color
                      : "action.hover"
                  }`,
                  overflow: "hidden",
                  flexShrink: 0,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { borderColor: formData.avatar_color, opacity: 0.8 },
                }}
              >
                {formData.avatar_url ? (
                  <Box
                    component="img"
                    src={formData.avatar_url}
                    alt="Preview"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Icon sx={{ color: "text.disabled", fontSize: "1.5rem !important" }}>
                    add_a_photo
                  </Icon>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  sx={{
                    color: "text.secondary",
                    borderColor: "divider",
                    textTransform: "none",
                    mb: 0.5,
                    "&:hover": {
                      borderColor: "text.disabled",
                    },
                  }}
                >
                  <Icon sx={{ fontSize: "1rem !important", mr: 0.5 }}>upload</Icon>
                  {uploading
                    ? "Uploading..."
                    : formData.avatar_url
                    ? "Change Photo"
                    : "Upload Photo"}
                </Button>
                {formData.avatar_url && (
                  <Button
                    size="small"
                    onClick={() =>
                      setFormData({ ...formData, avatar_url: "", _pendingFile: undefined })
                    }
                    sx={{ color: "#f43f5e", textTransform: "none", ml: 0.5 }}
                  >
                    Remove
                  </Button>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    display: "block",
                    fontSize: "0.6rem",
                    mt: 0.25,
                  }}
                >
                  JPG, PNG up to 5MB
                </Typography>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
            </Box>

            {/* Color Picker */}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                mb: 1,
                display: "block",
              }}
            >
              Color
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
              {MEMBER_COLORS.map((color) => (
                <Box
                  key={color.value}
                  onClick={() => setFormData({ ...formData, avatar_color: color.value })}
                  sx={{
                    width: isSmall ? 36 : 40,
                    height: isSmall ? 36 : 40,
                    borderRadius: "50%",
                    backgroundColor: color.value,
                    cursor: "pointer",
                    border:
                      formData.avatar_color === color.value
                        ? "3px solid currentColor"
                        : "3px solid transparent",
                    boxShadow:
                      formData.avatar_color === color.value
                        ? `0 0 0 3px ${color.value}`
                        : "none",
                    transition: "all 0.2s",
                    touchAction: "manipulation",
                    "&:hover": { transform: "scale(1.15)" },
                  }}
                />
              ))}
            </Box>

            {/* Preview */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: formData.avatar_color,
                  fontSize: "1.8rem",
                  boxShadow: `0 4px 20px ${formData.avatar_color}55`,
                  overflow: "hidden",
                }}
              >
                {formData.avatar_url ? (
                  <Box
                    component="img"
                    src={formData.avatar_url}
                    alt="Preview"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Icon sx={{ fontSize: "1.8rem !important", color: "#fff", opacity: 0.85 }}>person</Icon>
                )}
              </Box>
            </Box>

            {/* Google Calendar ID */}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                mb: 0.75,
                display: "block",
              }}
            >
              Google Calendar ID (optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="example@gmail.com or calendar ID"
              value={formData.google_calendar_id}
              onChange={(e) => setFormData({ ...formData, google_calendar_id: e.target.value })}
              variant="outlined"
              size="small"
            />
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", mt: 0.5, display: "block" }}
            >
              Enter Google Calendar ID to sync events automatically
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {!isSmall && (
            <Button
              variant="outlined"
              onClick={() => setOpenDialog(false)}
              sx={{
                color: "text.secondary",
                borderColor: "divider",
                textTransform: "none",
                borderRadius: "12px",
                "&:hover": { borderColor: "text.disabled" },
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            fullWidth={isSmall}
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              textTransform: "none",
              borderRadius: "12px",
              fontWeight: 600,
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
              },
            }}
          >
            {editingMember ? "Save Changes" : "Add Member"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteDialog)}
        onClose={() => setDeleteDialog(null)}
        PaperProps={{
          sx: {
            background: "background.paper",
            border: "1px solid", borderColor: "divider",
            borderRadius: "20px",
            color: "text.primary",
            p: 1,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold" sx={{ color: "text.primary" }}>
            Remove {deleteDialog?.name}?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            This will remove the member and their associated data. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog(null)}
            sx={{
              color: "text.secondary",
              borderColor: "divider",
              textTransform: "none",
              borderRadius: "12px",
              "&:hover": { borderColor: "text.disabled" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleRemove(deleteDialog?.id)}
            sx={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              textTransform: "none",
              borderRadius: "12px",
              fontWeight: 600,
              "&:hover": {
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              },
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Family;
