import { memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";

import { useThemeMode } from "context/ThemeContext";

SmartSidebar.propTypes = {
  notesWidget: PropTypes.node,
  countdownWidget: PropTypes.node,
  todayChoresWidget: PropTypes.node,
  tonightDinnerWidget: PropTypes.node,
  messagesWidget: PropTypes.node,
  collapsed: PropTypes.bool.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
};

function SmartSidebar({
  notesWidget,
  countdownWidget,
  todayChoresWidget,
  tonightDinnerWidget,
  messagesWidget,
  collapsed,
  onToggleCollapse,
}) {
  const { darkMode } = useThemeMode();

  const sections = [
    { key: "messages", widget: messagesWidget, label: "Messages", icon: "forum", placeholder: "Messages widget coming soon" },
    { key: "notes", widget: notesWidget, label: "Notes", icon: "sticky_note_2", placeholder: "Notes widget coming soon" },
    { key: "countdowns", widget: countdownWidget, label: "Countdowns", icon: "timer", placeholder: "Countdowns widget coming soon" },
    { key: "chores", widget: todayChoresWidget, label: "Today's Chores", icon: "task_alt", placeholder: "Chores widget coming soon" },
    { key: "dinner", widget: tonightDinnerWidget, label: "Tonight's Dinner", icon: "restaurant", placeholder: "Dinner widget coming soon" },
  ];

  return (
    <Box
      sx={{
        width: collapsed ? 0 : 280,
        minWidth: collapsed ? 0 : 280,
        height: "100%",
        overflow: "hidden",
        transition: "width 0.3s ease, min-width 0.3s ease, opacity 0.3s ease",
        opacity: collapsed ? 0 : 1,
        display: { xs: "none", lg: "block" },
        flexShrink: 0,
        bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        borderLeft: "1px solid",
        borderColor: darkMode ? "rgba(255,255,255,0.06)" : "divider",
        overflowY: "auto",
      }}
    >
      {/* Toggle button */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          borderBottom: "1px solid",
          borderColor: darkMode ? "rgba(255,255,255,0.06)" : "divider",
          p: 1,
          display: "flex",
          justifyContent: "flex-start",
          zIndex: 10,
        }}
      >
        <IconButton size="small" onClick={onToggleCollapse} sx={{ bgcolor: "action.hover" }}>
          <Icon sx={{ fontSize: "1.1rem !important" }}>
            {collapsed ? "chevron_left" : "chevron_right"}
          </Icon>
        </IconButton>
      </Box>

      {/* Widget sections */}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: "18px" }}>
        {sections.map((section) => {
          // Hide section if widget prop is null/undefined
          if (!section.widget && section.widget !== 0 && section.widget !== false) {
            // For now, show placeholders. When widgets exist, this condition will hide empty sections.
            // Keeping placeholders visible during development.
          }

          return (
            <Box key={section.key}>
              {/* Section header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <Icon sx={{ fontSize: "0.85rem !important", color: "#8B8680" }}>{section.icon}</Icon>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#8B8680",
                    fontWeight: 700,
                  }}
                >
                  {section.label}
                </Typography>
              </Box>

              {/* Widget content or placeholder */}
              <Box>
                {section.widget || (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      border: "1px solid",
                      borderColor: darkMode ? "rgba(255,255,255,0.08)" : "divider",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.disabled",
                        fontSize: "0.75rem",
                        fontStyle: "italic",
                        textAlign: "center",
                      }}
                    >
                      {section.placeholder}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default memo(SmartSidebar);
