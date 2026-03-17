import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import GlassCard from "components/GlassCard";
import Avatar from "@mui/material/Avatar";
import { useFamilyController } from "context/FamilyContext";
import { useThemeMode } from "context/ThemeContext";
import { useAuth } from "context/AuthContext";
import { getGoogleClientId, setGoogleClientId as saveGoogleClientId } from "lib/googleCalendar";

function Settings() {
  const [state, dispatch] = useFamilyController();
  const { family, isSupabaseConnected } = state;
  const { darkMode, setMode: setDarkModeValue } = useThemeMode();
  const { user, signOut } = useAuth();

  const [familyName, setFamilyName] = useState(family.name);
  const [googleClientId, setGoogleClientId] = useState(getGoogleClientId() || family.google_client_id || "");
  const [showClientId, setShowClientId] = useState(false);
  const [saved, setSaved] = useState(false);
  const [animations, setAnimations] = useState(() => {
    const stored = localStorage.getItem("famcal_animations");
    return stored === null ? true : stored === "true";
  });
  const [touchOptimized, setTouchOptimized] = useState(() => {
    const stored = localStorage.getItem("famcal_touch_mode");
    return stored === null ? true : stored === "true";
  });

  const handleSaveAll = () => {
    const trimmedClientId = googleClientId.trim();
    // Save family name + google client ID together
    const updates = { ...family, name: familyName.trim() || family.name };
    if (trimmedClientId) {
      updates.google_client_id = trimmedClientId;
      saveGoogleClientId(trimmedClientId);
    }
    dispatch({ type: "SET_FAMILY", value: updates });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAnimationsChange = (e) => {
    setAnimations(e.target.checked);
    localStorage.setItem("famcal_animations", String(e.target.checked));
  };

  const handleTouchOptimizedChange = (e) => {
    setTouchOptimized(e.target.checked);
    localStorage.setItem("famcal_touch_mode", String(e.target.checked));
  };

  const clientIdConfigured = Boolean(getGoogleClientId() || family.google_client_id);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Family + Google Calendar — single card */}
        <Grid item xs={12}>
          <GlassCard delay={0}>
            {/* Family Name */}
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>family_restroom</Icon>
              <Typography variant="h6" fontWeight="bold">Family</Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              label="Family Name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Divider sx={{ my: 2 }} />

            {/* Google Calendar */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Box display="flex" alignItems="center" gap={1}>
                <Icon sx={{ color: "primary.main" }}>event</Icon>
                <Typography variant="h6" fontWeight="bold">Google Calendar</Typography>
              </Box>
              {clientIdConfigured && (
                <Chip label="Configured" size="small" sx={{ bgcolor: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }} />
              )}
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Connect Google Calendar to sync events with family members.
            </Typography>

            <TextField
              fullWidth
              size="small"
              label="OAuth Client ID"
              type={showClientId ? "text" : "password"}
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              placeholder="xxxxx.apps.googleusercontent.com"
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowClientId((p) => !p)} edge="end">
                      <Icon sx={{ fontSize: "1.2rem !important" }}>{showClientId ? "visibility_off" : "visibility"}</Icon>
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Single Save button */}
            <Box display="flex" alignItems="center" gap={1.5}>
              <Button variant="contained" onClick={handleSaveAll} disabled={!familyName.trim()}>
                Save Settings
              </Button>
              {saved && (
                <Chip label="Saved" size="small" sx={{ bgcolor: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }} />
              )}
            </Box>
          </GlassCard>
        </Grid>

        {/* Display & Preferences */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.1}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>palette</Icon>
              <Typography variant="h6" fontWeight="bold">Display</Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={darkMode} onChange={(e) => setDarkModeValue(e.target.checked)} />}
              label="Dark Mode"
              sx={{ display: "flex", mb: 1 }}
            />
            <Divider sx={{ my: 1.5 }} />
            <FormControlLabel
              control={<Switch checked={animations} onChange={handleAnimationsChange} />}
              label="Animations"
              sx={{ display: "flex", mb: 1 }}
            />
            <Divider sx={{ my: 1.5 }} />
            <FormControlLabel
              control={<Switch checked={touchOptimized} onChange={handleTouchOptimizedChange} />}
              label="Touch Optimized"
              sx={{ display: "flex" }}
            />
          </GlassCard>
        </Grid>

        {/* Account */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.2}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>account_circle</Icon>
              <Typography variant="h6" fontWeight="bold">Account</Typography>
            </Box>

            {user && (
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar
                  src={user.picture}
                  alt={user.name}
                  sx={{ width: 48, height: 48 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={600}>{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                </Box>
              </Box>
            )}

            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Icon>logout</Icon>}
              onClick={signOut}
            >
              Sign Out
            </Button>
          </GlassCard>
        </Grid>

        {/* Status */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.3}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>cloud</Icon>
              <Typography variant="h6" fontWeight="bold">Status</Typography>
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="body2" color="text.secondary">Supabase</Typography>
              <Chip
                label={isSupabaseConnected ? "Connected" : "Offline (Local)"}
                size="small"
                sx={{
                  bgcolor: isSupabaseConnected ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                  color: isSupabaseConnected ? "#22c55e" : "#f59e0b",
                  fontWeight: 600,
                }}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Version</Typography>
              <Typography variant="body2" fontWeight="bold">FamCal v2.0</Typography>
            </Box>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Settings;
