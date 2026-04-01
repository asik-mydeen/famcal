/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import { useAppTheme } from "context/ThemeContext";

const RAIL_WIDTH = 52;

function IconRail({ items, activeKey, onSelect }) {
  const { tokens, darkMode } = useAppTheme();

  return (
    <Box
      sx={{
        width: RAIL_WIDTH,
        minWidth: RAIL_WIDTH,
        height: "100%",
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.75,
        py: 1.5,
        borderLeft: "1px solid",
        borderColor: darkMode ? "rgba(255,255,255,0.06)" : "divider",
        bgcolor: darkMode ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.008)",
        flexShrink: 0,
        borderRadius: "0 16px 16px 0",
        my: 1,
        mr: 0.5,
      }}
    >
      {items.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <Tooltip key={item.key} title={item.label} placement="left" arrow>
            <Box
              onClick={() => onSelect(isActive ? null : item.key)}
              sx={{
                width: 38,
                height: 38,
                borderRadius: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                touchAction: "manipulation",
                bgcolor: isActive
                  ? darkMode ? `${tokens.accent.main}25` : `${tokens.accent.main}12`
                  : "transparent",
                color: isActive
                  ? tokens.accent.main
                  : darkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: isActive
                    ? darkMode ? `${tokens.accent.main}30` : `${tokens.accent.main}18`
                    : darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  color: isActive ? tokens.accent.main : darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                },
                "&:active": { transform: "scale(0.9)" },
              }}
            >
              <Icon sx={{ fontSize: "1.2rem !important" }}>{item.icon}</Icon>

              {/* Badge */}
              {item.badge > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 1,
                    right: 1,
                    minWidth: 15,
                    height: 15,
                    borderRadius: "8px",
                    bgcolor: tokens.accent.main,
                    color: "#fff",
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 0.3,
                    lineHeight: 1,
                    boxShadow: `0 1px 4px ${tokens.accent.main}50`,
                  }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </Box>
              )}

              {/* Active indicator dot */}
              {isActive && (
                <Box
                  sx={{
                    position: "absolute",
                    left: -6,
                    width: 3,
                    height: 16,
                    borderRadius: "0 3px 3px 0",
                    bgcolor: tokens.accent.main,
                  }}
                />
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export default memo(IconRail);
