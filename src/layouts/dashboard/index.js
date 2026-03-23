import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";

import { FamilyContext } from "context/FamilyContext";
import AnimatedBackground from "components/AnimatedBackground";
import HeaderBar from "components/HeaderBar";
import TabStrip from "components/TabStrip";
import PageTransition from "components/PageTransition";
import WeatherWidget from "components/WeatherWidget";
import CountdownWidget from "components/CountdownWidget";
import { fetchWeather } from "lib/weather";

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

function DashboardShell({ data, slug, onDisconnect }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { family, members, events, tasks, meals, lists, rewards, notes, countdowns } = data;

  // Map DB rows to client format
  const mappedState = useMemo(() => ({
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
  }), [family, members, events, tasks, meals, lists, rewards, notes, countdowns]);

  // Dashboard dispatch — read-only for now (no mutations from kiosk)
  const dispatch = useCallback(() => {
    // No-op: dashboard is read-only. Manage data from the setup portal.
  }, []);

  const contextValue = useMemo(() => [mappedState, dispatch], [mappedState, dispatch]);

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
    <CountdownWidget variant="header" countdowns={countdowns || []} members={mappedState.members} dispatch={dispatch} familyId={family?.id} />
  ) : null;

  return (
    <FamilyContext.Provider value={contextValue}>
      <AnimatedBackground />
      <HeaderBar
        members={mappedState.members}
        weatherWidget={headerWeatherWidget}
        countdownWidget={headerCountdownWidget}
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
    </FamilyContext.Provider>
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
      const res = await fetch("/api/dashboard", {
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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!authenticated) return;
    const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
    if (!cachedToken) return;
    const interval = setInterval(() => validateAndLoad(cachedToken), 60000);
    return () => clearInterval(interval);
  }, [authenticated, slug, validateAndLoad]);

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
