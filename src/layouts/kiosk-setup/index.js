import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import { motion } from "framer-motion";

/**
 * Kiosk Setup — Tauri-only entry point.
 * No Google login. Just enter dashboard slug + token.
 * Auto-redirects to /d/{slug} if previously configured.
 */
function KioskSetup() {
  const navigate = useNavigate();
  const [dashboardLink, setDashboardLink] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Auto-redirect if already configured
  useEffect(() => {
    const savedSlug = localStorage.getItem("famcal_kiosk_slug");
    const savedToken = localStorage.getItem("famcal_kiosk_token");
    if (savedSlug && savedToken) {
      // Ensure the dashboard token is also cached for the Dashboard component
      localStorage.setItem(`famcal_dashboard_token_${savedSlug}`, savedToken);
      navigate(`/d/${savedSlug}/calendar`, { replace: true });
    } else {
      setLoading(false);
    }
  }, [navigate]);

  // Extract slug from a pasted URL like https://calendar-app-01.vercel.app/d/my-family-kqpv
  const extractSlug = (input) => {
    const trimmed = input.trim();
    // If it's a URL, extract the slug after /d/
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    // Otherwise treat the whole input as the slug
    return trimmed;
  };

  const handleSetup = async () => {
    const s = extractSlug(dashboardLink);
    const t = token.trim();
    if (!s || !t) return;

    setLoading(true);
    setError("");

    try {
      // Validate the token works
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s, token: t }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Invalid link or token. Check your Settings > Kiosk section.");
      }

      // Save for auto-redirect on next launch
      localStorage.setItem("famcal_kiosk_slug", s);
      localStorage.setItem("famcal_kiosk_token", t);
      localStorage.setItem(`famcal_dashboard_token_${s}`, t);

      navigate(`/d/${s}/calendar`, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg, #FFF8F0 0%, #F5F0FF 50%, #FFF8F0 100%)" }}>
        <Box sx={{ textAlign: "center" }}>
          <Icon sx={{ fontSize: "2.5rem", color: "#6C5CE7", mb: 1, animation: "pulse 1.5s infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } } }}>calendar_month</Icon>
          <Typography sx={{ color: "#8B8680", fontSize: "0.9rem" }}>Loading dashboard...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #FFF8F0 0%, #F5F0FF 50%, #FFF8F0 100%)",
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{
          width: { xs: "90vw", sm: 440 }, bgcolor: "#fff", borderRadius: "24px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.1)", p: 4, textAlign: "center",
        }}>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 3 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: "16px",
              background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(108,92,231,0.25)",
            }}>
              <Icon sx={{ color: "#fff", fontSize: "1.6rem" }}>tv</Icon>
            </Box>
            <Box sx={{ textAlign: "left" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.02em", color: "#1A1A1A", lineHeight: 1.2 }}>
                FamCal Kiosk
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#8B8680" }}>
                Wall Display Setup
              </Typography>
            </Box>
          </Box>

          <Typography sx={{ fontSize: "0.9rem", color: "#8B8680", mb: 3, lineHeight: 1.6 }}>
            Enter your dashboard details from
            <br />FamCal Settings &rarr; Kiosk / Wall Display.
          </Typography>

          <TextField
            fullWidth
            value={dashboardLink}
            onChange={(e) => { setDashboardLink(e.target.value); setError(""); }}
            label="Dashboard Link"
            placeholder="Paste your dashboard link from Settings"
            helperText="From Settings → Kiosk → Dashboard Link"
            sx={{ mb: 2 }}
            InputProps={{ sx: { borderRadius: "14px", fontSize: "0.9rem" } }}
          />

          <TextField
            fullWidth
            value={token}
            onChange={(e) => { setToken(e.target.value); setError(""); }}
            label="Access Token"
            placeholder="e.g., A7L7IC29"
            error={Boolean(error)}
            helperText={error || "From Settings → Kiosk → Access Token"}
            sx={{ mb: 3 }}
            InputProps={{ sx: { borderRadius: "14px", letterSpacing: "0.1em", fontSize: "1.1rem" } }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSetup}
            disabled={!dashboardLink.trim() || !token.trim() || loading}
            sx={{
              borderRadius: "14px", py: 1.5, fontWeight: 700, fontSize: "1rem",
              background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
              boxShadow: "0 6px 24px rgba(108,92,231,0.3)",
              "&:hover": { boxShadow: "0 8px 32px rgba(108,92,231,0.45)" },
            }}
          >
            Launch Dashboard
          </Button>

          <Typography sx={{ mt: 3, fontSize: "0.7rem", color: "#C4C0B8" }}>
            This kiosk will remember your settings. To reconfigure, clear app data.
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}

export default KioskSetup;
