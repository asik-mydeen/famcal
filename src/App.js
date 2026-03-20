import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import { AnimatePresence, motion } from "framer-motion";

import { createAppTheme } from "assets/theme";
import { useThemeMode } from "context/ThemeContext";
import { useAuth } from "context/AuthContext";
import { useFamilyController, MEMBER_COLORS } from "context/FamilyContext";
import { getGoogleClientId, setGoogleClientId } from "lib/googleCalendar";
import AnimatedBackground from "components/AnimatedBackground";
import HeaderBar from "components/HeaderBar";
import TabStrip from "components/TabStrip";
import FloatingNav from "components/FloatingNav";
import PageTransition from "components/PageTransition";
import PhotoFrame from "components/PhotoFrame";
import KioskWrapper from "components/KioskWrapper";
import WeatherWidget from "components/WeatherWidget";
import CountdownWidget from "components/CountdownWidget";
import useIdleTimer from "hooks/useIdleTimer";
import { fetchWeather } from "lib/weather";

import FamilyCalendar from "layouts/family-calendar";
import Chores from "layouts/chores";
import Meals from "layouts/meals";
import Lists from "layouts/lists";
import Family from "layouts/family";
import Rewards from "layouts/rewards";
import Settings from "layouts/settings";

// ── Google Sign-In Screen ──

