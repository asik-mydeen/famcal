import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useThemeMode } from "context/ThemeContext";

// Map action types to navigation targets
const ACTION_NAV = {
  create_event: { page: "/calendar", label: "Go to Calendar", icon: "calendar_today" },
  update_event: { page: "/calendar", label: "Go to Calendar", icon: "calendar_today" },
  add_meal: { page: "/meals", label: "Go to Meals", icon: "restaurant" },
  update_meal: { page: "/meals", label: "Go to Meals", icon: "restaurant" },
  create_task: { page: "/chores", label: "Go to Chores", icon: "task_alt" },
  update_task: { page: "/chores", label: "Go to Chores", icon: "task_alt" },
  complete_task: { page: "/chores", label: "Go to Chores", icon: "task_alt" },
  add_list_items: { page: "/lists", label: "Go to Lists", icon: "checklist" },
  create_list: { page: "/lists", label: "Go to Lists", icon: "checklist" },
  add_reward: { page: "/rewards", label: "Go to Rewards", icon: "emoji_events" },
  claim_reward: { page: "/rewards", label: "Go to Rewards", icon: "emoji_events" },
};

function MessageBubble({ role, content, actions, timestamp, onNavigate }) {
  const { darkMode } = useThemeMode();

  // Format timestamp to relative time
  const getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isUser = role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          maxWidth: "85%",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {/* Message bubble */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            background: isUser
              ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
              : darkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            color: isUser ? "#fff" : darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            position: "relative",
          }}
        >
          {/* Markdown rendering for assistant, plain text for user */}
          {isUser ? (
            <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.6, color: "inherit" }}>
              {content}
            </Typography>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      lineHeight: 1.6,
                      mb: 0.5,
                      "&:last-child": { mb: 0 },
                      color: "inherit",
                    }}
                  >
                    {children}
                  </Typography>
                ),
                ul: ({ children }) => (
                  <Box component="ul" sx={{ pl: 2.5, my: 0.5 }}>
                    {children}
                  </Box>
                ),
                ol: ({ children }) => (
                  <Box component="ol" sx={{ pl: 2.5, my: 0.5 }}>
                    {children}
                  </Box>
                ),
                li: ({ children }) => (
                  <Typography component="li" sx={{ fontSize: "0.88rem", mb: 0.25 }}>
                    {children}
                  </Typography>
                ),
                code: ({ inline, children }) =>
                  inline ? (
                    <Box
                      component="code"
                      sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: "4px",
                        background: darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)",
                        fontFamily: "monospace",
                        fontSize: "0.85em",
                      }}
                    >
                      {children}
                    </Box>
                  ) : (
                    <Box
                      component="pre"
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: "8px",
                        background: darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)",
                        overflow: "auto",
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                      }}
                    >
                      <code>{children}</code>
                    </Box>
                  ),
                strong: ({ children }) => (
                  <Box component="strong" sx={{ fontWeight: 700 }}>
                    {children}
                  </Box>
                ),
                em: ({ children }) => (
                  <Box component="em" sx={{ fontStyle: "italic" }}>
                    {children}
                  </Box>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </Box>

        {/* Action badges (if present) */}
        {actions && actions.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              flexWrap: "wrap",
              alignSelf: isUser ? "flex-end" : "flex-start",
            }}
          >
            {actions.map((action, i) => {
              const actionLabels = {
                create_event: "event created",
                update_event: "event updated",
                remove_event: "event removed",
                create_task: "task created",
                complete_task: "task completed",
                add_meal: "meal added",
                add_note: "note added",
                add_countdown: "countdown created",
              };

              const actionColors = {
                create_event: "#6C5CE7",
                create_task: "#00B894",
                complete_task: "#22c55e",
                add_meal: "#E17055",
              };

              return (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.25,
                    py: 0.4,
                    borderRadius: "8px",
                    background: `${actionColors[action.type] || "#6C5CE7"}15`,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: actionColors[action.type] || "#6C5CE7",
                  }}
                >
                  <Icon sx={{ fontSize: "0.85rem" }}>check_circle</Icon>
                  {actionLabels[action.type] || action.type}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Navigation buttons based on actions */}
        {actions && actions.length > 0 && onNavigate && (() => {
          // Deduplicate nav targets
          const navTargets = new Map();
          actions.forEach((a) => {
            const nav = ACTION_NAV[a.type];
            if (nav && !navTargets.has(nav.page)) navTargets.set(nav.page, nav);
          });
          if (navTargets.size === 0) return null;
          return (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
              {[...navTargets.values()].map((nav) => (
                <Box
                  key={nav.page}
                  onClick={() => onNavigate(nav.page)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.5,
                    py: 0.6,
                    borderRadius: "10px",
                    background: darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)",
                    border: "1px solid",
                    borderColor: darkMode ? "rgba(108,92,231,0.3)" : "rgba(108,92,231,0.15)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#6C5CE7",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      background: darkMode ? "rgba(108,92,231,0.25)" : "rgba(108,92,231,0.15)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Icon sx={{ fontSize: "0.9rem" }}>{nav.icon}</Icon>
                  {nav.label}
                </Box>
              ))}
            </Box>
          );
        })()}

        {/* Timestamp */}
        {timestamp && (
          <Typography
            sx={{
              fontSize: "0.68rem",
              color: "text.secondary",
              opacity: 0.6,
              alignSelf: isUser ? "flex-end" : "flex-start",
              px: 0.5,
            }}
          >
            {getRelativeTime(timestamp)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

MessageBubble.propTypes = {
  role: PropTypes.oneOf(["user", "assistant"]).isRequired,
  content: PropTypes.string.isRequired,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      data: PropTypes.object,
    })
  ),
  timestamp: PropTypes.instanceOf(Date),
  onNavigate: PropTypes.func,
};

export default MessageBubble;
