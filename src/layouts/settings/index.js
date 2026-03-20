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
import Slider from "@mui/material/Slider";
import GlassCard from "components/GlassCard";
import Avatar from "@mui/material/Avatar";
import { useFamilyController } from "context/FamilyContext";
import { useThemeMode } from "context/ThemeContext";
import { useAuth } from "context/AuthContext";
import { getGoogleClientId, setGoogleClientId as saveGoogleClientId } from "lib/googleCalendar";
import { uploadPhoto, deletePhoto } from "lib/supabase";

function Settings() {
  const [state, dispatch] = useFamilyController();
  const { family, isSupabaseConnected, photos } = state;
  const { darkMode, setMode: setDarkModeValue } = useThemeMode();
  const { user, signOut } = useAuth();

  const [familyName, setFamilyName] = useState(family.name);
  const [googleClientId, setGoogleClientId] = useState(getGoogleClientId() || family.google_client_id || "");
  const [showClientId, setShowClientId] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [animations, setAnimations] = useState(() => {
    const stored = localStorage.getItem("famcal_animations");
    return stored === null ? true : stored === "true";
  });
  const [touchOptimized, setTouchOptimized] = useState(() => {
    const stored = localStorage.getItem("famcal_touch_mode");
    return stored === null ? true : stored === "true";
  });
  const [kioskEnabled, setKioskEnabled] = useState(
    localStorage.getItem("famcal_kiosk") === "true"
  );
  const [idleTimeout, setIdleTimeout] = useState(
    parseInt(localStorage.getItem("famcal_idle_timeout") || "5")
  );
  const [fontScale, setFontScale] = useState(
    parseFloat(localStorage.getItem("famcal_font_scale") || "1.0")
  );

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

  const handleKioskToggle = () => {
    const next = !kioskEnabled;
    setKioskEnabled(next);
    localStorage.setItem("famcal_kiosk", String(next));
  };

  const handleIdleTimeoutChange = (e, newValue) => {
    setIdleTimeout(newValue);
    localStorage.setItem("famcal_idle_timeout", String(newValue));
  };

  const handleFontScaleChange = (e, newValue) => {
    setFontScale(newValue);
    localStorage.setItem("famcal_font_scale", String(newValue));
  };

  // Compress image before upload
  const compressImage = async (file, maxWidth = 1920, maxHeight = 1080) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, "image/jpeg", 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoUpload = async (e) => {
    if (!isSupabaseConnected) {
      alert("Supabase not connected. Please configure Supabase in Settings.");
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (photos.length + files.length > 100) {
      alert(`Maximum 100 photos allowed. You have ${photos.length} photos. Remove some before uploading more.`);
      return;
    }

    setUploading(true);

    for (const file of files) {
      try {
        // Validate file type
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          alert(`${file.name}: Invalid file type. Only JPEG, PNG, and WebP are supported.`);
          continue;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}: File too large. Maximum size is 5MB.`);
          continue;
        }

        // Compress image
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, { type: "image/jpeg" });

        // Upload to Supabase
        const photo = await uploadPhoto(family.id, compressedFile, "");
        dispatch({ type: "ADD_PHOTO", value: photo });
      } catch (err) {
        console.error("Failed to upload photo:", err);
        alert(`${file.name}: Upload failed. ${err.message}`);
      }
    }

    setUploading(false);
    e.target.value = ""; // Reset input
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm("Delete this photo?")) return;

    try {
      if (isSupabaseConnected) {
        await deletePhoto(photo);
      }
      dispatch({ type: "REMOVE_PHOTO", value: photo.id });
    } catch (err) {
      console.error("Failed to delete photo:", err);
      alert("Failed to delete photo. Please try again.");
    }
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

        {/* Weather Settings */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.4}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>wb_sunny</Icon>
              <Typography variant="h6" fontWeight="bold">Weather</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Set your location to see weather in the header.
            </Typography>
            <TextField
              fullWidth
              label="City or Location"
              placeholder="e.g., San Francisco, CA"
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Requires REACT_APP_WEATHER_API_KEY environment variable
            </Typography>
          </GlassCard>
        </Grid>

        {/* Kiosk Mode */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.5}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>fullscreen</Icon>
              <Typography variant="h6" fontWeight="bold">Kiosk Mode</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Optimize for wall-mounted displays.
            </Typography>

            <FormControlLabel
              control={<Switch checked={kioskEnabled} onChange={handleKioskToggle} />}
              label="Enable Kiosk Mode"
              sx={{ display: "flex", mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Idle Timeout</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  {idleTimeout} min
                </Typography>
              </Box>
              <Slider
                value={idleTimeout}
                onChange={handleIdleTimeoutChange}
                min={1}
                max={30}
                step={1}
                marks={[
                  { value: 1, label: "1m" },
                  { value: 15, label: "15m" },
                  { value: 30, label: "30m" },
                ]}
                valueLabelDisplay="auto"
                disabled={!kioskEnabled}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Font Scale</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  {Math.round(fontScale * 100)}%
                </Typography>
              </Box>
              <Slider
                value={fontScale}
                onChange={handleFontScaleChange}
                min={1.0}
                max={1.5}
                step={0.05}
                marks={[
                  { value: 1.0, label: "100%" },
                  { value: 1.25, label: "125%" },
                  { value: 1.5, label: "150%" },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                disabled={!kioskEnabled}
              />
            </Box>

            {/* Browser support warnings */}
            {!document.documentElement.requestFullscreen && (
              <Box
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  p: 1.5,
                  mt: 2,
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Icon sx={{ color: "warning.main", fontSize: "1.2rem" }}>info</Icon>
                  <Typography variant="caption" color="warning.main">
                    Fullscreen not supported. For best experience, add to Home Screen.
                  </Typography>
                </Box>
              </Box>
            )}
            {!("wakeLock" in navigator) && (
              <Box
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  p: 1.5,
                  mt: 2,
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Icon sx={{ color: "warning.main", fontSize: "1.2rem" }}>info</Icon>
                  <Typography variant="caption" color="warning.main">
                    Wake lock not available. Your device may sleep during use.
                  </Typography>
                </Box>
              </Box>
            )}
          </GlassCard>
        </Grid>

        {/* Photo Frame */}
        <Grid item xs={12}>
          <GlassCard delay={0.6}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>photo_library</Icon>
              <Typography variant="h6" fontWeight="bold">Photo Frame</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Display family photos when the screen is idle. Upload photos to create a slideshow.
            </Typography>

            {/* Upload area */}
            <Box
              component="label"
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: "16px",
                p: 3,
                cursor: uploading ? "not-allowed" : "pointer",
                mb: 2,
                "&:hover": uploading
                  ? {}
                  : { borderColor: "primary.main", background: "rgba(108,92,231,0.04)" },
                opacity: uploading ? 0.5 : 1,
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              <Icon sx={{ fontSize: "2rem", color: "text.secondary", mb: 1 }}>
                {uploading ? "hourglass_empty" : "add_photo_alternate"}
              </Icon>
              <Typography variant="body2" color="text.secondary">
                {uploading ? "Uploading..." : "Click to upload photos"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPEG, PNG, WebP · Max 5MB · {photos.length}/100
              </Typography>
            </Box>

            {/* Photo grid */}
            {photos.length > 0 && (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1 }}>
                {photos.map((photo) => (
                  <Box
                    key={photo.id}
                    sx={{
                      position: "relative",
                      paddingTop: "100%",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      component="img"
                      src={photo.url}
                      alt={photo.caption || "Family photo"}
                      sx={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <IconButton
                      onClick={() => handleDeletePhoto(photo)}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        p: 0.5,
                        "&:hover": { background: "rgba(220,38,38,0.8)" },
                      }}
                      size="small"
                    >
                      <Icon sx={{ fontSize: "1rem" }}>close</Icon>
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {photos.length === 0 && !uploading && (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                No photos uploaded yet
              </Typography>
            )}
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Settings;
