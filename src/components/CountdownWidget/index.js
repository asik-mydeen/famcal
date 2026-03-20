import { useState, useEffect } from "react";
import { Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from "@mui/material";
import Icon from "@mui/material/Icon";
import { useThemeMode } from "context/ThemeContext";

// Icon options for countdown selection
const ICON_OPTIONS = [
  { value: "celebration", label: "Celebration" },
  { value: "cake", label: "Birthday" },
  { value: "flight", label: "Travel" },
  { value: "school", label: "School" },
  { value: "beach_access", label: "Beach" },
  { value: "star", label: "Star" },
];

// Color options (matching member colors from design system)
const COLOR_OPTIONS = [
  "#6C5CE7", // Purple
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#FFD93D", // Yellow
  "#95E1D3", // Mint
  "#FF9FF3", // Pink
  "#00B4D8", // Blue
  "#FB8500", // Orange
];

function CountdownWidget({ variant = "sidebar", countdowns = [], members = [], dispatch, familyId }) {
  const { darkMode } = useThemeMode();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCountdown, setNewCountdown] = useState({
    title: "",
    target_date: "",
    icon: "celebration",
    color: "#6C5CE7",
  });

  // Birthday auto-generation
  useEffect(() => {
    if (!members || !familyId || members.length === 0) return;

    const today = new Date();
    const lookAhead = 90; // days

    members.forEach(member => {
      if (!member.birth_date) return;

      const bd = new Date(member.birth_date);
      // Set to this year
      const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      // If already passed this year, check next year
      if (thisYearBd < today) {
        thisYearBd.setFullYear(thisYearBd.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((thisYearBd - today) / 86400000);
      if (daysUntil > lookAhead) return;

      // Check if countdown already exists
      const exists = countdowns.some(c =>
        c.auto_generated &&
        c.title.includes(member.name) &&
        c.target_date === thisYearBd.toISOString().split("T")[0]
      );

      if (!exists) {
        const newCountdown = {
          id: `cd-bday-${member.id}-${thisYearBd.getFullYear()}`,
          family_id: familyId,
          title: `${member.name}'s Birthday`,
          target_date: thisYearBd.toISOString().split("T")[0],
          icon: "cake",
          color: member.avatar_color || "#6C5CE7",
          auto_generated: true,
        };
        dispatch({ type: "ADD_COUNTDOWN", value: newCountdown });
      }
    });
  }, [members, countdowns, familyId, dispatch]);

  const handleDelete = (id) => {
    dispatch({ type: "REMOVE_COUNTDOWN", value: id });
  };

  const handleAdd = () => {
    if (!newCountdown.title || !newCountdown.target_date) return;

    const countdown = {
      id: `cd-${Date.now()}`,
      family_id: familyId,
      title: newCountdown.title,
      target_date: newCountdown.target_date,
      icon: newCountdown.icon,
      color: newCountdown.color,
      auto_generated: false,
    };

    dispatch({ type: "ADD_COUNTDOWN", value: countdown });
    setShowAddDialog(false);
    setNewCountdown({
      title: "",
      target_date: "",
      icon: "celebration",
      color: "#6C5CE7",
    });
  };

  // Header variant - compact pill showing nearest countdown
  if (variant === "header") {
    const nearest = countdowns[0]; // Already sorted by target_date
    if (!nearest) return null;

    const daysLeft = Math.ceil((new Date(nearest.target_date) - new Date()) / 86400000);

    return (
      <Box
        sx={{
          px: 1.75,
          py: 0.75,
          background: darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        <Icon sx={{ fontSize: "0.9rem", color: nearest.color || "#6C5CE7" }}>
          {nearest.icon || "celebration"}
        </Icon>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: nearest.color || "#6C5CE7" }}>
          {nearest.title}
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          {daysLeft}d
        </Typography>
      </Box>
    );
  }

  // Sidebar variant - full list
  return (
    <Box>
      {/* Add countdown button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <IconButton size="small" onClick={() => setShowAddDialog(true)}>
          <Icon sx={{ fontSize: "1rem", color: "text.secondary" }}>add</Icon>
        </IconButton>
      </Box>

      {/* Countdown list */}
      {countdowns.map(cd => {
        const daysLeft = Math.ceil((new Date(cd.target_date) - new Date()) / 86400000);
        return (
          <Box
            key={cd.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 10px",
              background: `${cd.color || "#6C5CE7"}10`,
              borderRadius: "8px",
              mb: 0.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Icon sx={{ fontSize: "1rem", color: cd.color || "#6C5CE7" }}>
                {cd.icon || "celebration"}
              </Icon>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                {cd.title}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: cd.color || "#6C5CE7" }}>
                {daysLeft}d
              </Typography>
              {!cd.auto_generated && (
                <IconButton size="small" onClick={() => handleDelete(cd.id)}>
                  <Icon sx={{ fontSize: "0.8rem" }}>close</Icon>
                </IconButton>
              )}
            </Box>
          </Box>
        );
      })}

      {countdowns.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
          No upcoming countdowns
        </Typography>
      )}

      {/* Add Countdown Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: darkMode
              ? "linear-gradient(135deg, rgba(23,25,35,0.97) 0%, rgba(30,33,48,0.97) 100%)"
              : "#FFFFFF",
          },
        }}
      >
        <DialogTitle>
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
            Add Countdown
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {/* Title */}
            <TextField
              fullWidth
              label="Event Title"
              value={newCountdown.title}
              onChange={(e) => setNewCountdown({ ...newCountdown, title: e.target.value })}
              variant="outlined"
              size="small"
            />

            {/* Date */}
            <TextField
              fullWidth
              label="Target Date"
              type="date"
              value={newCountdown.target_date}
              onChange={(e) => setNewCountdown({ ...newCountdown, target_date: e.target.value })}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            {/* Icon Selector */}
            <Box>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 1, color: "text.secondary" }}>
                Icon
              </Typography>
              <Grid container spacing={1}>
                {ICON_OPTIONS.map(icon => (
                  <Grid item xs={4} key={icon.value}>
                    <Box
                      onClick={() => setNewCountdown({ ...newCountdown, icon: icon.value })}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                        padding: "8px",
                        borderRadius: "8px",
                        border: newCountdown.icon === icon.value ? "2px solid #6C5CE7" : "2px solid transparent",
                        background: newCountdown.icon === icon.value
                          ? darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)"
                          : "transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": {
                          background: darkMode ? "rgba(108,92,231,0.1)" : "rgba(108,92,231,0.05)",
                        },
                      }}
                    >
                      <Icon sx={{ fontSize: "1.2rem", color: newCountdown.icon === icon.value ? "#6C5CE7" : "text.secondary" }}>
                        {icon.value}
                      </Icon>
                      <Typography sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                        {icon.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Color Selector */}
            <Box>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 1, color: "text.secondary" }}>
                Color
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {COLOR_OPTIONS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setNewCountdown({ ...newCountdown, color })}
                    sx={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: color,
                      border: newCountdown.color === color ? "3px solid #FFFFFF" : "2px solid transparent",
                      boxShadow: newCountdown.color === color ? `0 0 0 2px ${color}` : "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Box
            onClick={() => setShowAddDialog(false)}
            sx={{
              px: 2,
              py: 1,
              borderRadius: "12px",
              cursor: "pointer",
              color: "text.secondary",
              fontSize: "0.85rem",
              fontWeight: 600,
              "&:hover": {
                background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              },
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={handleAdd}
            sx={{
              px: 2,
              py: 1,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(108,92,231,0.3)",
              },
            }}
          >
            Add Countdown
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CountdownWidget;
