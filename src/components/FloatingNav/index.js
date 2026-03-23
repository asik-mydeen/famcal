import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";

const navItems = [
  { path: "/calendar", label: "Calendar", icon: "calendar_month" },
  { path: "/chores", label: "Chores", icon: "task_alt" },
  { path: "/meals", label: "Meals", icon: "restaurant" },
  { path: "/lists", label: "Lists", icon: "checklist" },
  { path: null, label: "More", icon: "more_horiz" },
];

const moreMenuItems = [
  { path: "/rewards", label: "Rewards", icon: "emoji_events" },
  { path: "/family", label: "Family", icon: "group" },
  { path: "/settings", label: "Settings", icon: "settings" },
];

export default function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const accent = theme.palette.primary.main;
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const moreMenuOpen = Boolean(moreAnchorEl);

  const handleMoreClick = (event) => {
    setMoreAnchorEl(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreAnchorEl(null);
  };

  const handleMoreItemClick = (path) => {
    navigate(path);
    handleMoreClose();
  };

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
          const isMoreButton = item.path === null;

          return (
            <Box
              key={item.label}
              onClick={isMoreButton ? handleMoreClick : () => navigate(item.path)}
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
                    fontSize: "1.5rem",
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

      {/* More Menu */}
      <Menu
        anchorEl={moreAnchorEl}
        open={moreMenuOpen}
        onClose={handleMoreClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: "12px",
            minWidth: 160,
            background: dark ? "#1A1A2E" : "#ffffff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            mb: 1,
          },
        }}
      >
        {moreMenuItems.map((menuItem) => (
          <MenuItem
            key={menuItem.path}
            onClick={() => handleMoreItemClick(menuItem.path)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 1.25,
              px: 2,
              color: dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
              "&:hover": {
                backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
              },
            }}
          >
            <Icon sx={{ fontSize: "1.25rem", color: accent }}>{menuItem.icon}</Icon>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {menuItem.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </motion.div>
  );
}
