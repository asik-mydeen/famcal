/* eslint-disable react/prop-types */
import { memo, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import { motion, AnimatePresence } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";

const PANEL_WIDTH = 380;

function ExpandablePanel({ open, title, icon, onClose, children, contentKey }) {
  const { tokens, darkMode } = useAppTheme();
  const scrollRef = useRef(null);

  // Reset scroll when content switches
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [contentKey]);

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="panel-wrapper"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: PANEL_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          style={{
            overflow: "hidden",
            flexShrink: 0,
            height: "100%",
            display: "flex",
          }}
        >
          <Box
            sx={{
              width: PANEL_WIDTH,
              minWidth: PANEL_WIDTH,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid",
              borderColor: darkMode ? "rgba(255,255,255,0.06)" : "divider",
              bgcolor: tokens.panel?.bg || (darkMode ? "rgba(30,30,40,0.95)" : "#fff"),
              backdropFilter: darkMode ? "blur(40px)" : "none",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 2,
                borderBottom: "1px solid",
                borderColor: darkMode ? "rgba(255,255,255,0.06)" : "divider",
                flexShrink: 0,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={contentKey || title}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  {icon && (
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "10px",
                        background: darkMode
                          ? `${tokens.accent.main}20`
                          : `${tokens.accent.main}10`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon sx={{ color: tokens.accent.main, fontSize: "1.1rem !important" }}>
                        {icon}
                      </Icon>
                    </Box>
                  )}
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>
                    {title}
                  </Typography>
                </motion.div>
              </AnimatePresence>

              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  color: "text.secondary",
                  "&:hover": { bgcolor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                }}
              >
                <Icon sx={{ fontSize: "1.2rem !important" }}>close</Icon>
              </IconButton>
            </Box>

            {/* Content — scrollable, crossfade on switch */}
            <Box
              ref={scrollRef}
              sx={{
                flex: 1,
                overflow: "auto",
                px: 2.5,
                py: 2,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={contentKey || "default"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{ minHeight: "100%" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ExpandablePanel);
