import { useState, useEffect, useCallback, useMemo, useReducer } from "react";
import { useParams, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";

import { FamilyContext, familyReducer } from "context/FamilyContext";
import { supabase } from "lib/supabase";
import { apiUrl } from "lib/api";
import AnimatedBackground from "components/AnimatedBackground";
import HeaderBar from "components/HeaderBar";
import TabStrip from "components/TabStrip";
import PageTransition from "components/PageTransition";
import WeatherWidget from "components/WeatherWidget";
import CountdownWidget from "components/CountdownWidget";
import { fetchWeather } from "lib/weather";
import AIAssistant from "components/AIAssistant";
import { TimerAlarmProvider } from "context/TimerAlarmContext";
import AlertOverlay from "components/AlertOverlay";
import TimerAlarmPanel from "components/TimerAlarmPanel";

import FamilyCalendar from "layouts/family-calendar";
import Chores from "layouts/chores";
import Meals from "layouts/meals";
import Lists from "layouts/lists";
import Family from "layouts/family";
import Rewards from "layouts/rewards";

// Map DB field names to client field names
function eventFromDb(row) {
  return {
    id: row.id, family_id: row.family_id, member_id: row.member_id,
    title: row.title, start: row.start_time, end: row.end_time,
    allDay: row.all_day, className: row.color || "info",
    source: row.source, google_event_id: row.google_event_id || null,
    updated_at: row.updated_at || null,
  };
}

function taskFromDb(row) {
  return {
    ...row,
    due_time: row.due_time ? row.due_time.slice(0, 5) : "",
    completed_at: row.completed_at ? row.completed_at.split("T")[0] : null,
  };
}

function memberFromDb(row) {
  return { ...row, visible: true };
}

// ── Token Entry Screen ──

function TokenEntry({ slug, onAuthenticated, loading, error }) {
  const [token, setToken] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) onAuthenticated(token.trim());
  };

  return (
    <Box sx={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #FFF8F0 0%, #F5F0FF 50%, #FFF8F0 100%)",
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{
          width: { xs: "90vw", sm: 420 }, bgcolor: "#fff", borderRadius: "24px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.1)", p: { xs: 3, sm: 4 }, textAlign: "center",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 3 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: "14px",
              background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(108,92,231,0.25)",
            }}>
              <Icon sx={{ color: "#fff", fontSize: "1.4rem" }}>calendar_month</Icon>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.02em", color: "#1A1A1A" }}>
              FamCal
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#1A1A1A", mb: 0.5 }}>
            Family Dashboard
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#8B8680", mb: 3, lineHeight: 1.5 }}>
            Enter your access token to view the family calendar.
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter access token" autoFocus
              error={Boolean(error)} helperText={error}
              sx={{ mb: 2 }}
              InputProps={{ sx: { borderRadius: "14px", fontSize: "1.1rem", letterSpacing: "0.05em" } }}
            />
            <Button type="submit" fullWidth variant="contained" size="large"
              disabled={!token.trim() || loading}
              sx={{
                borderRadius: "14px", py: 1.5, fontWeight: 700,
                background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                boxShadow: "0 6px 24px rgba(108,92,231,0.3)",
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Access Dashboard"}
            </Button>
          </form>
        </Box>
      </motion.div>
    </Box>
  );
}

TokenEntry.propTypes = {
  slug: PropTypes.string,
  onAuthenticated: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

// ── Full Dashboard App Shell ──

// Module-level variables for realtime (avoids React ref closure issues in production builds)
let _dashboardChannel = null;
let _lastWriteTime = 0;

function DashboardShell({ data, slug, onDisconnect }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { family, members, events, tasks, meals, lists, rewards, notes, countdowns } = data;

  // Map DB rows to client format for initial state
  const initialState = useMemo(() => ({
    family,
    members: members.map(memberFromDb),
    events: events.map(eventFromDb),
    tasks: tasks.map(taskFromDb),
    meals,
    lists,
    rewards,
    notes: notes || [],
    countdowns: countdowns || [],
    photos: [],
    weather: null,
    selectedMembers: members.map((m) => m.id),
    isSupabaseConnected: true,
    loading: false,
    dataLoaded: true,
    isDashboard: true, // Flag for components to skip Google auth
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Real reducer so components can dispatch locally (ADD_LIST, COMPLETE_TASK, etc.)
  const [state, dispatch] = useReducer(familyReducer, initialState);

  // Update state when API data refreshes (auto-refresh every 60s)
  useEffect(() => {
    dispatch({ type: "SET_MEMBERS", value: members.map(memberFromDb) });
    dispatch({ type: "SET_EVENTS", value: events.map(eventFromDb) });
    dispatch({ type: "SET_TASKS", value: tasks.map(taskFromDb) });
    dispatch({ type: "SET_MEALS", value: meals });
    dispatch({ type: "SET_LISTS", value: lists });
    dispatch({ type: "SET_REWARDS", value: rewards });
    dispatch({ type: "SET_NOTES", value: notes || [] });
    dispatch({ type: "SET_COUNTDOWNS", value: countdowns || [] });
  }, [members, events, tasks, meals, lists, rewards, notes, countdowns]);

  // Persisting dispatch — updates local state AND writes to Supabase via API
  // Write cooldown: after any local write, skip polls for 10s to prevent
  // the poll from overwriting optimistic local state with stale API data.
  const persistingDispatch = useCallback((action) => {
    // Always update local state first
    dispatch(action);
    _lastWriteTime = Date.now();

    // Broadcast change to other clients via realtime channel
    const TABLE_MAP = {
      ADD_EVENT: "events", UPDATE_EVENT: "events", REMOVE_EVENT: "events",
      ADD_TASK: "tasks", UPDATE_TASK: "tasks", COMPLETE_TASK: "tasks", REMOVE_TASK: "tasks",
      ADD_MEAL: "meals", UPDATE_MEAL: "meals", REMOVE_MEAL: "meals",
      ADD_LIST: "lists", ADD_LIST_ITEM: "list_items", TOGGLE_LIST_ITEM: "list_items",
      REMOVE_LIST_ITEM: "list_items", ADD_NOTE: "notes", REMOVE_NOTE: "notes",
      ADD_COUNTDOWN: "countdowns", REMOVE_COUNTDOWN: "countdowns",
    };
    const table = TABLE_MAP[action.type];
    if (table && _dashboardChannel) {
      _dashboardChannel.send({ type: "broadcast", event: "change", payload: { table } }).catch(() => {});
    }

    // Map dispatch actions to API write calls
    const writeToApi = async (apiAction, table, payload) => {
      try {
        const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
        if (!cachedToken) { console.warn("[dashboard-write] No token"); return null; }
        console.log("[dashboard-write]", apiAction, table, payload?.title || payload?.id || "");
        const res = await fetch(apiUrl("/api/dashboard-write"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, token: cachedToken, action: apiAction, table, payload }),
        });
        const result = await res.json();
        if (!res.ok) console.error("[dashboard-write] API error:", result);
        return result?.data || null;
      } catch (err) {
        console.error("[dashboard-write] Failed:", err.message);
        return null;
      }
    };

    // Event field mapping (client → DB)
    const eventToDb = (evt) => ({
      family_id: evt.family_id, member_id: evt.member_id || null,
      title: evt.title, start_time: evt.start, end_time: evt.end || evt.start,
      all_day: evt.allDay || false, color: evt.className || "info",
      source: evt.source || "manual", updated_at: new Date().toISOString(),
      ...(evt.google_event_id && { google_event_id: evt.google_event_id }),
    });

    switch (action.type) {
      case "ADD_EVENT":
        writeToApi("insert", "events", eventToDb(action.value)).then((row) => {
          if (row?.id && action.value.id) {
            // Replace temp ID with real UUID so delete/update works
            dispatch({ type: "UPDATE_EVENT", value: { id: action.value.id, ...row, start: row.start_time, end: row.end_time, allDay: row.all_day, className: row.color } });
          }
        });
        break;
      case "UPDATE_EVENT": {
        const { id, ...rest } = action.value;
        const dbFields = {};
        if (rest.title !== undefined) dbFields.title = rest.title;
        if (rest.start !== undefined) dbFields.start_time = rest.start;
        if (rest.end !== undefined) dbFields.end_time = rest.end;
        if (rest.allDay !== undefined) dbFields.all_day = rest.allDay;
        if (rest.member_id !== undefined) dbFields.member_id = rest.member_id;
        if (rest.className !== undefined) dbFields.color = rest.className;
        writeToApi("update", "events", { id, ...dbFields });
        break;
      }
      case "REMOVE_EVENT":
        writeToApi("delete", "events", { id: action.value });
        break;
      case "ADD_TASK":
        writeToApi("insert", "tasks", action.value).then((row) => {
          if (row?.id && action.value.id) {
            dispatch({ type: "UPDATE_TASK", value: { id: action.value.id, ...row } });
          }
        });
        break;
      case "UPDATE_TASK":
        writeToApi("update", "tasks", action.value);
        break;
      case "COMPLETE_TASK": {
        const { taskId, memberId } = action.value || {};
        if (taskId) writeToApi("update", "tasks", { id: taskId, completed: true, completed_at: new Date().toISOString(), completed_by: memberId });
        break;
      }
      case "REMOVE_TASK":
        writeToApi("delete", "tasks", { id: action.value });
        break;
      case "ADD_MEAL":
        writeToApi("insert", "meals", action.value);
        break;
      case "UPDATE_MEAL":
        writeToApi("update", "meals", action.value);
        break;
      case "REMOVE_MEAL":
        writeToApi("delete", "meals", { id: action.value });
        break;
      case "ADD_LIST":
        writeToApi("insert", "lists", { name: action.value.name, icon: action.value.icon || "checklist" }).then((row) => {
          if (row?.id && action.value.id) {
            dispatch({ type: "UPDATE_LIST", value: { id: action.value.id, ...row } });
          }
        });
        break;
      case "ADD_LIST_ITEM":
        if (action.value?.item) writeToApi("insert", "list_items", action.value.item);
        break;
      case "TOGGLE_LIST_ITEM":
        if (action.value?.itemId) writeToApi("update", "list_items", { id: action.value.itemId, checked: true });
        break;
      case "REMOVE_LIST_ITEM":
        if (action.value?.itemId) writeToApi("delete", "list_items", { id: action.value.itemId });
        break;
      case "ADD_NOTE":
        writeToApi("insert", "notes", action.value);
        break;
      case "REMOVE_NOTE":
        writeToApi("delete", "notes", { id: action.value });
        break;
      case "ADD_COUNTDOWN":
        writeToApi("insert", "countdowns", action.value);
        break;
      case "REMOVE_COUNTDOWN":
        writeToApi("delete", "countdowns", { id: action.value });
        break;
      case "ADD_REWARD":
        writeToApi("insert", "rewards", action.value);
        break;
      default:
        break;
    }
  }, [slug]);

  const contextValue = useMemo(() => [state, persistingDispatch], [state, persistingDispatch]);

  // Kiosk/fullscreen for dashboard — tries Tauri API first, falls back to browser API
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const toggleKiosk = useCallback(async () => {
    const next = !kioskEnabled;
    setKioskEnabled(next);
    try {
      // Try Tauri window API first (works in Tauri app)
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.setFullscreen(next);
    } catch {
      // Fallback to browser Fullscreen API
      if (next) {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el).catch(() => {});
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          exit.call(document).catch(() => {});
        }
      }
    }
  }, [kioskEnabled]);

  // Sync kiosk state when user exits fullscreen via Esc
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setKioskEnabled(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // Font scale (per-device, stored in localStorage)
  const [fontScale, setFontScale] = useState(() => parseFloat(localStorage.getItem("famcal_font_scale") || "1.15"));
  const handleFontScaleChange = useCallback((newScale) => {
    const clamped = Math.max(1.0, Math.min(1.7, newScale));
    const rounded = Math.round(clamped * 20) / 20;
    setFontScale(rounded);
    localStorage.setItem("famcal_font_scale", String(rounded));
    document.documentElement.style.fontSize = `${rounded * 100}%`;
  }, []);

  // Apply font scale on mount
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [fontScale]);

  // Kiosk settings panel
  const [showKioskSettings, setShowKioskSettings] = useState(false);

  // AI Command Bar
  const [aiOpen, setAiOpen] = useState(false);
  const [timerPanelOpen, setTimerPanelOpen] = useState(false);

  // Weather
  const weatherLocation = family?.weather_location || "";
  const [weatherData, setWeatherData] = useState(null);
  useEffect(() => {
    if (weatherLocation) {
      fetchWeather(weatherLocation).then((d) => { if (d) setWeatherData(d); });
    }
  }, [weatherLocation]);

  // Extract active tab from path: /d/slug/chores → "chores"
  const pathParts = location.pathname.split("/");
  const activeTab = pathParts.length > 3 ? pathParts[3] : "calendar";

  const handleTabChange = (key, path) => {
    // Navigate within the dashboard: /d/{slug}/calendar, /d/{slug}/chores, etc.
    navigate(`/d/${slug}/${key}`);
  };

  const headerWeatherWidget = weatherLocation ? (
    <WeatherWidget variant="header" location={weatherLocation} />
  ) : null;

  const headerCountdownWidget = (countdowns || []).length > 0 ? (
    <CountdownWidget variant="header" countdowns={countdowns || []} members={state.members} dispatch={persistingDispatch} familyId={family?.id} />
  ) : null;

  return (
    <TimerAlarmProvider familyId={family?.id}>
    <FamilyContext.Provider value={contextValue}>
      <AlertOverlay />
      <AnimatedBackground />
      <HeaderBar
        members={state.members}
        weatherWidget={headerWeatherWidget}
        countdownWidget={headerCountdownWidget}
        kioskEnabled={kioskEnabled}
        onKioskToggle={toggleKiosk}
        fontScale={fontScale}
        onFontScaleChange={handleFontScaleChange}
        onOpenTimerPanel={() => setTimerPanelOpen(true)}
      />
      <Box className="kiosk-tab-strip" sx={{ display: { xs: "none", md: "flex" }, px: 3, pt: 1 }}>
        <TabStrip activeTab={activeTab} onTabChange={handleTabChange} hideTabs={["settings"]} />
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", pb: { xs: 10, md: 2 } }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="calendar" element={<PageTransition><FamilyCalendar /></PageTransition>} />
            <Route path="chores" element={<PageTransition><Chores /></PageTransition>} />
            <Route path="meals" element={<PageTransition><Meals /></PageTransition>} />
            <Route path="lists" element={<PageTransition><Lists /></PageTransition>} />
            <Route path="family" element={<PageTransition><Family /></PageTransition>} />
            <Route path="rewards" element={<PageTransition><Rewards /></PageTransition>} />
            <Route path="" element={<Navigate to="calendar" replace />} />
            <Route path="*" element={<Navigate to="calendar" replace />} />
          </Routes>
        </AnimatePresence>
      </Box>
      {/* Mobile: show TabStrip at bottom instead of FloatingNav */}
      <Box sx={{ display: { xs: "flex", md: "none" }, position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100, px: 1, pb: 1, bgcolor: "background.default" }}>
        <TabStrip activeTab={activeTab} onTabChange={handleTabChange} hideTabs={["settings"]} />
      </Box>

      {/* Kiosk settings gear button */}
      <Box
        onClick={() => setShowKioskSettings(true)}
        sx={{
          position: "fixed", bottom: { xs: 70, md: 20 }, left: 20, zIndex: 1200,
          width: 40, height: 40, borderRadius: "12px",
          bgcolor: "rgba(0,0,0,0.06)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.4, "&:hover": { opacity: 1, bgcolor: "rgba(108,92,231,0.1)" },
          transition: "all 0.2s ease",
        }}
      >
        <Icon sx={{ fontSize: "1.2rem", color: "text.secondary" }}>settings</Icon>
      </Box>

      {/* Kiosk settings panel */}
      {showKioskSettings && (
        <>
          <Box onClick={() => setShowKioskSettings(false)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.3)", zIndex: 1300 }} />
          <Box sx={{
            position: "fixed", bottom: 80, left: 20, zIndex: 1301, width: 360,
            bgcolor: "background.paper", borderRadius: "20px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)", p: 3,
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <Icon sx={{ fontSize: "1.1rem", color: "primary.main" }}>settings</Icon>
              Kiosk Settings
            </Typography>

            {/* Current config display */}
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>Dashboard</Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, mb: 1.5, wordBreak: "break-all" }}>
              /d/{slug}
            </Typography>

            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>Access Token</Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, mb: 2, fontFamily: "monospace", letterSpacing: "0.1em" }}>
              {localStorage.getItem(`famcal_dashboard_token_${slug}`) || "—"}
            </Typography>

            {/* Reconfigure button */}
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => {
                localStorage.removeItem("famcal_kiosk_slug");
                localStorage.removeItem("famcal_kiosk_token");
                localStorage.removeItem(`famcal_dashboard_token_${slug}`);
                window.location.href = "/kiosk";
              }}
              startIcon={<Icon>link</Icon>}
              sx={{ mb: 1.5, borderRadius: "12px", textTransform: "none" }}
            >
              Change Dashboard / Token
            </Button>

            {/* Disconnect */}
            <Button
              fullWidth
              variant="text"
              size="small"
              color="error"
              onClick={() => {
                localStorage.removeItem("famcal_kiosk_slug");
                localStorage.removeItem("famcal_kiosk_token");
                localStorage.removeItem(`famcal_dashboard_token_${slug}`);
                if (onDisconnect) onDisconnect();
                window.location.href = "/kiosk";
              }}
              startIcon={<Icon>logout</Icon>}
              sx={{ borderRadius: "12px", textTransform: "none", fontSize: "0.8rem" }}
            >
              Disconnect Kiosk
            </Button>
          </Box>
        </>
      )}

      {/* AI Assistant FAB — single tap opens Amara */}
      <Box
        onClick={() => setAiOpen(true)}
        sx={{
          position: "fixed",
          bottom: { xs: 70, md: 28 },
          right: 20,
          zIndex: 1200,
          width: 56,
          height: 56,
          borderRadius: "16px",
          background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
          boxShadow: "0 6px 24px rgba(108,92,231,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          touchAction: "manipulation",
          transition: "all 0.2s ease",
          "&:hover": {
            boxShadow: "0 8px 32px rgba(108,92,231,0.6)",
            transform: "scale(1.05)",
          },
          "&:active": { transform: "scale(0.95)" },
        }}
      >
        <Icon sx={{ color: "#fff", fontSize: "1.5rem" }}>auto_awesome</Icon>
      </Box>

      {/* AI Assistant */}
      <AIAssistant
        familyId={family?.id}
        dispatch={persistingDispatch}
        state={state}
        currentPage={activeTab}
        externalOpen={aiOpen}
        onExternalClose={() => setAiOpen(false)}
      />
      <TimerAlarmPanel
        open={timerPanelOpen}
        onClose={() => setTimerPanelOpen(false)}
      />
    </FamilyContext.Provider>
    </TimerAlarmProvider>
  );
}

