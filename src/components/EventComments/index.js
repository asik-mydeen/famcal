import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import { fetchEventComments, addEventComment, deleteEventComment } from "lib/supabase";

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function EventComments({ eventId, familyId, members }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Member picker: who is posting — default to first member
  const [authorId, setAuthorId] = useState(members[0]?.id || null);

  const author = members.find((m) => m.id === authorId) || null;

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchEventComments(eventId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [eventId]);

  const handleAdd = async () => {
    if (!text.trim() || !author) return;
    setSubmitting(true);
    const optimistic = {
      id: `temp-${Date.now()}`,
      author_id: author.id,
      author_name: author.name,
      text: text.trim(),
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setText("");
    try {
      const saved = await addEventComment(eventId, familyId, author.id, author.name, optimistic.text);
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? saved : c)));
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deleteEventComment(commentId);
    } catch {
      // Silently fail — comment may already be deleted
    }
  };

  if (!eventId) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <>
          {/* Comment list */}
          {comments.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              No comments yet. Be the first to add one.
            </Typography>
          )}
          {comments.map((c) => (
            <Box key={c.id} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "flex-start" }}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: "0.75rem",
                  bgcolor: members.find((m) => m.id === c.author_id)?.avatar_color || "primary.main",
                  flexShrink: 0,
                }}
              >
                {c.author_name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{c.author_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{timeAgo(c.created_at)}</Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.25, wordBreak: "break-word" }}>{c.text}</Typography>
              </Box>
              {author && c.author_id === author.id && (
                <Tooltip title="Delete comment" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(c.id)}
                    aria-label="Delete comment"
                    sx={{ flexShrink: 0, mt: -0.25 }}
                  >
                    <DeleteIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}

          {/* Member picker: who is commenting */}
          {members.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.75, mb: 1.25, flexWrap: "wrap" }}>
              {members.map((m) => (
                <Tooltip key={m.id} title={m.name} arrow>
                  <Avatar
                    src={m.avatar_url || undefined}
                    onClick={() => setAuthorId(m.id)}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: "0.7rem",
                      bgcolor: m.avatar_color,
                      cursor: "pointer",
                      border: authorId === m.id ? `2px solid ${m.avatar_color}` : "2px solid transparent",
                      outline: authorId === m.id ? `2px solid ${m.avatar_color}` : "none",
                      outlineOffset: "1px",
                      opacity: authorId === m.id ? 1 : 0.5,
                      transition: "opacity 0.15s, outline 0.15s",
                    }}
                  >
                    {m.name?.[0]?.toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
              {author && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", ml: 0.5 }}>
                  as {author.name}
                </Typography>
              )}
            </Box>
          )}

          {/* Input row */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              placeholder={author ? `Comment as ${author.name}…` : "Select a member above to comment"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              multiline
              maxRows={3}
              sx={{ flex: 1 }}
              disabled={submitting || !author}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAdd}
              disabled={!text.trim() || submitting || !author}
              sx={{ alignSelf: "flex-end", borderRadius: "10px", minWidth: 56 }}
            >
              Post
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

EventComments.propTypes = {
  eventId: PropTypes.string,
  familyId: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      avatar_color: PropTypes.string,
      avatar_url: PropTypes.string,
    })
  ).isRequired,
};

EventComments.defaultProps = {
  eventId: null,
};

export default EventComments;
