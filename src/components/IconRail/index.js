/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import { useAppTheme } from "context/ThemeContext";

const ICON_SIZE = 52;

function IconRail({ items, activeKey, onSelect }) {
  const { tokens, darkMode } = useAppTheme();

  return (
    <Box
      sx={{
        width: ICON_SIZE,
        minWidth: ICON_SIZE,
        height: "100%",
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        pt: 1.5,
        pb: 1,
        borderLeft: "1px solid",
        borderColor: darkMode ? "rgba(255,255,255,0.06)" : "divider",
        bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <Tooltip key={item.key} title={item.label} placement="left" arrow>
            <Box
              onClick={() => onSelect(isActive ? null : item.key)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
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
                  : darkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: isActive
                    ? darkMode ? `${tokens.accent.main}30` : `${tokens.accent.main}18`
                    : darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                },
                "&:active": { transform: "scale(0.92)" },
              }}
            >
              <Icon sx={{ fontSize: "1.3rem !important" }}>{item.icon}</Icon>

              {/* Badge */}
              {item.badge > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: "8px",
                    bgcolor: tokens.accent.main,
                    color: "#fff",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 0.4,
                    lineHeight: 1,
                  }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </Box>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export default memo(IconRail);
