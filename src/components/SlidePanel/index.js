/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import { useThemeMode } from "context/ThemeContext";

/**
 * SlidePanel — Reusable slide-over panel that replaces all modals/dialogs.
 * Slides in from the right on desktop, full-screen from bottom on mobile.
 *
 * Props:
 *   open (bool)        — whether the panel is visible
 *   onClose (fn)       — called when panel should close
 *   title (string)     — header title
 *   subtitle (string)  — optional subtitle below title
 *   icon (string)      — optional Material Icon name for the header
 *   children (node)    — panel content (form fields, etc.)
 *   actions (node)     — optional footer actions (save/cancel buttons)
 *   width (number|string) — panel width on desktop (default: 420)
 */
function SlidePanel({ open, onClose, title, subtitle, icon, children, actions, width = 420 }) {
  const { darkMode } = useThemeMode();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: width },
          maxWidth: "100vw",
          background: darkMode ? "rgba(10,10,26,0.98)" : "#ffffff",
          backdropFilter: darkMode ? "blur(40px)" : "none",
          borderLeft: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 3, py: 2.5,
        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        flexShrink: 0,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {icon && (
            <Box sx={{
              width: 40, height: 40, borderRadius: "12px",
              background: darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon sx={{ color: "primary.main", fontSize: "1.2rem" }}>{icon}</Icon>
            </Box>
          )}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{
          color: "text.secondary",
          "&:hover": { background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
        }}>
          <Icon>close</Icon>
        </IconButton>
      </Box>

      {/* Content — scrollable */}
      <Box sx={{
        flex: 1, overflow: "auto", px: 3, py: 2.5,
        display: "flex", flexDirection: "column", gap: 2.5,
      }}>
        {children}
      </Box>

      {/* Footer actions */}
      {actions && (
        <Box sx={{
          px: 3, py: 2,
          borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          display: "flex", gap: 1.5, justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          {actions}
        </Box>
      )}
    </Drawer>
  );
}

export default memo(SlidePanel);
