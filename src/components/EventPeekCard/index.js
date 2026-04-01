/* eslint-disable react/prop-types */
import { memo, useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import { motion, AnimatePresence } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";

function EventPeekCard({ event, anchorRect, members, commentCount, onEdit, onComment, onDelete, onClose }) {
  const { tokens, darkMode } = useAppTheme();
  const [confirming, setConfirming] = useState(false);

  const member = members?.find((m) => m.id === event?.member_id);
  const memberColor = member?.avatar_color || tokens.accent.main;
  const memberName = member?.name || "Family";

  // Position: prefer below the event, flip above if near bottom
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardHeight = 120;
  const showAbove = anchorRect && (anchorRect.bottom + cardHeight + 16 > viewportH);

  const top = anchorRect
    ? showAbove
      ? anchorRect.top - cardHeight - 8
      : anchorRect.bottom + 8
    : 200;
  const left = anchorRect
    ? Math.min(Math.max(anchorRect.left, 16), (typeof window !== "undefined" ? window.innerWidth : 1200) - 316)
    : 200;

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const timeStr = event?.allDay
    ? "All day"
    : `${formatTime(event?.start)} – ${formatTime(event?.end)}`;

  // Close on outside click
  const handleOutsideClick = useCallback((e) => {
    const card = document.getElementById("event-peek-card");
    if (card && !card.contains(e.target)) onClose();
  }, [onClose]);

  useEffect(() => {
    if (event) {
      document.addEventListener("pointerdown", handleOutsideClick, true);
      return () => document.removeEventListener("pointerdown", handleOutsideClick, true);
    }
  }, [event, handleOutsideClick]);

  // Delete with inline confirm
  const handleDelete = () => {
    if (confirming) {
      onDelete(event);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      {event && anchorRect && (
        <motion.div
          id="event-peek-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            position: "fixed",
            top,
            left,
            zIndex: 1400,
            width: 300,
            pointerEvents: "auto",
          }}
        >
          <Box
            sx={{
              bgcolor: darkMode ? "rgba(35,35,45,0.96)" : "rgba(255,255,255,0.98)",
              backdropFilter: "blur(24px)",
              borderRadius: "16px",
              boxShadow: darkMode
                ? "0 8px 32px rgba(0,0,0,0.5)"
                : "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid",
              borderColor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {/* Event info */}
            <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: memberColor,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {event.title}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", pl: 2.5 }}>
                {timeStr} · {memberName}
              </Typography>
            </Box>

            {/* Divider */}
            <Box sx={{ mx: 2, borderTop: "1px solid", borderColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />

            {/* Actions */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                px: 2,
                py: 1.5,
              }}
            >
              <IconButton
                onClick={() => onEdit(event)}
                size="small"
                sx={{
                  borderRadius: "10px",
                  px: 1.5,
                  gap: 0.5,
                  fontSize: "0.78rem",
                  color: "text.secondary",
                  touchAction: "manipulation",
                  "&:hover": { bgcolor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                }}
              >
                <Icon sx={{ fontSize: "1.1rem !important" }}>edit</Icon>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>Edit</Typography>
              </IconButton>

              <IconButton
                onClick={() => onComment(event)}
                size="small"
                sx={{
                  borderRadius: "10px",
                  px: 1.5,
                  gap: 0.5,
                  position: "relative",
                  color: "text.secondary",
                  touchAction: "manipulation",
                  "&:hover": { bgcolor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                }}
              >
                <Icon sx={{ fontSize: "1.1rem !important" }}>chat_bubble_outline</Icon>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                  {commentCount || 0}
                </Typography>
              </IconButton>

              <IconButton
                onClick={handleDelete}
                size="small"
                sx={{
                  borderRadius: "10px",
                  px: 1.5,
                  gap: 0.5,
                  color: confirming ? "#fff" : "text.secondary",
                  bgcolor: confirming ? tokens.priority?.high || "#ef4444" : "transparent",
                  touchAction: "manipulation",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: confirming
                      ? tokens.priority?.high || "#ef4444"
                      : darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  },
                }}
              >
                <Icon sx={{ fontSize: "1.1rem !important" }}>
                  {confirming ? "warning" : "delete_outline"}
                </Icon>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                  {confirming ? "Confirm?" : "Delete"}
                </Typography>
              </IconButton>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(EventPeekCard);
