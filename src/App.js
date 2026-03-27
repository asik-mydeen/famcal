import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import TextField from "@mui/material/TextField";
// SpeedDial removed — replaced with single AI FAB
import { AnimatePresence, motion } from "framer-motion";

import { createAppTheme } from "assets/theme";
import { useAppTheme } from "context/ThemeContext";
import { useAuth } from "context/AuthContext";
import { useFamilyController, MEMBER_COLORS } from "context/FamilyContext";
import { getGoogleClientId } from "lib/googleCalendar";
import { fetchPhotosFromAlbums } from "lib/googlePhotos";
import AnimatedBackground from "components/AnimatedBackground";
import VoiceOverlay from "components/VoiceOverlay";
import useVoiceMode from "hooks/useVoiceMode";
import HeaderBar from "components/HeaderBar";
import TabStrip from "components/TabStrip";
import FloatingNav from "components/FloatingNav";
import PageTransition from "components/PageTransition";
import PhotoFrame from "components/PhotoFrame";
import KioskWrapper from "components/KioskWrapper";
import WeatherWidget from "components/WeatherWidget";
import CountdownWidget from "components/CountdownWidget";
import AIAssistant from "components/AIAssistant";
import { TimerAlarmProvider } from "context/TimerAlarmContext";
import AlertOverlay from "components/AlertOverlay";
import TimerAlarmPanel from "components/TimerAlarmPanel";
import ErrorBoundary from "components/ErrorBoundary";
import DailyBriefing from "components/DailyBriefing";
import useIdleTimer from "hooks/useIdleTimer";
import { fetchWeather } from "lib/weather";

import FamilyCalendar from "layouts/family-calendar";
import Chores from "layouts/chores";
import Meals from "layouts/meals";
import Lists from "layouts/lists";
import Family from "layouts/family";
import Rewards from "layouts/rewards";
import Settings from "layouts/settings";
import PrivacyPolicy from "layouts/legal/privacy";
import TermsOfService from "layouts/legal/tos";
import Routines from "layouts/routines";
import Emergency from "layouts/emergency";
import Dashboard from "layouts/dashboard";
import KioskSetup from "layouts/kiosk-setup";

// ── Supabase Auth Sign-In Screen ──