DashboardShell.propTypes = {
  data: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
  onDisconnect: PropTypes.func,
};

// ── Main Dashboard Component ──

function Dashboard() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  const validateAndLoad = useCallback(async (accessToken) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/dashboard"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, token: accessToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Invalid access token");
      }
      const result = await res.json();
      setData(result);
      setAuthenticated(true);
      localStorage.setItem(`famcal_dashboard_token_${slug}`, accessToken);
    } catch (err) {
      setError(err.message);
      setAuthenticated(false);
      localStorage.removeItem(`famcal_dashboard_token_${slug}`);
    }
    setLoading(false);
  }, [slug]);

  // Check for cached token on mount
  useEffect(() => {
    const cached = localStorage.getItem(`famcal_dashboard_token_${slug}`);
    if (cached) {
      validateAndLoad(cached);
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Supabase Realtime: instant sync via broadcast+triggers (replaces polling)
  // Database triggers broadcast changes to topic "family:<id>".
  // Dashboard subscribes and refetches on each change.
  useEffect(() => {
    if (!authenticated || !data?.family?.id) return;

    let channel;
    let fallbackInterval;

    const url = supabase?.supabaseUrl || "";
    if (!url || url.includes("your-project")) {
      // No Supabase configured — use polling fallback
      const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
      if (cachedToken) {
        fallbackInterval = setInterval(() => validateAndLoad(cachedToken), 30000);
      }
      return () => { if (fallbackInterval) clearInterval(fallbackInterval); };
    }

    channel = supabase.channel(`family:${data.family.id}`, {
      config: { broadcast: { self: false } },
    });

    const handleChange = () => {
      if (Date.now() - _lastWriteTime > 3000) {
        const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
        if (cachedToken) validateAndLoad(cachedToken);
      }
    };

    channel.on("broadcast", { event: "change" }, handleChange);
    channel.on("broadcast", { event: "INSERT" }, handleChange);
    channel.on("broadcast", { event: "UPDATE" }, handleChange);
    channel.on("broadcast", { event: "DELETE" }, handleChange);

    // Store channel ref immediately for broadcast sending
    _dashboardChannel = channel;

    channel.subscribe((status) => {
      console.log("[realtime] Dashboard:", status);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.log("[realtime] Failed — falling back to 30s polling");
        const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
        if (cachedToken) {
          fallbackInterval = setInterval(() => validateAndLoad(cachedToken), 30000);
        }
      }
    });

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (channel) supabase.removeChannel(channel);
      _dashboardChannel = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, data?.family?.id, slug]);

  // Trigger server-side Google Calendar sync periodically (every 10 min)
  // This uses stored refresh tokens — no browser Google session needed
  useEffect(() => {
    if (!authenticated || !data?.family?.id) return;
    const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
    if (!cachedToken) return;

    const triggerSync = () => {
      fetch(apiUrl(`/api/google-sync?familyId=${data.family.id}&token=${cachedToken}`))
        .then((r) => r.json())
        .then((result) => {
          if (result.synced > 0) {
            console.log("[dashboard] Server-side Google sync:", result.results);
            // Refresh data to pick up new events
            validateAndLoad(cachedToken);
          }
        })
        .catch(() => {}); // Silent — best effort
    };

    // Sync immediately on load, then every 10 minutes
    triggerSync();
    const interval = setInterval(triggerSync, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authenticated, data?.family?.id, slug, validateAndLoad]);

  const handleDisconnect = () => {
    localStorage.removeItem(`famcal_dashboard_token_${slug}`);
    setAuthenticated(false);
    setData(null);
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh",
        background: "linear-gradient(135deg, #FFF8F0 0%, #F5F0FF 50%, #FFF8F0 100%)" }}>
        <CircularProgress sx={{ color: "#6C5CE7" }} />
      </Box>
    );
  }

  if (!authenticated) {
    return <TokenEntry slug={slug} onAuthenticated={validateAndLoad} loading={loading} error={error} />;
  }

  return <DashboardShell data={data} slug={slug} onDisconnect={handleDisconnect} />;
}

export default Dashboard;
