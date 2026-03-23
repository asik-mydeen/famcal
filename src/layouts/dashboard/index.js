import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import { motion } from "framer-motion";

function Dashboard() {
  const { slug } = useParams();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Check for cached token on mount
  useEffect(() => {
    const cached = localStorage.getItem(`famcal_dashboard_token_${slug}`);
    if (cached) {
      setToken(cached);
      validateAndLoad(cached);
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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
      // Cache the token for this device
      localStorage.setItem(`famcal_dashboard_token_${slug}`, accessToken);
    } catch (err) {
      setError(err.message);
      setAuthenticated(false);
      // Clear cached token if invalid
      localStorage.removeItem(`famcal_dashboard_token_${slug}`);
    }
    setLoading(false);
  }, [slug]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      validateAndLoad(token.trim());
    }
  };

  // Auto-refresh data every 60 seconds
  useEffect(() => {
    if (!authenticated) return;
    const cachedToken = localStorage.getItem(`famcal_dashboard_token_${slug}`);
    if (!cachedToken) return;

    const interval = setInterval(() => {
      validateAndLoad(cachedToken);
    }, 60000);

    return () => clearInterval(interval);
  }, [authenticated, slug, validateAndLoad]);

  // Loading state
  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg, #FFF8F0 0%, #F5F0FF 50%, #FFF8F0 100%)" }}>
        <CircularProgress sx={{ color: "#6C5CE7" }} />
      </Box>
    );
  }

  // Token entry form
  if (!authenticated) {
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
            {/* Logo */}
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
              <br />Get this from your FamCal settings.
            </Typography>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(""); }}
                placeholder="Enter access token"
                autoFocus
                error={Boolean(error)}
                helperText={error}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: "14px", fontSize: "1.1rem", textAlign: "center", letterSpacing: "0.1em" },
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={!token.trim() || loading}
                sx={{
                  borderRadius: "14px", py: 1.5, fontWeight: 700, fontSize: "1rem",
                  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                  boxShadow: "0 6px 24px rgba(108,92,231,0.3)",
                  "&:hover": { boxShadow: "0 8px 32px rgba(108,92,231,0.45)" },
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

  // Dashboard view — show family data
  // For now, show a summary. Later this will be the full kiosk UI.
  const { family, members, events, tasks } = data;
  const today = new Date().toISOString().split("T")[0];
  const todayEvents = events.filter((e) => (e.start_time || "").startsWith(today));
  const todayTasks = tasks.filter((t) => t.due_date === today && !t.completed);

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #FFF8F0 0%, #F5F0FF 50%, #FFF8F0 100%)", p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.3rem", sm: "1.8rem" }, color: "#1A1A1A", letterSpacing: "-0.03em" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#8B8680" }}>
            {family.name}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", sm: "1.5rem" }, color: "#1A1A1A" }}>
          {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
        </Typography>
      </Box>

      {/* Family members */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, overflowX: "auto" }}>
        {members.map((m) => (
          <Box key={m.id} sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: "50%", bgcolor: m.avatar_color || "#6C5CE7",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 12px ${m.avatar_color || "#6C5CE7"}30`,
              mb: 0.5,
            }}>
              <Icon sx={{ color: "#fff", fontSize: "1.2rem" }}>person</Icon>
            </Box>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#1A1A1A" }}>
              {m.name.split(" ")[0]}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Today's events */}
      <Box sx={{ bgcolor: "#fff", borderRadius: "20px", p: 3, mb: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Icon sx={{ fontSize: "1.1rem", color: "#6C5CE7" }}>event</Icon>
          Today&apos;s Events ({todayEvents.length})
        </Typography>
        {todayEvents.length === 0 ? (
          <Typography sx={{ fontSize: "0.85rem", color: "#8B8680" }}>No events today</Typography>
        ) : todayEvents.map((evt) => {
          const member = members.find((m) => m.id === evt.member_id);
          const time = evt.all_day ? "All day" : new Date(evt.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          return (
            <Box key={evt.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <Box sx={{ width: 4, height: 32, borderRadius: 2, bgcolor: member?.avatar_color || "#6C5CE7" }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{evt.title}</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "#8B8680" }}>{time} {member ? `— ${member.name}` : ""}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Today's tasks */}
      <Box sx={{ bgcolor: "#fff", borderRadius: "20px", p: 3, mb: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Icon sx={{ fontSize: "1.1rem", color: "#22c55e" }}>task_alt</Icon>
          Today&apos;s Chores ({todayTasks.length})
        </Typography>
        {todayTasks.length === 0 ? (
          <Typography sx={{ fontSize: "0.85rem", color: "#8B8680" }}>All done for today!</Typography>
        ) : todayTasks.map((task) => {
          const member = members.find((m) => m.id === task.assigned_to);
          return (
            <Box key={task.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <Icon sx={{ fontSize: "1rem", color: "#8B8680" }}>radio_button_unchecked</Icon>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{task.title}</Typography>
                {member && <Typography sx={{ fontSize: "0.7rem", color: "#8B8680" }}>{member.name} — {task.points_value || 10}pts</Typography>}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Disconnect button */}
      <Box sx={{ textAlign: "center", mt: 4, pb: 2 }}>
        <Button
          size="small"
          variant="text"
          onClick={() => {
            localStorage.removeItem(`famcal_dashboard_token_${slug}`);
            setAuthenticated(false);
            setData(null);
            setToken("");
          }}
          sx={{ color: "#8B8680", fontSize: "0.75rem" }}
          startIcon={<Icon sx={{ fontSize: "0.9rem" }}>logout</Icon>}
        >
          Disconnect Dashboard
        </Button>
      </Box>
    </Box>
  );
}

export default Dashboard;
