import { memo, useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function MessageBoard({ messages, members, dispatch, familyId }) {
  const { tokens, alpha, darkMode } = useAppTheme();
  const [messageText, setMessageText] = useState("");
  const [selectedFromMember, setSelectedFromMember] = useState(members[0]?.id || null);
  const [selectedToMember, setSelectedToMember] = useState(null); // null = everyone

  const getMember = (memberId) => members.find((m) => m.id === memberId);
  const getMemberColor = (memberId) => getMember(memberId)?.avatar_color || tokens.accent.main;
  const getMemberName = (memberId) => getMember(memberId)?.name || "Unknown";

  // Sort: pinned first, then by date
  const sortedMessages = [...(messages || [])]
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 15);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedFromMember) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      family_id: familyId,
      from_member_id: selectedFromMember,
      to_member_id: selectedToMember || null,
      content: messageText.trim(),
      pinned: false,
      urgent: false,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: "ADD_MESSAGE_BOARD", value: newMsg });
    setMessageText("");
  };

  const handleTogglePin = (msg) => {
    dispatch({ type: "UPDATE_MESSAGE_BOARD", value: { id: msg.id, pinned: !msg.pinned } });
  };

  const handleToggleUrgent = (msg) => {
    dispatch({ type: "UPDATE_MESSAGE_BOARD", value: { id: msg.id, urgent: !msg.urgent } });
  };

  const handleDelete = (id) => {
    dispatch({ type: "REMOVE_MESSAGE_BOARD", value: id });
  };

  return (
    <Box
      sx={{
        background: darkMode ? alpha("#fff", 0.05) : "#fff",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "text.primary" }}>
          Messages
        </Typography>
        {messages.filter((m) => m.urgent && !m.pinned).length > 0 && (
          <Box
            sx={{
              background: tokens.priority.high,
              color: "#fff",
              borderRadius: "10px",
              px: 1,
              py: 0.25,
              fontSize: "0.65rem",
              fontWeight: 700,
            }}
          >
            {messages.filter((m) => m.urgent).length} urgent
          </Box>
        )}
      </Box>

      {/* Messages list */}
      {sortedMessages.length === 0 && (
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            textAlign: "center",
            py: 2,
            fontStyle: "italic",
          }}
        >
          No messages yet. Leave a message for your family!
        </Typography>
      )}

      <AnimatePresence mode="popLayout">
        {sortedMessages.map((msg) => {
          const fromColor = getMemberColor(msg.from_member_id);
          const fromName = getMemberName(msg.from_member_id);
          const fromMember = getMember(msg.from_member_id);
          const toMember = msg.to_member_id ? getMember(msg.to_member_id) : null;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  background: alpha(fromColor, 0.08),
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "6px",
                  borderLeft: msg.urgent
                    ? `3px solid ${tokens.priority.high}`
                    : `3px solid ${fromColor}`,
                  ...(msg.urgent && {
                    boxShadow: `inset 0 0 0 1px ${alpha(tokens.priority.high, 0.2)}`,
                  }),
                  touchAction: "manipulation",
                }}
              >
                {/* Sender + target */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                  <Avatar
                    src={fromMember?.avatar_url || undefined}
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: fromColor,
                      fontSize: "0.6rem",
                    }}
                  >
                    {fromMember?.avatar_emoji || fromName[0]}
                  </Avatar>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: fromColor }}>
                    {fromName.split(" ")[0]}
                  </Typography>
                  {toMember && (
                    <>
                      <Icon sx={{ fontSize: "0.7rem !important", color: "text.disabled" }}>arrow_forward</Icon>
                      <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: getMemberColor(msg.to_member_id) }}>
                        {toMember.name.split(" ")[0]}
                      </Typography>
                    </>
                  )}
                  {!toMember && (
                    <Typography sx={{ fontSize: "0.65rem", color: "text.disabled" }}>
                      to everyone
                    </Typography>
                  )}
                  {msg.pinned && (
                    <Icon sx={{ fontSize: "0.7rem !important", color: tokens.accent.main, ml: "auto" }}>push_pin</Icon>
                  )}
                  {msg.urgent && (
                    <Icon sx={{ fontSize: "0.7rem !important", color: tokens.priority.high, ml: msg.pinned ? 0 : "auto" }}>priority_high</Icon>
                  )}
                </Box>

                {/* Content */}
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary", lineHeight: 1.4 }}>
                  {msg.content}
                </Typography>

                {/* Footer */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                  <Typography sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                    {timeAgo(msg.created_at)}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.25 }}>
                    <Tooltip title={msg.pinned ? "Unpin" : "Pin"} arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleTogglePin(msg)}
                        sx={{ width: 22, height: 22 }}
                      >
                        <Icon sx={{ fontSize: "0.75rem !important", color: msg.pinned ? tokens.accent.main : "text.secondary" }}>push_pin</Icon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={msg.urgent ? "Mark normal" : "Mark urgent"} arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleUrgent(msg)}
                        sx={{ width: 22, height: 22 }}
                      >
                        <Icon sx={{ fontSize: "0.75rem !important", color: msg.urgent ? tokens.priority.high : "text.secondary" }}>priority_high</Icon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(msg.id)}
                        sx={{ width: 22, height: 22 }}
                      >
                        <Icon sx={{ fontSize: "0.75rem !important", color: "text.secondary" }}>close</Icon>
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Send message form */}
      <Box sx={{ mt: 1 }}>
        {/* From / To selectors */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
          <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 600 }}>From:</Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {members.map((m) => (
              <Tooltip key={m.id} title={m.name} arrow>
                <Box
                  onClick={() => setSelectedFromMember(m.id)}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: m.avatar_color,
                    cursor: "pointer",
                    border: selectedFromMember === m.id ? "2px solid" : "2px solid transparent",
                    borderColor: selectedFromMember === m.id ? "text.primary" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.avatar_color === "#FDCB6E" ? "#1a1a1a" : "#fff",
                    fontSize: "0.45rem",
                    fontWeight: 700,
                    transition: "all 0.2s",
                    touchAction: "manipulation",
                    "&:hover": { transform: "scale(1.1)" },
                  }}
                >
                  {m.name?.charAt(0)}
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 600, ml: 1 }}>To:</Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Everyone" arrow>
              <Box
                onClick={() => setSelectedToMember(null)}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: darkMode ? alpha("#fff", 0.1) : alpha("#000", 0.08),
                  cursor: "pointer",
                  border: selectedToMember === null ? "2px solid" : "2px solid transparent",
                  borderColor: selectedToMember === null ? "text.primary" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  touchAction: "manipulation",
                  "&:hover": { transform: "scale(1.1)" },
                }}
              >
                <Icon sx={{ fontSize: "0.65rem !important", color: "text.secondary" }}>group</Icon>
              </Box>
            </Tooltip>
            {members.map((m) => (
              <Tooltip key={m.id} title={m.name} arrow>
                <Box
                  onClick={() => setSelectedToMember(m.id)}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: alpha(m.avatar_color, 0.3),
                    cursor: "pointer",
                    border: selectedToMember === m.id ? "2px solid" : "2px solid transparent",
                    borderColor: selectedToMember === m.id ? "text.primary" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.avatar_color === "#FDCB6E" ? "#1a1a1a" : "#fff",
                    fontSize: "0.45rem",
                    fontWeight: 700,
                    transition: "all 0.2s",
                    touchAction: "manipulation",
                    "&:hover": { transform: "scale(1.1)" },
                  }}
                >
                  {m.name?.charAt(0)}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
        {/* Text input + send */}
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Write a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            sx={{
              flex: 1,
              "& .MuiInputBase-root": {
                fontSize: "0.8rem",
                borderRadius: "8px",
              },
            }}
          />
          <IconButton
            size="small"
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            sx={{
              width: 30,
              height: 30,
              background: messageText.trim() ? tokens.accent.main : "transparent",
              color: messageText.trim() ? "#fff" : "text.disabled",
              "&:hover": {
                background: messageText.trim() ? tokens.accent.dark : "transparent",
              },
              borderRadius: "8px",
            }}
          >
            <Icon sx={{ fontSize: "1rem !important" }}>send</Icon>
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

MessageBoard.propTypes = {
  messages: PropTypes.array.isRequired,
  members: PropTypes.array.isRequired,
  dispatch: PropTypes.func.isRequired,
  familyId: PropTypes.string,
};

export default memo(MessageBoard);
