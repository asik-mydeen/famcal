import { memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";
import { useThemeMode } from "context/ThemeContext";

const TABS = [
  { key: "calendar", label: "Calendar", icon: "calendar_today", path: "/calendar" },
  { key: "chores", label: "Chores", icon: "task_alt", path: "/chores" },
  { key: "meals", label: "Meals", icon: "restaurant", path: "/meals" },
  { key: "lists", label: "Lists", icon: "checklist", path: "/lists" },
  { key: "rewards", label: "Rewards", icon: "emoji_events", path: "/rewards" },
  { key: "family", label: "Family", icon: "group", path: "/family" },
  { key: "settings", label: "", icon: "settings", path: "/settings" },
];

function TabStrip({ activeTab, onTabChange, rightSlot, hideTabs }) {
  const theme = useTheme();
  const { darkMode } = useThemeMode();

  const visibleTabs = hideTabs ? TABS.filter((t) => !hideTabs.includes(t.key)) : TABS;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: "14px",
        backgroundColor: darkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Box
              key={tab.key}
              onClick={() => onTabChange(tab.key, tab.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 2,
                py: 1,
                borderRadius: "10px",
                cursor: "pointer",
                touchAction: "manipulation",
                userSelect: "none",
                transition: "all 0.2s ease",
                ...(isActive
                  ? {
                      background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      boxShadow: "0 3px 10px rgba(108, 92, 231, 0.25)",
                    }
                  : {
                      color: darkMode ? "rgba(255, 255, 255, 0.4)" : "#8B8680",
                      "&:hover": {
                        backgroundColor: darkMode
                          ? "rgba(255, 255, 255, 0.06)"
                          : "rgba(0, 0, 0, 0.05)",
                      },
                    }),
              }}
            >
              <Icon
                sx={{
                  fontSize: "1.25rem",
                  color: "inherit",
                }}
              >
                {tab.icon}
              </Icon>
              {tab.label && (
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: "inherit",
                    color: "inherit",
                    lineHeight: 1,
                  }}
                >
                  {tab.label}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {rightSlot && (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {rightSlot}
        </Box>
      )}
    </Box>
  );
}

TabStrip.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  rightSlot: PropTypes.node,
  hideTabs: PropTypes.arrayOf(PropTypes.string),
};

export { TABS };
export default memo(TabStrip);
