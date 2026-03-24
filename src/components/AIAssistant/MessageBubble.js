import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
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

// Comprehensive action badge config — icon + color per action type
const ACTION_BADGES = {
  create_event: { icon: "calendar_today", color: "#6C5CE7", label: "event created" },
  update_event: { icon: "edit_calendar", color: "#6C5CE7", label: "event updated" },
  remove_event: { icon: "event_busy", color: "#E17055", label: "event removed" },
  create_task: { icon: "task_alt", color: "#00B894", label: "task created" },
  update_task: { icon: "edit_note", color: "#00B894", label: "task updated" },
  complete_task: { icon: "check_circle", color: "#22c55e", label: "task completed" },
  remove_task: { icon: "delete", color: "#E17055", label: "task removed" },
  add_meal: { icon: "restaurant", color: "#E17055", label: "meal added" },
  update_meal: { icon: "restaurant", color: "#E17055", label: "meal updated" },
  remove_meal: { icon: "delete", color: "#E17055", label: "meal removed" },
  create_list: { icon: "checklist", color: "#0984E3", label: "list created" },
  add_list_items: { icon: "add_shopping_cart", color: "#0984E3", label: "items added" },
  toggle_list_item: { icon: "check_box", color: "#0984E3", label: "item toggled" },
  remove_list_item: { icon: "delete", color: "#E17055", label: "item removed" },
  add_note: { icon: "sticky_note_2", color: "#FDCB6E", label: "note added" },
  remove_note: { icon: "delete", color: "#E17055", label: "note removed" },
  add_countdown: { icon: "timer", color: "#6C5CE7", label: "countdown created" },
  remove_countdown: { icon: "delete", color: "#E17055", label: "countdown removed" },
  add_reward: { icon: "emoji_events", color: "#FDCB6E", label: "reward created" },
  claim_reward: { icon: "redeem", color: "#22c55e", label: "reward claimed" },
};

// Typing indicator — three animated dots
function TypingIndicator() {
  const { darkMode } = useThemeMode();
  const dotColor = darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderRadius: "14px 14px 14px 4px",
          background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          gap: 0.6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: dotColor,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      layout
    >
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
                  h1: ({ children }) => (
                    <Typography sx={{ fontSize: "1.15rem", fontWeight: 700, mb: 0.75, mt: 0.5, color: "inherit" }}>
                      {children}
                    </Typography>
                  ),
                  h2: ({ children }) => (
                    <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, mb: 0.5, mt: 0.5, color: "inherit" }}>
                      {children}
                    </Typography>
                  ),
                  h3: ({ children }) => (
                    <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, mb: 0.5, mt: 0.25, color: "inherit" }}>
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
                    <Typography component="li" sx={{ fontSize: "0.88rem", mb: 0.25, color: "inherit" }}>
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
                  blockquote: ({ children }) => (
                    <Box
                      component="blockquote"
                      sx={{
                        borderLeft: `3px solid ${darkMode ? "rgba(108,92,231,0.5)" : "rgba(108,92,231,0.3)"}`,
                        pl: 1.5,
                        ml: 0,
                        my: 0.5,
                        color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)",
                        fontStyle: "italic",
                      }}
                    >
                      {children}
                    </Box>
                  ),
                  hr: () => (
                    <Box
                      component="hr"
                      sx={{
                        border: "none",
                        borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                        my: 1,
                      }}
                    />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            )}
          </Box>

          {/* Action badges — grouped by type with counts (skip 'info' — not actionable) */}
          {actions && actions.length > 0 && (() => {
            // Group actions by type and count, excluding info
            const grouped = {};
            actions.forEach((a) => {
              if (a.type === "info") return;
              grouped[a.type] = (grouped[a.type] || 0) + 1;
            });
            const entries = Object.entries(grouped);

            return (
              <Box
                sx={{
                  display: "flex",
                  gap: 0.75,
                  flexWrap: "wrap",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  mt: 0.25,
                }}
              >
                {entries.map(([type, count], i) => {
                  const badge = ACTION_BADGES[type] || {
                    icon: "info",
                    color: "#6C5CE7",
                    label: type.replace(/_/g, " "),
                  };

                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: i * 0.1 }}
                      style={{ display: "inline-flex" }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "10px",
                          background: `${badge.color}15`,
                          border: `1px solid ${badge.color}25`,
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          color: badge.color,
                        }}
                      >
                        <Icon sx={{ fontSize: "0.9rem" }}>{badge.icon}</Icon>
                        {count > 1 ? `${count} ${badge.label}s` : badge.label}
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>
            );
          })()}

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
                      touchAction: "manipulation",
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
    </motion.div>
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

export { TypingIndicator };
export default MessageBubble;