function LoginScreen() {
  const { signIn } = useAuth();
  const btnRef = useRef(null);
  const [clientId, setClientIdLocal] = useState(getGoogleClientId());
  const [showClientInput, setShowClientInput] = useState(!clientId);
  const [error, setError] = useState("");

  const initGoogleButton = useCallback(() => {
    const cid = getGoogleClientId();
    if (!cid || !window.google?.accounts?.id || !btnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: cid,
      callback: (response) => {
        const ok = signIn(response);
        if (!ok) setError("Sign in failed. Please try again.");
      },
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
      shape: "pill",
    });
  }, [signIn]);

  useEffect(() => {
    // Wait for Google script to load
    const timer = setInterval(() => {
      if (window.google?.accounts?.id && getGoogleClientId()) {
        initGoogleButton();
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [initGoogleButton]);

  const handleSaveClientId = () => {
    if (!clientId.trim()) return;
    setGoogleClientId(clientId.trim());
    setShowClientInput(false);
    setTimeout(initGoogleButton, 300);
  };

  const features = [
    { icon: "calendar_month", label: "Family Calendar" },
    { icon: "checklist", label: "Tasks & Chores" },
    { icon: "emoji_events", label: "Rewards & Points" },
    { icon: "sync", label: "Google Calendar Sync" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3 }}>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: "24px", mx: "auto", mb: 2,
            background: "linear-gradient(135deg, #4ECDC4 0%, #44B09E 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 32px rgba(78,205,196,0.3)",
          }}>
            <Icon sx={{ fontSize: "2.5rem !important", color: "#fff" }}>calendar_month</Icon>
          </Box>
          <Typography variant="h2" fontWeight={800} sx={{ color: "text.primary", letterSpacing: "-0.03em" }}>
            FamCal
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 320, mx: "auto" }}>
            Your family hub for calendars, tasks, and rewards
          </Typography>
        </Box>
      </motion.div>

      {/* Feature pills */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, mb: 4, maxWidth: 400 }}>
          {features.map((f) => (
            <Box key={f.label} sx={{
              display: "flex", alignItems: "center", gap: 0.75,
              px: 1.5, py: 0.75, borderRadius: "20px",
              bgcolor: "background.paper", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <Icon sx={{ fontSize: "1rem !important", color: "primary.main" }}>{f.icon}</Icon>
              <Typography variant="caption" fontWeight={600} sx={{ color: "text.secondary" }}>{f.label}</Typography>
            </Box>
          ))}
        </Box>
      </motion.div>

      {/* Sign-in card */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <Box sx={{
          width: { xs: "100%", sm: 400 }, bgcolor: "background.paper", borderRadius: "24px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.08)", p: { xs: 3, sm: 4 }, textAlign: "center",
        }}>
          {showClientInput ? (
            <Box>
              <Icon sx={{ fontSize: "2rem !important", color: "primary.main", mb: 1.5 }}>settings</Icon>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>First Time Setup</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Paste your Google OAuth Client ID to enable sign-in and calendar sync.
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="xxxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientIdLocal(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button fullWidth variant="contained" size="large" onClick={handleSaveClientId} disabled={!clientId.trim()}>
                Continue
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Welcome Back</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sign in to access your family dashboard
              </Typography>
              <Box ref={btnRef} sx={{ display: "flex", justifyContent: "center", mb: 2, minHeight: 44 }} />
              {error && (
                <Typography variant="caption" color="error" sx={{ mb: 1, display: "block" }}>{error}</Typography>
              )}
              <Button size="small" onClick={() => setShowClientInput(true)} sx={{ color: "text.disabled", mt: 1, fontSize: "0.7rem" }}>
                Change Client ID
              </Button>
            </Box>
          )}
        </Box>
      </motion.div>

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <Typography variant="caption" sx={{ color: "text.disabled", mt: 4, display: "block" }}>
          FamCal v2.0
        </Typography>
      </motion.div>
    </Box>
  );
}

function SetupWizard() {
  const [state, dispatch] = useFamilyController();
  const { family } = state;
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState(family.name || "My Family");
  const [memberRows, setMemberRows] = useState([{ name: "", color: MEMBER_COLORS[0].value, birth_date: "" }]);
  // Step 2: after members are created, store their IDs for calendar connection
  const [createdMembers, setCreatedMembers] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState({});
  const [connecting, setConnecting] = useState(null);

  const addMemberRow = () => {
    const usedColors = memberRows.map((m) => m.color);
    const nextColor = MEMBER_COLORS.find((c) => !usedColors.includes(c.value))?.value || MEMBER_COLORS[0].value;
    setMemberRows([...memberRows, { name: "", color: nextColor, birth_date: "" }]);
  };

  const updateMember = (index, field, value) => {
    const updated = [...memberRows];
    updated[index] = { ...updated[index], [field]: value };
    setMemberRows(updated);
  };

  const removeMember = (index) => {
    if (memberRows.length <= 1) return;
    setMemberRows(memberRows.filter((_, i) => i !== index));
  };

  // Step 1 → 2: save family + create members, then show calendar connection
  const handleCreateMembers = useCallback(() => {
    // Save family name + owner email
    const updates = { ...family, name: familyName.trim() || "My Family" };
    if (user?.email) updates.owner_email = user.email;
    // Client ID is already saved from login screen
    const existingClientId = getGoogleClientId();
    if (existingClientId) updates.google_client_id = existingClientId;
    dispatch({ type: "SET_FAMILY", value: updates });

    // Create members and collect their temp IDs
    const created = [];
    memberRows.forEach((m) => {
      if (m.name.trim()) {
        const tempId = `member-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        dispatch({
          type: "ADD_MEMBER",
          value: {
            id: tempId,
            family_id: family.id,
            name: m.name.trim(),
            avatar_color: m.color,
            avatar_emoji: "",
            birth_date: m.birth_date || "",
            points: 0,
            level: 1,
            streak_days: 0,
            visible: true,
          },
        });
        created.push({ id: tempId, name: m.name.trim(), color: m.color });
      }
    });

    setCreatedMembers(created);
    setStep(2);
  }, [family, familyName, user, memberRows, dispatch]);

  // Connect a member's Google Calendar
  const handleConnectCalendar = useCallback(async (member) => {
    if (!getGoogleClientId()) {
      setCalendarStatus((prev) => ({ ...prev, [member.id]: "No Client ID configured" }));
      return;
    }

    setConnecting(member.id);
    try {
      // Dynamic import to avoid circular deps
      const { connectMemberCalendar } = await import("lib/googleCalendar");
      const result = await connectMemberCalendar(member.id);
      dispatch({
        type: "UPDATE_MEMBER",
        value: { id: member.id, google_calendar_id: result.calendarId },
      });
      setCalendarStatus((prev) => ({ ...prev, [member.id]: result.calendarId }));
    } catch (err) {
      setCalendarStatus((prev) => ({ ...prev, [member.id]: "error:" + err.message }));
    }
    setConnecting(null);
  }, [dispatch]);

  const handleFinish = () => {
    localStorage.setItem("famcal_setup_done", "true");
    window.location.reload();
  };

  const steps = ["Family", "Members", "Calendars"];
  const hasClientId = Boolean(getGoogleClientId());

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ width: { xs: "100%", sm: 520 }, bgcolor: "background.paper", borderRadius: "24px", boxShadow: "0 8px 40px rgba(0,0,0,0.1)", p: { xs: 3, sm: 4 } }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Icon sx={{ fontSize: "2.5rem !important", color: "primary.main", mb: 1 }}>family_restroom</Icon>
            <Typography variant="h4" fontWeight="bold">Welcome to FamCal</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Set up your family</Typography>
          </Box>

          <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {/* Step 0: Family Name */}
          {step === 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Your family name</Typography>
              <TextField fullWidth placeholder="e.g. The Smiths" value={familyName} onChange={(e) => setFamilyName(e.target.value)} sx={{ mb: 3 }} />
              <Button fullWidth variant="contained" size="large" onClick={() => setStep(1)} disabled={!familyName.trim()}>
                Next
              </Button>
            </Box>
          )}

          {/* Step 1: Add Family Members */}
          {step === 1 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Add your family members</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
                {memberRows.map((m, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Box
                      sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: m.color, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                      onClick={() => {
                        const ci = MEMBER_COLORS.findIndex((c) => c.value === m.color);
                        updateMember(i, "color", MEMBER_COLORS[(ci + 1) % MEMBER_COLORS.length].value);
                      }}
                    >
                      <Icon sx={{ fontSize: "1rem !important", color: "#fff" }}>person</Icon>
                    </Box>
                    <TextField size="small" placeholder="Name" value={m.name} onChange={(e) => updateMember(i, "name", e.target.value)} sx={{ flex: 1, minWidth: 100 }} />
                    <TextField size="small" type="date" label="Birthday" value={m.birth_date} onChange={(e) => updateMember(i, "birth_date", e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    {memberRows.length > 1 && (
                      <Button size="small" onClick={() => removeMember(i)} sx={{ minWidth: 36, color: "text.disabled" }}>
                        <Icon sx={{ fontSize: "1.2rem !important" }}>close</Icon>
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
              <Button size="small" startIcon={<Icon>add</Icon>} onClick={addMemberRow} sx={{ mb: 3, color: "primary.main" }}>
                Add another member
              </Button>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="outlined" onClick={() => setStep(0)} sx={{ flex: 1 }}>Back</Button>
                <Button variant="contained" onClick={handleCreateMembers} disabled={!memberRows.some((m) => m.name.trim())} sx={{ flex: 2 }}>
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 2: Connect Google Calendars */}
          {step === 2 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Connect Google Calendars</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {hasClientId
                  ? "Sign each member into their Google account to sync their calendar."
                  : "Set up your Google OAuth Client ID in Settings to enable calendar sync."}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                {createdMembers.map((m) => {
                  const status = calendarStatus[m.id];
                  const isConnecting = connecting === m.id;
                  const isConnected = status && !status.startsWith("error:");
                  const hasError = status && status.startsWith("error:");

                  return (
                    <Box key={m.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "14px", bgcolor: isConnected ? "rgba(34,197,94,0.06)" : "action.hover" }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon sx={{ fontSize: "1.1rem !important", color: "#fff" }}>person</Icon>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                        {isConnected && (
                          <Typography variant="caption" color="success.main">{status}</Typography>
                        )}
                        {hasError && (
                          <Typography variant="caption" color="error.main">{status.replace("error:", "")}</Typography>
                        )}
                      </Box>
                      {isConnected ? (
                        <Icon sx={{ color: "success.main", fontSize: "1.3rem !important" }}>check_circle</Icon>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!hasClientId || isConnecting}
                          onClick={() => handleConnectCalendar(m)}
                          startIcon={<Icon sx={{ fontSize: "1rem !important" }}>{isConnecting ? "hourglass_top" : "link"}</Icon>}
                          sx={{ flexShrink: 0 }}
                        >
                          {isConnecting ? "Connecting..." : "Connect"}
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="contained" fullWidth onClick={handleFinish} size="large">
                  {Object.values(calendarStatus).some((s) => s && !s.startsWith("error:"))
                    ? "Finish Setup"
                    : "Skip & Finish"}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </motion.div>
    </Box>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  const { user } = useAuth();
  const [state, dispatch] = useFamilyController();
  const { members, photos, countdowns, family, weather } = state;

  const setupDone = localStorage.getItem("famcal_setup_done") === "true";
  const isLoggedIn = Boolean(user);
  const showSetup = isLoggedIn && !setupDone && members.length === 0;

  // Weather location from family settings or localStorage
  const weatherLocation = family?.weather_location || localStorage.getItem("famcal_weather_location") || "";

  // Kiosk settings from localStorage
  const kioskEnabled = localStorage.getItem("famcal_kiosk") === "true";
  const idleTimeout = parseInt(localStorage.getItem("famcal_idle_timeout") || "5") * 60 * 1000;
  const fontScale = parseFloat(localStorage.getItem("famcal_font_scale") || "1.0");

  // Idle timer for photo frame
  const { isIdle, resetTimer } = useIdleTimer(idleTimeout);

  // Weather data loading
  const [weatherData, setWeatherData] = useState(null);
  useEffect(() => {
    if (weatherLocation) {
      fetchWeather(weatherLocation).then(data => {
        if (data) {
          setWeatherData(data);
          dispatch({ type: "SET_WEATHER", value: data });
        }
      });
    }
  }, [weatherLocation, dispatch]);

  // Derive active tab from location
  const activeTab = location.pathname.split("/")[1] || "calendar";

  // Handle tab change
  const handleTabChange = (key, path) => {
    navigate(path);
  };

  // Header widgets
  const headerWeatherWidget = weatherLocation ? (
    <WeatherWidget variant="header" location={weatherLocation} />
  ) : null;

  const headerCountdownWidget = countdowns.length > 0 ? (
    <CountdownWidget variant="header" countdowns={countdowns} members={members} dispatch={dispatch} familyId={family?.id} />
  ) : null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AnimatedBackground />
      {!isLoggedIn ? (
        <LoginScreen />
      ) : showSetup ? (
        <SetupWizard />
      ) : (
        <>
          {/* Photo Frame overlay when idle */}
          {isIdle && photos.length > 0 && (
            <PhotoFrame
              photos={photos}
              interval={parseInt(localStorage.getItem("famcal_photo_interval") || "5")}
              weather={weatherData}
              onDismiss={resetTimer}
            />
          )}

          {/* Main app wrapped in KioskWrapper */}
          <KioskWrapper
            enabled={kioskEnabled}
            fontScale={fontScale}
            onToggle={() => {
              localStorage.setItem("famcal_kiosk", String(!kioskEnabled));
              window.location.reload();
            }}
          >
            <HeaderBar
              members={members}
              weatherWidget={headerWeatherWidget}
              countdownWidget={headerCountdownWidget}
            />
            <Box className="kiosk-tab-strip" sx={{ display: { xs: "none", md: "flex" }, px: 3, pt: 1 }}>
              <TabStrip
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </Box>
            <Box sx={{ flex: 1, overflow: "auto", pb: { xs: 10, md: 2 } }}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/calendar" element={<PageTransition><FamilyCalendar /></PageTransition>} />
                  <Route path="/chores" element={<PageTransition><Chores /></PageTransition>} />
                  <Route path="/meals" element={<PageTransition><Meals /></PageTransition>} />
                  <Route path="/lists" element={<PageTransition><Lists /></PageTransition>} />
                  <Route path="/tasks" element={<Navigate to="/chores" replace />} />
                  <Route path="/family" element={<PageTransition><Family /></PageTransition>} />
                  <Route path="/rewards" element={<PageTransition><Rewards /></PageTransition>} />
                  <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
                  <Route path="*" element={<Navigate to="/calendar" replace />} />
                </Routes>
              </AnimatePresence>
            </Box>
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <FloatingNav />
            </Box>
          </KioskWrapper>
        </>
      )}
    </ThemeProvider>
  );
}
