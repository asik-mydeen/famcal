import { useState, useEffect } from "react";
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
import Slider from "@mui/material/Slider";
import IconButton from "@mui/material/IconButton";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import GlassCard from "components/GlassCard";
import PageShell from "components/PageShell";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import { useFamilyController } from "context/FamilyContext";
import { useAppTheme } from "context/ThemeContext";
import { PRESET_META } from "theme/tokens";
import { useAuth } from "context/AuthContext";
import { getGoogleClientId } from "lib/googleCalendar";
import { connectGooglePhotos, disconnectGooglePhotos, isGooglePhotosConnected, fetchAlbums } from "lib/googlePhotos";
import { uploadPhoto, deletePhoto } from "lib/supabase";

function Settings() {
  const [state, dispatch] = useFamilyController();
  const { family, isSupabaseConnected, photos, ai_preferences, memories } = state;
  const { tokens, alpha, darkMode, setMode: setDarkModeValue, preset, setPreset, presetNames } = useAppTheme();
  const { user, signOut } = useAuth();

  const [familyName, setFamilyName] = useState(family.name);
  const [uploading, setUploading] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState(
    family?.weather_location || localStorage.getItem("famcal_weather_location") || ""
  );
  const [animations, setAnimations] = useState(() => {
    const stored = localStorage.getItem("famcal_animations");
    return stored === null ? true : stored === "true";
  });

  // Font family state
  const [fontFamily, setFontFamily] = useState(
    () => localStorage.getItem("famcal_font_family") || "Inter"
  );

  // Font size state (scale presets)
  const [fontScale, setFontScale] = useState(
    () => parseFloat(localStorage.getItem("famcal_font_scale") || "1.0")
  );

  // Idle timeout for photo frame
  const [idleTimeout, setIdleTimeout] = useState(
    parseInt(localStorage.getItem("famcal_idle_timeout") || "5")
  );

  const [photosConnected, setPhotosConnected] = useState(isGooglePhotosConnected());
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState(() => {
    const stored = localStorage.getItem("famcal_photos_selected_albums");
    return stored ? JSON.parse(stored) : [];
  });
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [photosError, setPhotosError] = useState("");
  const [photoInterval, setPhotoInterval] = useState(() => {
    return parseInt(localStorage.getItem("famcal_photo_interval") || "10");
  });

  // Load albums via serverless proxy (no CORS issues)
  useEffect(() => {
    if (photosConnected) {
      setLoadingAlbums(true);
      setPhotosError("");
      fetchAlbums()
        .then(setAlbums)
        .catch((err) => {
          console.error("[photos]", err.message);
          setPhotosConnected(false);
          setPhotosError(err.message);
        })
        .finally(() => setLoadingAlbums(false));
    }
  }, [photosConnected]);

  // Load albums automatically (uses provider token from sign-in)
  useEffect(() => {
    if (photosConnected) {
      setLoadingAlbums(true);
      setPhotosError("");
      fetchAlbums()
        .then(setAlbums)
        .catch((err) => {
          console.error("[photos]", err.message);
          if (err.message?.includes("API_NOT_ENABLED")) {
            setPhotosConnected(false);
            setPhotosError(
              "The Photos Library API is not enabled in your Google Cloud project. " +
              "Go to Google Cloud Console → APIs & Services → Library → " +
              "search 'Photos Library API' → click Enable. " +
              "Make sure you select the correct project (the one with your OAuth Client ID)."
            );
          } else if (err.message?.includes("SCOPE_ERROR") || err.message?.includes("TOKEN_EXPIRED")) {
            setPhotosConnected(false);
            setPhotosError(
              "Google Photos permission missing. Please sign out and sign in again."
            );
          } else {
            setPhotosError("Failed to load albums: " + err.message);
          }
        })
        .finally(() => setLoadingAlbums(false));
    }
  }, [photosConnected]);

  const handleAnimationsChange = (e) => {
    setAnimations(e.target.checked);
    localStorage.setItem("famcal_animations", String(e.target.checked));
  };

  const [saved, setSaved] = useState(false);

  // AI preferences - with defaults
  const [assistantName, setAssistantName] = useState(ai_preferences?.assistant_name || "Amara");
  const [cuisinePreferences, setCuisinePreferences] = useState(ai_preferences?.cuisine_preferences || "");
  const [dietaryRestrictions, setDietaryRestrictions] = useState(ai_preferences?.dietary_restrictions || "");
  const [tone, setTone] = useState(ai_preferences?.tone || "friendly");
  const [customInstructions, setCustomInstructions] = useState(ai_preferences?.custom_instructions || "");
  const [editingMemory, setEditingMemory] = useState(null);

  // Sync familyName when Supabase data loads
  useEffect(() => {
    if (family.name && family.name !== familyName) {
      setFamilyName(family.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.name]);

  const handleFontFamilyChange = (font) => {
    setFontFamily(font);
    localStorage.setItem("famcal_font_family", font);
    // Notify App.js to rebuild MUI theme with new font
    window.dispatchEvent(new CustomEvent("famcal-font-change", { detail: { fontFamily: font } }));
  };

  const handleFontSizeChange = (scale) => {
    setFontScale(scale);
    localStorage.setItem("famcal_font_scale", String(scale));
    // Notify App.js to update root font size
    window.dispatchEvent(new CustomEvent("famcal-font-change", { detail: { fontScale: scale } }));
  };

  const handleFamilyNameSave = () => {
    const trimmed = familyName.trim();
    if (trimmed) {
      dispatch({ type: "SET_FAMILY", value: { ...family, name: trimmed } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleIdleTimeoutChange = (e, newValue) => {
    setIdleTimeout(newValue);
    localStorage.setItem("famcal_idle_timeout", String(newValue));
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

  // Google Photos handlers
  const handleConnectPhotos = async () => {
    setPhotosError("");
    try {
      await connectGooglePhotos();
      setPhotosConnected(true);
    } catch (err) {
      console.error("Failed to connect Google Photos:", err);
      if (err.message?.includes("SCOPE_ERROR") || err.message?.includes("sign out")) {
        setPhotosError(
          "Google Photos access not available with current sign-in. " +
          "Sign out from the Account section below, then sign in again to grant Photos access."
        );
      } else {
        setPhotosError(err.message);
      }
    }
  };

  const handleDisconnectPhotos = () => {
    disconnectGooglePhotos();
    setPhotosConnected(false);
    setAlbums([]);
    setSelectedAlbumIds([]);
  };

  const toggleAlbum = (albumId) => {
    setSelectedAlbumIds(prev => {
      const next = prev.includes(albumId) ? prev.filter(id => id !== albumId) : [...prev, albumId];
      localStorage.setItem("famcal_photos_selected_albums", JSON.stringify(next));
      return next;
    });
  };

  const handlePhotoIntervalChange = (e, newValue) => {
    setPhotoInterval(newValue);
    localStorage.setItem("famcal_photo_interval", String(newValue));
  };

  const clientIdConfigured = Boolean(getGoogleClientId() || family.google_client_id);

  // AI preferences handlers
  const handleSaveAIPreferences = () => {
    const prefs = {
      assistant_name: assistantName,
      cuisine_preferences: cuisinePreferences,
      dietary_restrictions: dietaryRestrictions,
      tone,
      custom_instructions: customInstructions,
    };

    if (ai_preferences) {
      dispatch({ type: "UPDATE_AI_PREFERENCES", value: prefs });
    } else {
      dispatch({ type: "SET_AI_PREFERENCES", value: prefs });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeleteMemory = (memory) => {
    if (!window.confirm("Delete this memory?")) return;
    dispatch({ type: "REMOVE_MEMORY", value: memory });
  };

  const handleEditMemory = (memory) => {
    setEditingMemory(memory);
  };

  const handleSaveMemoryEdit = () => {
    if (!editingMemory) return;
    dispatch({ type: "UPDATE_MEMORY", value: editingMemory });
    setEditingMemory(null);
  };

  const toneOptions = [
    { key: "friendly", label: "Friendly", icon: "sentiment_satisfied", desc: "Warm & helpful" },
    { key: "professional", label: "Professional", icon: "business_center", desc: "Formal & clear" },
    { key: "casual", label: "Casual", icon: "waving_hand", desc: "Relaxed & fun" },
    { key: "fun", label: "Fun", icon: "celebration", desc: "Playful & energetic" },
  ];

  const fontOptions = [
    { name: "Inter", family: "Inter", style: "Modern clean" },
    { name: "Poppins", family: "Poppins", style: "Friendly round" },
    { name: "Quicksand", family: "Quicksand", style: "Soft & playful" },
    { name: "Nunito", family: "Nunito", style: "Warm rounded" },
    { name: "Playfair", family: "Playfair Display", style: "Elegant serif" },
    { name: "Dancing Script", family: "Dancing Script", style: "Cursive beauty" },
    { name: "Caveat", family: "Caveat", style: "Handwritten" },
    { name: "Sacramento", family: "Sacramento", style: "Calligraphy" },
  ];
  const fontSizePresets = [
    { label: "S", scale: 1.15, desc: "Standard" },
    { label: "M", scale: 1.3, desc: "Medium" },
    { label: "L", scale: 1.45, desc: "Large" },
    { label: "XL", scale: 1.6, desc: "Extra Large" },
  ];

  return (
    <PageShell>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance (full width) */}
        <Grid item xs={12}>
          <GlassCard delay={0}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <Icon sx={{ color: "primary.main" }}>palette</Icon>
              <Typography variant="h6" fontWeight="bold">Appearance</Typography>
            </Box>

            {/* Dark Mode */}
            <FormControlLabel
              control={<Switch checked={darkMode} onChange={(e) => {
                setDarkModeValue(e.target.checked);
                dispatch({ type: "SET_FAMILY", value: { ...family, dark_mode: e.target.checked } });
              }} />}
              label="Dark Mode"
              sx={{ display: "flex", mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            {/* Theme Preset */}
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} mb={1.5}>Theme</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5 }}>
                {presetNames.map((name) => {
                  const meta = PRESET_META[name] || { label: name, icon: "palette", colors: ["#888", "#aaa"] };
                  const isSelected = preset === name;
                  return (
                    <Box
                      key={name}
                      onClick={() => {
                        setPreset(name);
                        // Persist to family record so kiosk picks it up
                        dispatch({ type: "SET_FAMILY", value: { ...family, theme_preset: name } });
                      }}
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        cursor: "pointer",
                        border: "2px solid",
                        borderColor: isSelected ? tokens.accent.main : "transparent",
                        background: isSelected ? alpha(tokens.accent.main, 0.08) : tokens.glass.overlay,
                        transition: "all 0.2s ease",
                        touchAction: "manipulation",
                        "&:hover": { background: alpha(tokens.accent.main, 0.12) },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Icon sx={{ fontSize: "1.2rem !important", color: meta.colors[0] }}>{meta.icon}</Icon>
                        <Typography variant="body2" fontWeight={isSelected ? 700 : 500}>
                          {meta.label}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.75 }}>
                        {meta.colors.map((c, i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: c,
                              border: "2px solid",
                              borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Font Family */}
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} mb={1.5}>Font Family</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5 }}>
                {fontOptions.map((font) => {
                  const isSelected = fontFamily === font.family;
                  return (
                    <Box
                      key={font.name}
                      onClick={() => handleFontFamilyChange(font.family)}
                      sx={{
                        px: 2, py: 1.5, borderRadius: "14px",
                        border: "2px solid",
                        borderColor: isSelected ? "primary.main" : "divider",
                        bgcolor: isSelected ? alpha(tokens.accent.main, 0.08) : "transparent",
                        cursor: "pointer", textAlign: "center",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: isSelected ? "primary.dark" : "primary.light",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        },
                      }}
                    >
                      <Typography sx={{ fontFamily: `"${font.family}", sans-serif`, fontWeight: 600, fontSize: "1rem", mb: 0.25 }}>
                        {font.name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: "text.disabled" }}>
                        {font.style}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Font Size */}
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} mb={1.5}>Font Size</Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {fontSizePresets.map((preset) => (
                  <Box
                    key={preset.label}
                    onClick={() => handleFontSizeChange(preset.scale)}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderRadius: "12px",
                      border: "2px solid",
                      borderColor: fontScale === preset.scale ? "primary.main" : "divider",
                      bgcolor: fontScale === preset.scale ? alpha(tokens.accent.main, 0.08) : "transparent",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: fontScale === preset.scale ? "primary.dark" : "primary.light",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>{preset.label}</Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: "text.disabled" }}>
                      {preset.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Animations */}
            <FormControlLabel
              control={<Switch checked={animations} onChange={handleAnimationsChange} />}
              label="Animations"
              sx={{ display: "flex" }}
            />
          </GlassCard>
        </Grid>

        {/* Account (half width) */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.1}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
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

        {/* Family (half width) */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.2}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>family_restroom</Icon>
              <Typography variant="h6" fontWeight="bold">Family</Typography>
              <Chip label={user?.email} size="small" sx={{ ml: "auto", fontSize: "0.65rem" }} />
            </Box>

            {localStorage.getItem("famcal_joined_family_id") && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: "10px", bgcolor: alpha(tokens.accent.main, 0.06), border: `1px solid ${alpha(tokens.accent.main, 0.12)}` }}>
                <Typography sx={{ fontSize: "0.8rem", color: "primary.main", fontWeight: 600, mb: 0.5 }}>
                  Viewing a shared family
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => {
                    localStorage.removeItem("famcal_joined_family_id");
                    window.location.reload();
                  }}
                  sx={{ fontSize: "0.75rem", p: 0 }}
                  startIcon={<Icon sx={{ fontSize: "0.9rem" }}>link_off</Icon>}
                >
                  Switch back to my own family
                </Button>
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                fullWidth
                size="small"
                label="Family Name"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                onBlur={handleFamilyNameSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleFamilyNameSave(); }}
                placeholder="Enter family name"
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleFamilyNameSave}
                disabled={!familyName.trim()}
                sx={{ minWidth: 70, borderRadius: "10px", textTransform: "none" }}
              >
                Save
              </Button>
              {saved && (
                <Chip label="Saved" size="small" sx={{ bgcolor: alpha("#22c55e", 0.15), color: "#22c55e", fontWeight: 600 }} />
              )}
            </Box>
          </GlassCard>
        </Grid>

        {/* Weather (half width) */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.3}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>wb_sunny</Icon>
              <Typography variant="h6" fontWeight="bold">Weather</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Set your location to see weather in the header.
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                label="City or Location"
                placeholder="e.g., San Francisco, CA"
                size="small"
                value={weatherLocation}
                onChange={(e) => setWeatherLocation(e.target.value)}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  const loc = weatherLocation.trim();
                  if (!loc) return;
                  localStorage.setItem("famcal_weather_location", loc);
                  dispatch({ type: "SET_FAMILY", value: { ...family, weather_location: loc } });
                }}
                sx={{ minWidth: 80, borderRadius: "10px", textTransform: "none" }}
              >
                Save
              </Button>
            </Box>
            {!process.env.REACT_APP_WEATHER_API_KEY && (
              <Typography variant="caption" color="warning.main">
                Set REACT_APP_WEATHER_API_KEY in your environment for weather to work
              </Typography>
            )}
          </GlassCard>
        </Grid>

        {/* Kiosk / Dashboard Link (full width) */}
        <Grid item xs={12}>
          <GlassCard delay={0.35}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>tv</Icon>
              <Typography variant="h6" fontWeight="bold">Kiosk / Wall Display</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Generate a link for your wall-mounted display. No Google login needed on the display — it uses a simple access token.
            </Typography>

            {family?.dashboard_slug && family?.dashboard_token ? (
              <Box>
                <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dashboard Link"
                    value={`${window.location.origin}/d/${family.dashboard_slug}`}
                    InputProps={{ readOnly: true }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/d/${family.dashboard_slug}`);
                      setSaved(true);
                      setTimeout(() => setSaved(false), 2000);
                    }}
                    sx={{ minWidth: 70, borderRadius: "10px", textTransform: "none" }}
                  >
                    <Icon sx={{ fontSize: "1rem" }}>content_copy</Icon>
                  </Button>
                </Box>
                <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Access Token"
                    value={family.dashboard_token}
                    InputProps={{ readOnly: true }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(family.dashboard_token);
                      setSaved(true);
                      setTimeout(() => setSaved(false), 2000);
                    }}
                    sx={{ minWidth: 70, borderRadius: "10px", textTransform: "none" }}
                  >
                    <Icon sx={{ fontSize: "1rem" }}>content_copy</Icon>
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Open the link on your display device and enter the access token.
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Join another family using their access token */}
                <Typography variant="body2" fontWeight={600} mb={1}>
                  Join another family
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Have a family member share their Access Token above. Enter it here to view their family data on this device.
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Their Access Token"
                    placeholder="e.g., A7L7IC29"
                    id="join-family-code"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      const code = document.getElementById("join-family-code")?.value?.trim();
                      if (!code) return;
                      try {
                        const { supabase: sb } = await import("lib/supabase");
                        const { data: fam } = await sb
                          .from("families").select("id, name").eq("dashboard_token", code).single();
                        if (fam) {
                          localStorage.setItem("famcal_joined_family_id", fam.id);
                          window.location.reload();
                          return;
                        }
                        alert("Invalid token. Ask the family owner for their Access Token from Settings > Kiosk.");
                      } catch {
                        alert("Could not join. Please check the token and try again.");
                      }
                    }}
                    sx={{ minWidth: 70, borderRadius: "10px", textTransform: "none" }}
                  >
                    Join
                  </Button>
                </Box>
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={() => {
                  const slug = (family.name || "family").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20) + "-" + Math.random().toString(36).slice(2, 6);
                  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
                  dispatch({
                    type: "SET_FAMILY",
                    value: { ...family, dashboard_slug: slug, dashboard_token: token },
                  });
                }}
                startIcon={<Icon>link</Icon>}
                sx={{ borderRadius: "12px", textTransform: "none" }}
              >
                Generate Kiosk Link
              </Button>
            )}
          </GlassCard>
        </Grid>

        {/* About (half width) */}
        <Grid item xs={12} md={6}>
          <GlassCard delay={0.4}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <Icon sx={{ color: "primary.main" }}>info</Icon>
              <Typography variant="h6" fontWeight="bold">About</Typography>
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="body2" color="text.secondary">Supabase</Typography>
              <Chip
                label={isSupabaseConnected ? "Connected" : "Offline"}
                size="small"
                sx={{
                  bgcolor: isSupabaseConnected ? alpha("#22c55e", 0.15) : alpha("#f59e0b", 0.15),
                  color: isSupabaseConnected ? "#22c55e" : "#f59e0b",
                  fontWeight: 600,
                }}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="body2" color="text.secondary">Google Calendar</Typography>
              <Chip
                label={clientIdConfigured ? "Configured" : "Not configured"}
                size="small"
                sx={{
                  bgcolor: clientIdConfigured ? alpha("#22c55e", 0.15) : alpha("#94a3b8", 0.15),
                  color: clientIdConfigured ? "#22c55e" : "#94a3b8",
                  fontWeight: 600,
                }}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Version</Typography>
              <Typography variant="body2" fontWeight="bold">FamCal v3.0</Typography>
            </Box>
          </GlassCard>
        </Grid>

        {/* AI Assistant (full width) */}
        <Grid item xs={12}>
          <GlassCard delay={0.7}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <Icon sx={{ color: "primary.main" }}>auto_awesome</Icon>
              <Typography variant="h6" fontWeight="bold">AI Assistant</Typography>
            </Box>

            {/* Assistant Name */}
            <Box mb={2}>
              <TextField
                fullWidth
                size="small"
                label="Assistant Name"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="e.g., Amara"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Cuisine Preferences */}
            <Box mb={2}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Cuisine Preferences"
                value={cuisinePreferences}
                onChange={(e) => setCuisinePreferences(e.target.value)}
                placeholder="e.g., Indian, Italian, quick 30-min meals"
                helperText="Help me suggest meals you'll love"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Dietary Restrictions */}
            <Box mb={2}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Dietary Restrictions"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="e.g., halal, no pork, nut allergy"
                helperText="I'll respect these in all meal suggestions"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Tone */}
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} mb={1.5}>Tone</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5 }}>
                {toneOptions.map((option) => {
                  const isSelected = tone === option.key;
                  return (
                    <Box
                      key={option.key}
                      onClick={() => setTone(option.key)}
                      sx={{
                        px: 2, py: 1.5, borderRadius: "14px",
                        border: "2px solid",
                        borderColor: isSelected ? "primary.main" : "divider",
                        bgcolor: isSelected ? alpha(tokens.accent.main, 0.08) : "transparent",
                        cursor: "pointer", textAlign: "center",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: isSelected ? "primary.dark" : "primary.light",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        },
                      }}
                    >
                      <Icon sx={{ fontSize: "1.5rem", mb: 0.5, color: isSelected ? "primary.main" : "text.secondary" }}>
                        {option.icon}
                      </Icon>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 0.25 }}>
                        {option.label}
                      </Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: "text.disabled" }}>
                        {option.desc}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Custom Instructions */}
            <Box mb={2}>
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                label="Custom Instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Advanced: Add custom system prompt additions..."
                helperText="Additional instructions for the AI (optional)"
              />
            </Box>

            {/* Save Button */}
            <Box display="flex" gap={1} alignItems="center">
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveAIPreferences}
                sx={{ minWidth: 80, borderRadius: "10px", textTransform: "none" }}
              >
                Save
              </Button>
              {saved && (
                <Chip label="Saved" size="small" sx={{ bgcolor: alpha("#22c55e", 0.15), color: "#22c55e", fontWeight: 600 }} />
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* What I Remember */}
            <Accordion sx={{ boxShadow: "none", border: "1px solid", borderColor: "divider", borderRadius: "12px !important", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Icon sx={{ color: "primary.main" }}>psychology</Icon>
                  <Typography variant="body1" fontWeight={600}>What I Remember</Typography>
                  <Chip label={memories?.length || 0} size="small" sx={{ ml: 1 }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {memories && memories.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {memories.map((memory) => (
                      <Box
                        key={memory.id}
                        sx={{
                          p: 1.5,
                          borderRadius: "10px",
                          bgcolor: alpha(tokens.accent.main, 0.04),
                          border: `1px solid ${alpha(tokens.accent.main, 0.12)}`,
                        }}
                      >
                        {editingMemory?.id === memory.id ? (
                          <Box>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              rows={2}
                              value={editingMemory.content}
                              onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                              sx={{ mb: 1 }}
                            />
                            <Box display="flex" gap={1}>
                              <Button size="small" variant="contained" onClick={handleSaveMemoryEdit}>
                                Save
                              </Button>
                              <Button size="small" variant="outlined" onClick={() => setEditingMemory(null)}>
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box>
                            <Box display="flex" alignItems="flex-start" gap={1} mb={0.5}>
                              <Chip
                                label={memory.category || "general"}
                                size="small"
                                sx={{ fontSize: "0.65rem", height: 20 }}
                              />
                              <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>
                                {memory.content}
                              </Typography>
                            </Box>
                            <Box display="flex" gap={1} mt={1}>
                              <IconButton size="small" onClick={() => handleEditMemory(memory)}>
                                <Icon sx={{ fontSize: "1rem" }}>edit</Icon>
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteMemory(memory)}>
                                <Icon sx={{ fontSize: "1rem", color: "error.main" }}>delete</Icon>
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <Icon sx={{ fontSize: "2rem", color: "text.disabled", mb: 1 }}>psychology</Icon>
                    <Typography variant="body2" color="text.secondary">
                      No memories yet. Chat with me to learn!
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </GlassCard>
        </Grid>

        {/* Photo Frame (full width) */}
        <Grid item xs={12}>
          <GlassCard delay={0.5}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Icon sx={{ color: "primary.main" }}>photo_library</Icon>
              <Typography variant="h6" fontWeight="bold">Photo Frame</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Display family photos when the screen is idle. Upload your favorite family photos below.
            </Typography>

            {/* Idle timeout slider */}
            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight={600}>Idle Timeout</Typography>
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
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Photo duration slider */}
            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight={600}>Photo Duration</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  {photoInterval} sec
                </Typography>
              </Box>
              <Slider
                value={photoInterval}
                onChange={handlePhotoIntervalChange}
                min={5}
                max={30}
                step={5}
                marks={[
                  { value: 5, label: "5s" },
                  { value: 15, label: "15s" },
                  { value: 30, label: "30s" },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Google Photos albums */}
            <Box mb={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <Icon sx={{ fontSize: "1.2rem" }}>photo_library</Icon>
                <Typography variant="body1" fontWeight={600}>Google Photos Albums</Typography>
              </Box>

              {!isSupabaseConnected && (
                <Box sx={{
                  bgcolor: alpha("#f59e0b", 0.1),
                  border: `1px solid ${alpha("#f59e0b", 0.3)}`,
                  borderRadius: "12px",
                  p: 1.5,
                  mb: 2,
                }}>
                  <Box display="flex" alignItems="flex-start" gap={1}>
                    <Icon sx={{ color: "warning.main", fontSize: "1.2rem" }}>info</Icon>
                    <Typography variant="caption" color="warning.main">
                      Connect Supabase to enable photo uploads
                    </Typography>
                  </Box>
                </Box>
              )}

              {photosError && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: "10px", background: alpha("#E17055", 0.08), border: `1px solid ${alpha("#E17055", 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#E17055", lineHeight: 1.5 }}>
                    {photosError}
                  </Typography>
                </Box>
              )}

              {!photosConnected ? (
                <Button
                  variant="outlined"
                  startIcon={<Icon>photo_library</Icon>}
                  onClick={() => { setPhotosError(""); handleConnectPhotos(); }}
                  sx={{ mb: 2 }}
                >
                  Load Google Photos Albums
                </Button>
              ) : loadingAlbums ? (
                <Box display="flex" alignItems="center" justifyContent="center" py={3}>
                  <CircularProgress size={24} sx={{ mr: 1.5 }} />
                  <Typography variant="body2" color="text.secondary">Loading albums...</Typography>
                </Box>
              ) : albums.length > 0 ? (
                <>
                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                    Select albums for slideshow ({selectedAlbumIds.length} selected)
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5, mb: 2 }}>
                    {albums.map((album) => {
                      const isSelected = selectedAlbumIds.includes(album.id);
                      return (
                        <Box key={album.id} onClick={() => toggleAlbum(album.id)} sx={{
                          position: "relative", cursor: "pointer", borderRadius: "12px", overflow: "hidden",
                          border: "2px solid", borderColor: isSelected ? "primary.main" : "divider",
                          transition: "all 0.2s ease",
                          "&:hover": { borderColor: isSelected ? "primary.dark" : "primary.light", transform: "translateY(-2px)" },
                        }}>
                          {album.coverUrl ? (
                            <Box component="img" src={album.coverUrl} alt={album.title} sx={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                          ) : (
                            <Box sx={{ width: "100%", aspectRatio: "1", bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon sx={{ fontSize: "2rem", color: "text.disabled" }}>photo</Icon>
                            </Box>
                          )}
                          {isSelected && (
                            <Box sx={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon sx={{ fontSize: "1rem", color: "white" }}>check</Icon>
                            </Box>
                          )}
                          <Box sx={{ p: 1, bgcolor: "background.paper" }}>
                            <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.25 }}>{album.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{album.itemCount} photos</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                  <Button variant="text" size="small" color="error" onClick={handleDisconnectPhotos} startIcon={<Icon>link_off</Icon>}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" py={2}>
                  No albums found. Make sure you have albums in Google Photos.
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Manual Upload Section */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <Icon sx={{ fontSize: "1.2rem" }}>upload</Icon>
                <Typography variant="body1" fontWeight={600}>Manual Upload</Typography>
              </Box>

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
                    : { borderColor: "primary.main", background: alpha(tokens.accent.main, 0.04) },
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
            </Box>
          </GlassCard>
        </Grid>
      </Grid>
    </PageShell>
  );
}

export default Settings;
