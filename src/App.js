import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import FloatingNav from "components/FloatingNav";
import PageTransition from "components/PageTransition";

import FamilyCalendar from "layouts/family-calendar";
import Tasks from "layouts/tasks";
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

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ width: { xs: "100%", sm: 400 }, bgcolor: "background.paper", borderRadius: "24px", boxShadow: "0 8px 40px rgba(0,0,0,0.1)", p: { xs: 3, sm: 4 }, textAlign: "center" }}>
          <Icon sx={{ fontSize: "3rem !important", color: "primary.main", mb: 1 }}>calendar_month</Icon>
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 0.5 }}>FamCal</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Your family calendar and task manager
          </Typography>

          {showClientInput ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "left" }}>
                Enter your Google OAuth Client ID to get started.
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="xxxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientIdLocal(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button fullWidth variant="contained" onClick={handleSaveClientId} disabled={!clientId.trim()}>
                Continue
              </Button>
            </Box>
          ) : (
            <Box>
              <Box ref={btnRef} sx={{ display: "flex", justifyContent: "center", mb: 2, minHeight: 44 }} />
              {error && (
                <Typography variant="caption" color="error" sx={{ mb: 1, display: "block" }}>{error}</Typography>
              )}
              <Button size="small" onClick={() => setShowClientInput(true)} sx={{ color: "text.secondary", mt: 1 }}>
                Change Client ID
              </Button>
            </Box>
          )}
        </Box>
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
  const { darkMode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  const { user } = useAuth();
  const [state] = useFamilyController();
  const { members } = state;

  const setupDone = localStorage.getItem("famcal_setup_done") === "true";
  const isLoggedIn = Boolean(user);
  const showSetup = isLoggedIn && !setupDone && members.length === 0;

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
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/calendar" element={<PageTransition><FamilyCalendar /></PageTransition>} />
              <Route path="/tasks" element={<PageTransition><Tasks /></PageTransition>} />
              <Route path="/family" element={<PageTransition><Family /></PageTransition>} />
              <Route path="/rewards" element={<PageTransition><Rewards /></PageTransition>} />
              <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
              <Route path="*" element={<Navigate to="/calendar" replace />} />
            </Routes>
          </AnimatePresence>
          <FloatingNav />
        </>
      )}
    </ThemeProvider>
  );
}
