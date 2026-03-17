import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";

const navItems = [
  { path: "/calendar", label: "Calendar", icon: "calendar_month" },
  { path: "/tasks", label: "Tasks", icon: "checklist" },
  { path: "/family", label: "Family", icon: "people" },
  { path: "/rewards", label: "Rewards", icon: "emoji_events" },
  { path: "/settings", label: "Settings", icon: "settings" },
];

export default function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const accent = theme.palette.primary.main;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 0,
          px: 1,
          py: 0.5,
          background: dark ? "#111127" : "#ffffff",
          borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          boxShadow: dark ? "none" : "0 -2px 12px rgba(0,0,0,0.04)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                maxWidth: 80,
                py: 0.75,
                cursor: "pointer",
                transition: "all 0.2s ease",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                "&:active": { transform: "scale(0.92)" },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 32,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isActive ? `${accent}18` : "transparent",
                  transition: "background 0.2s ease",
                  mb: 0.25,
                }}
              >
                <Icon
                  sx={{
                    fontSize: 24,
                    color: isActive ? accent : dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {item.icon}
                </Icon>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.625rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? accent : dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                  transition: "color 0.2s ease",
                  lineHeight: 1,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </motion.div>
  );
}