function LoginScreen() {
  const { signIn } = useAuth();
  const { tokens, gradient: loginGrad } = useAppTheme();

  const features = [
    { icon: "calendar_today", label: "Shared Calendar", desc: "See everyone's schedule at a glance" },
    { icon: "task_alt", label: "Chore Tracking", desc: "Gamified tasks with points and streaks" },
    { icon: "restaurant", label: "Meal Planning", desc: "Weekly meals with grocery lists" },
    { icon: "emoji_events", label: "Rewards Store", desc: "Earn and spend points on treats" },
    { icon: "photo_library", label: "Photo Frame", desc: "Family slideshow when idle" },
    { icon: "checklist", label: "Shared Lists", desc: "Groceries, to-dos, and more" },
  ];

  return (
    <Box sx={{
      minHeight: "100vh", display: "flex",
      background: `linear-gradient(135deg, ${tokens.accent.light}0A 0%, ${tokens.accent.light}12 50%, ${tokens.accent.light}0A 100%)`,
      overflow: "hidden", position: "relative",
    }}>
      {/* Decorative background orbs */}
      <Box sx={{
        position: "absolute", top: "-20%", right: "-10%", width: "50vw", height: "50vw",
        borderRadius: "50%", background: `radial-gradient(circle, ${tokens.accent.main}0F 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", bottom: "-15%", left: "-10%", width: "40vw", height: "40vw",
        borderRadius: "50%", background: "radial-gradient(circle, rgba(0,184,148,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Main content — two column on desktop, single on mobile */}
      <Box sx={{
        display: "flex", flex: 1, alignItems: "center", justifyContent: "center",
        flexDirection: { xs: "column", md: "row" },
        maxWidth: 1100, mx: "auto", px: { xs: 3, md: 6 }, py: { xs: 4, md: 0 },
        gap: { xs: 4, md: 8 }, position: "relative", zIndex: 1,
      }}>

        {/* Left: Hero section */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ flex: 1 }}
        >
          <Box sx={{ maxWidth: 480 }}>
            {/* Logo */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: "16px",
                background: loginGrad("primary"),
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 32px rgba(108,92,231,0.25)",
              }}>
                <Icon sx={{ color: "#fff", fontSize: "1.6rem" }}>calendar_month</Icon>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "#1A1A1A" }}>
                FamCal
              </Typography>
            </Box>

            {/* Headline */}
            <Typography sx={{
              fontWeight: 800, fontSize: { xs: "2rem", md: "2.75rem" },
              letterSpacing: "-0.03em", lineHeight: 1.15, color: "#1A1A1A", mb: 2,
            }}>
              Your family,{" "}
              <Box component="span" sx={{
                background: loginGrad("primary"),
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                beautifully organized
              </Box>
            </Typography>

            <Typography sx={{ fontSize: "1.1rem", color: "#8B8680", lineHeight: 1.6, mb: 4, maxWidth: 400 }}>
              The all-in-one family hub for your wall display. Calendar, chores, meals, and more — designed for the whole family.
            </Typography>

            {/* Sign in button */}
            <Button
              onClick={signIn}
              variant="contained"
              size="large"
              sx={{
                background: loginGrad("primary"),
                borderRadius: "16px", px: 5, py: 2,
                textTransform: "none", fontWeight: 700, fontSize: "1.1rem",
                boxShadow: "0 8px 32px rgba(108,92,231,0.35)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 12px 40px rgba(108,92,231,0.5)",
                  transform: "translateY(-2px)",
                },
                "&:active": { transform: "translateY(0)" },
              }}
            >
              <Box
                component="img"
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                sx={{ width: 20, height: 20, mr: 1.5 }}
              />
              Continue with Google
            </Button>

            <Typography sx={{ mt: 2.5, fontSize: "0.75rem", color: "#C4C0B8" }}>
              Free for families. No credit card required.
            </Typography>

            <Box sx={{ mt: 2, display: "flex", gap: 2, justifyContent: "center" }}>
              <a href="/privacy" style={{ fontSize: "0.72rem", color: "#8B8680", textDecoration: "none" }}>
                Privacy Policy
              </a>
              <a href="/tos" style={{ fontSize: "0.72rem", color: "#8B8680", textDecoration: "none" }}>
                Terms of Service
              </a>
            </Box>
          </Box>
        </motion.div>

        {/* Right: Feature cards */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ flex: 1, maxWidth: 460 }}
        >
          <Box sx={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5,
          }}>
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              >
                <Box sx={{
                  p: 2.5, borderRadius: "16px",
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 24px rgba(108,92,231,0.1)",
                    borderColor: "rgba(108,92,231,0.2)",
                  },
                }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: "12px",
                    background: `rgba(108,92,231,${0.08 + i * 0.02})`,
                    display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5,
                  }}>
                    <Icon sx={{ fontSize: "1.2rem", color: "#6C5CE7" }}>{f.icon}</Icon>
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A", mb: 0.5 }}>
                    {f.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#8B8680", lineHeight: 1.4 }}>
                    {f.desc}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      </Box>
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
    // Also mark in Supabase
    dispatch({ type: "SET_FAMILY", value: { ...family, setup_done: true } });
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
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Connect Google Calendars (Optional)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {hasClientId
                  ? "Connect each member's Google Calendar to sync events. You can also do this later from the Calendar page."
                  : "Calendar sync requires REACT_APP_GOOGLE_CLIENT_ID environment variable. You can set this up later."}
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
  const { darkMode, preset, tokens, gradient: getGrad } = useAppTheme();

  // Font state must be declared BEFORE useMemo that depends on it
  const [fontScale, setFontScale] = useState(() => parseFloat(localStorage.getItem("famcal_font_scale") || "1.15"));
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem("famcal_font_family") || "Inter");

  // Listen for font changes from Settings page (custom event bridge)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.fontFamily) setFontFamily(e.detail.fontFamily);
      if (e.detail.fontScale) setFontScale(e.detail.fontScale);
    };
    window.addEventListener("famcal-font-change", handler);
    return () => window.removeEventListener("famcal-font-change", handler);
  }, []);

  const theme = useMemo(() => {
    const ff = fontFamily === "System"
      ? "-apple-system, BlinkMacSystemFont, sans-serif"
      : `"${fontFamily}", "Helvetica", "Arial", sans-serif`;
    return createAppTheme(darkMode ? "dark" : "light", ff, preset);
  }, [darkMode, fontFamily, preset]);
  const { user, loading } = useAuth();
  const [state, dispatch] = useFamilyController();
  const { members, photos, countdowns, family, dataLoaded, messages, events } = state;

  // ── Event Reminder Engine ──
  const firedRemindersRef = useRef(new Set());
  const [reminderToast, setReminderToast] = useState("");

  useEffect(() => {
    if (!dataLoaded || !events || events.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      events.forEach((evt) => {
        if (!evt.reminder_minutes || evt.allDay) return;
        const eventStart = new Date(evt.start);
        // Only check events in the next 24 hours
        if (eventStart > in24h || eventStart < now) return;

        const reminderTime = new Date(eventStart.getTime() - evt.reminder_minutes * 60 * 1000);
        const todayStr = now.toISOString().split("T")[0];
        const firedKey = `${evt.id}_${todayStr}`;

        // Fire if reminder time has passed but event hasn't started yet
        if (now >= reminderTime && now < eventStart && !firedRemindersRef.current.has(firedKey)) {
          firedRemindersRef.current.add(firedKey);

          // Calculate friendly time label
          const minsLeft = Math.round((eventStart - now) / 60000);
          let timeLabel;
          if (minsLeft <= 1) timeLabel = "now";
          else if (minsLeft < 60) timeLabel = `in ${minsLeft} minutes`;
          else timeLabel = `in ${Math.round(minsLeft / 60)} hour${Math.round(minsLeft / 60) > 1 ? "s" : ""}`;

          const message = `${evt.title} ${timeLabel}!`;
          setReminderToast(message);

          // TTS announcement if voice mode / speechSynthesis is available
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }
      });
    };

    // Check immediately, then every 30 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [dataLoaded, events]);

  // Unified FAB state
  const [aiOpen, setAiOpen] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState(null);

  // Voice mode — "Hey Amara" wake word → opens AI sidebar
  const voice = useVoiceMode(state, {
    onWakeWord: () => setAiOpen(true),
    onVoiceCommand: (query) => setVoiceQuery(query),
  });
  const [timerPanelOpen, setTimerPanelOpen] = useState(false);

  // ── Offline indicator ──
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Daily Briefing ──
  const [showBriefing, setShowBriefing] = useState(false);
  const briefingDismissed = useRef(false);

  // Show briefing on first interaction of the day, or force-show via button
  const handleBriefingCheck = useCallback((forceShow) => {
    if (forceShow) {
      setShowBriefing(true);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const lastBriefing = localStorage.getItem("famcal_last_briefing_date");
    if (lastBriefing !== today && !briefingDismissed.current) {
      setShowBriefing(true);
    }
  }, []);

  const handleDismissBriefing = useCallback(() => {
    briefingDismissed.current = true;
    setShowBriefing(false);
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("famcal_last_briefing_date", today);
  }, []);

  const setupDone = localStorage.getItem("famcal_setup_done") === "true" || family?.setup_done === true;
  const isLoggedIn = Boolean(user);
  const showSetup = isLoggedIn && dataLoaded && !setupDone && members.length === 0;

  // Weather location from family settings or localStorage
  const weatherLocation = family?.weather_location || localStorage.getItem("famcal_weather_location") || "";

  // Kiosk settings — React state (no reload needed)
  const [kioskEnabled, setKioskEnabled] = useState(localStorage.getItem("famcal_kiosk") === "true");
  const idleTimeout = parseInt(localStorage.getItem("famcal_idle_timeout") || "5") * 60 * 1000;

  // Apply font scale + font family to root AND body (MUI CssBaseline targets body)
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    const fontStr = fontFamily === "System"
      ? "-apple-system, BlinkMacSystemFont, sans-serif"
      : `"${fontFamily}", -apple-system, BlinkMacSystemFont, sans-serif`;
    document.documentElement.style.fontFamily = fontStr;
    document.body.style.fontFamily = fontStr;
    return () => {
      document.documentElement.style.fontSize = "";
      document.documentElement.style.fontFamily = "";
      document.body.style.fontFamily = "";
    };
  }, [fontScale, fontFamily]);

  const handleFontFamilyChange = useCallback((newFont) => {
    setFontFamily(newFont);
    localStorage.setItem("famcal_font_family", newFont);
  }, []);

  const handleFontScaleChange = useCallback((newScale) => {
    const clamped = Math.max(1.0, Math.min(1.7, newScale));
    const rounded = Math.round(clamped * 20) / 20; // snap to 5% increments
    setFontScale(rounded);
    localStorage.setItem("famcal_font_scale", String(rounded));
  }, []);

  const toggleKiosk = useCallback(() => {
    setKioskEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("famcal_kiosk", String(next));
      return next;
    });
  }, []);

  // Idle timer for photo frame — MUST be called before any conditional returns (React hooks rules)
  const { isIdle, resetTimer } = useIdleTimer(idleTimeout);

  // Google Photos state and loading
  const [googlePhotos, setGooglePhotos] = useState([]);
  const selectedAlbumIds = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("famcal_photos_selected_albums") || "[]"); }
    catch { return []; }
  }, []);

  useEffect(() => {
    if (isIdle && selectedAlbumIds.length > 0 && googlePhotos.length === 0) {
      fetchPhotosFromAlbums(selectedAlbumIds).then(setGooglePhotos).catch(console.error);
    }
  }, [isIdle, selectedAlbumIds, googlePhotos.length]);

  // Check for daily briefing on initial data load
  useEffect(() => {
    if (dataLoaded && !briefingDismissed.current) {
      handleBriefingCheck();
    }
  }, [dataLoaded, handleBriefingCheck]);

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

  // Show loading spinner while checking auth — AFTER all hooks
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

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

  // Kiosk setup route — Tauri entry point (no Google OAuth)
  if (location.pathname === "/kiosk") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <KioskSetup />
      </ThemeProvider>
    );
  }

  // Dashboard/kiosk route — public, token-based auth (no Google OAuth)
  if (location.pathname.startsWith("/d/")) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/d/:slug/*" element={<Dashboard />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Legal pages are public (no login required) — needed for Google verification
  if (location.pathname === "/privacy") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PrivacyPolicy />
      </ThemeProvider>
    );
  }
  if (location.pathname === "/tos") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TermsOfService />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
      <AnimatedBackground />
      {!isLoggedIn ? (
        <LoginScreen />
      ) : !dataLoaded ? (
        // Data loading from Supabase
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 2 }}>
          <CircularProgress sx={{ color: "#6C5CE7" }} />
          <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>Loading your family data...</Typography>
        </Box>
      ) : showSetup ? (
        <SetupWizard />
      ) : (
        <TimerAlarmProvider familyId={family?.id}>
          <AlertOverlay />
          {/* Event reminder toast */}
          <Snackbar
            open={Boolean(reminderToast)}
            autoHideDuration={8000}
            onClose={() => setReminderToast("")}
            message={reminderToast}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            ContentProps={{
              sx: {
                background: `linear-gradient(135deg, ${tokens.accent.main} 0%, ${tokens.accent.light} 100%)`,
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.95rem",
                borderRadius: "16px",
                boxShadow: `0 8px 32px ${tokens.accent.main}44`,
              },
            }}
          />
          {/* Photo Frame overlay when idle */}
          {isIdle && (googlePhotos.length > 0 || photos.length > 0) && (
            <PhotoFrame
              photos={googlePhotos.length > 0 ? googlePhotos : photos}
              interval={parseInt(localStorage.getItem("famcal_photo_interval") || "10")}
              weather={weatherData}
              onDismiss={() => { resetTimer(); setGooglePhotos([]); handleBriefingCheck(); }}
            />
          )}

          {/* Daily Briefing overlay */}
          {showBriefing && (
            <DailyBriefing
              state={state}
              dispatch={dispatch}
              weather={weatherData}
              onDismiss={handleDismissBriefing}
            />
          )}

          {/* Offline indicator banner */}
          {isOffline && (
            <Box sx={{
              position: "fixed", top: 0, left: 0, right: 0, zIndex: 2100,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#fff", textAlign: "center", py: 0.75, px: 2,
              fontSize: "0.8rem", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
            }}>
              <Icon sx={{ fontSize: "1.2rem !important" }}>wifi_off</Icon>
              You are offline — some features may not work
            </Box>
          )}

          {/* Main app wrapped in KioskWrapper */}
          <KioskWrapper
            enabled={kioskEnabled}
            onToggle={toggleKiosk}
          >
            <HeaderBar
              members={members}
              weatherWidget={headerWeatherWidget}
              countdownWidget={headerCountdownWidget}
              kioskEnabled={kioskEnabled}
              onKioskToggle={toggleKiosk}
              fontScale={fontScale}
              onFontScaleChange={handleFontScaleChange}
              onOpenTimerPanel={() => setTimerPanelOpen(true)}
              urgentMessageCount={(messages || []).filter((m) => m.urgent).length}
              onOpenBriefing={() => handleBriefingCheck(true)}
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
                  <Route path="/calendar" element={<ErrorBoundary><PageTransition><FamilyCalendar /></PageTransition></ErrorBoundary>} />
                  <Route path="/chores" element={<ErrorBoundary><PageTransition><Chores /></PageTransition></ErrorBoundary>} />
                  <Route path="/meals" element={<ErrorBoundary><PageTransition><Meals /></PageTransition></ErrorBoundary>} />
                  <Route path="/lists" element={<ErrorBoundary><PageTransition><Lists /></PageTransition></ErrorBoundary>} />
                  <Route path="/routines" element={<ErrorBoundary><PageTransition><Routines /></PageTransition></ErrorBoundary>} />
                  <Route path="/tasks" element={<Navigate to="/chores" replace />} />
                  <Route path="/family" element={<ErrorBoundary><PageTransition><Family /></PageTransition></ErrorBoundary>} />
                  <Route path="/rewards" element={<ErrorBoundary><PageTransition><Rewards /></PageTransition></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary><PageTransition><Settings /></PageTransition></ErrorBoundary>} />
                  <Route path="/emergency" element={<ErrorBoundary><PageTransition><Emergency /></PageTransition></ErrorBoundary>} />
                  <Route path="*" element={<Navigate to="/calendar" replace />} />
                </Routes>
              </AnimatePresence>
            </Box>
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <FloatingNav />
            </Box>
            {/* AI Assistant FAB — single tap opens Amara */}
            {activeTab !== "settings" && (
              <Box
                onClick={() => setAiOpen(true)}
                sx={{
                  position: "fixed",
                  bottom: { xs: 90, md: 28 },
                  right: 20,
                  zIndex: 1200,
                  width: 56,
                  height: 56,
                  borderRadius: "16px",
                  background: getGrad("primary"),
                  boxShadow: `0 6px 24px ${tokens.accent.main}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    boxShadow: `0 8px 32px ${tokens.accent.main}99`,
                    transform: "scale(1.05)",
                  },
                  "&:active": { transform: "scale(0.95)" },
                }}
              >
                <Icon sx={{ color: "#fff", fontSize: "1.5rem" }}>auto_awesome</Icon>
              </Box>
            )}
            <AIAssistant
              familyId={family?.id}
              dispatch={dispatch}
              state={state}
              currentPage={activeTab}
              externalOpen={aiOpen}
              onExternalClose={() => { setAiOpen(false); voice.endVoiceSession(); }}
              voiceActive={voice.isEnabled}
              voiceState={voice.voiceState}
              voiceTranscript={voice.transcript}
              voiceQuery={voiceQuery}
              onVoiceQueryHandled={() => setVoiceQuery(null)}
              onVoiceResponse={(text) => voice.speakResponse(text)}
              onTapToSpeak={voice.tapToSpeak}
            />
            <TimerAlarmPanel
              open={timerPanelOpen}
              onClose={() => setTimerPanelOpen(false)}
            />
            {/* Voice Mode — listening indicator only (chat happens in AIAssistant) */}
            <VoiceOverlay
              voiceState={voice.voiceState}
              isEnabled={voice.isEnabled}
              onDisable={voice.disable}
              onTapToSpeak={voice.tapToSpeak}
            />
          </KioskWrapper>
        </TimerAlarmProvider>
      )}
      </ErrorBoundary>
    </ThemeProvider>
  );
}
