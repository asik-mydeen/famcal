import { memo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { useThemeMode } from "context/ThemeContext";

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function NotesWidget({ notes, members, dispatch, familyId }) {
  const { darkMode } = useThemeMode();
  const [noteText, setNoteText] = useState("");
  const [selectedMember, setSelectedMember] = useState(members[0]?.id || null);

  const getMember = (memberId) => members.find((m) => m.id === memberId);
  const getMemberColor = (memberId) => getMember(memberId)?.avatar_color || "#6C5CE7";
  const getMemberName = (memberId) => getMember(memberId)?.name || "Unknown";

  // Filter expired notes (older than 24h and not pinned)
  const visibleNotes = notes
    .filter((n) => {
      if (n.pinned) return true;
      if (n.expires_at && new Date(n.expires_at) < new Date()) return false;
      // Auto-expire after 24h if no explicit expires_at
      const age = Date.now() - new Date(n.created_at).getTime();
      return age < 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => {
      // Pinned first, then by date
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 10);

  const handleAddNote = () => {
    if (!noteText.trim() || !selectedMember) return;
    const newNote = {
      id: `note-${Date.now()}`,
      family_id: familyId,
      member_id: selectedMember,
      text: noteText.trim(),
      pinned: false,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: "ADD_NOTE", value: newNote });
    setNoteText("");
  };

  const handleTogglePin = (note) => {
    dispatch({ type: "UPDATE_NOTE", value: { ...note, pinned: !note.pinned } });
  };

  const handleDelete = (id) => {
    dispatch({ type: "REMOVE_NOTE", value: id });
  };

  return (
    <Box
      sx={{
        background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#fff",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "text.primary" }}>
          Notes
        </Typography>
        <IconButton
          size="small"
          onClick={() => {
            const input = document.querySelector('input[placeholder="Leave a note..."]');
            if (input) input.focus();
          }}
          sx={{
            width: 24,
            height: 24,
            background: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
            "&:hover": {
              background: darkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)",
            },
          }}
        >
          <Icon sx={{ fontSize: "0.9rem" }}>add</Icon>
        </IconButton>
      </Box>

      {/* Note cards */}
      {visibleNotes.length === 0 && (
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            textAlign: "center",
            py: 2,
            fontStyle: "italic",
          }}
        >
          No notes yet. Leave a note for your family!
        </Typography>
      )}

      {visibleNotes.map((note) => {
        const memberColor = getMemberColor(note.member_id);
        const memberName = getMemberName(note.member_id);

        return (
          <Box
            key={note.id}
            sx={{
              background: `${memberColor}12`,
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "6px",
              borderLeft: `3px solid ${memberColor}`,
            }}
          >
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>
              {note.text}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
              <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                {memberName} · {timeAgo(note.created_at)}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.25 }}>
                <IconButton size="small" onClick={() => handleTogglePin(note)}>
                  <Icon
                    sx={{
                      fontSize: "0.8rem",
                      color: note.pinned ? "primary.main" : "text.secondary",
                    }}
                  >
                    push_pin
                  </Icon>
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(note.id)}>
                  <Icon sx={{ fontSize: "0.8rem", color: "text.secondary" }}>close</Icon>
                </IconButton>
              </Box>
            </Box>
          </Box>
        );
      })}

      {/* Add note form */}
      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        {/* Member selector - small colored dots */}
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {members.map((m) => (
            <Box
              key={m.id}
              onClick={() => setSelectedMember(m.id)}
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: m.avatar_color,
                cursor: "pointer",
                border: selectedMember === m.id ? "2px solid" : "2px solid transparent",
                borderColor: selectedMember === m.id ? "text.primary" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: m.avatar_color === "#FDCB6E" ? "#1a1a1a" : "#fff",
                fontSize: "0.5rem",
                fontWeight: 700,
                transition: "all 0.2s",
                "&:hover": {
                  transform: "scale(1.1)",
                },
              }}
            >
              {m.name?.charAt(0)}
            </Box>
          ))}
        </Box>
        {/* Text input */}
        <TextField
          size="small"
          placeholder="Leave a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          sx={{
            flex: 1,
            "& .MuiInputBase-root": {
              fontSize: "0.8rem",
              borderRadius: "8px",
            },
          }}
        />
      </Box>
    </Box>
  );
}

export default memo(NotesWidget);
