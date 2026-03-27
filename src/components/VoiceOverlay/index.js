/**
 * VoiceOverlay — Minimal listening indicator for voice mode.
 * All voice interaction UI now lives in AIAssistant sidebar.
 * This component only shows a small pill when voice is listening (sidebar closed).
 */
/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";
import { VOICE_STATES } from "hooks/useVoiceMode";

function VoiceOverlay({ voiceState, isEnabled, onDisable, onTapToSpeak, novaMode, novaSessionTime }) {
  const { tokens, darkMode } = useAppTheme();

  // Nova mode: show connected indicator when session is active
  if (novaMode) {
    const novaConnected = voiceState === "connected" || voiceState === "listening" || voiceState === "speaking";
    if (!novaConnected) return null;

    const accent = tokens.accent.main;
    const isSpeaking = voiceState === "speaking";
    const isListening = voiceState === "listening";

    return (
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 100, md: 28 },
          left: { xs: 16, md: 96 },
          zIndex: 1150,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2,
          py: 0.75,
          borderRadius: "20px",
          background: darkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          cursor: "pointer",
          pointerEvents: "auto",
          touchAction: "manipulation",
          "&:hover": { boxShadow: `0 4px 20px ${alpha(accent, 0.3)}` },
          "&:active": { transform: "scale(0.95)" },
        }}
        onClick={onTapToSpeak}
        onContextMenu={(e) => { e.preventDefault(); onDisable?.(); }}
      >
        <Box
          sx={{
            width: 8, height: 8, borderRadius: "50%",
            bgcolor: isSpeaking ? "#22c55e" : isListening ? accent : tokens.priority.low,
            animation: "listening-dot 1.5s ease-in-out infinite",
            "@keyframes listening-dot": {
              "0%, 100%": { opacity: 0.4 },
              "50%": { opacity: 1 },
            },
          }}
        />
        <Icon sx={{ fontSize: "1rem !important", color: isSpeaking ? "#22c55e" : accent }}>
          {isSpeaking ? "volume_up" : isListening ? "hearing" : "mic"}
        </Icon>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.primary" }}>
          Nova Voice
        </Typography>
        {novaSessionTime && (
          <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }}>
            {novaSessionTime}
          </Typography>
        )}
      </Box>
    );
  }

  // Legacy mode: show when voice is enabled and in listening state
  if (!isEnabled || voiceState !== VOICE_STATES.LISTENING) return null;

  const accent = tokens.accent.main;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 100, md: 28 },
        left: { xs: 16, md: 96 },
        zIndex: 1150,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 2,
        py: 0.75,
        borderRadius: "20px",
        background: darkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        cursor: "pointer",
        pointerEvents: "auto",
        touchAction: "manipulation",
        "&:hover": { boxShadow: `0 4px 20px ${alpha(accent, 0.3)}` },
        "&:active": { transform: "scale(0.95)" },
      }}
      onClick={onTapToSpeak}
      onContextMenu={(e) => { e.preventDefault(); onDisable?.(); }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: tokens.priority.low,
          animation: "listening-dot 2s ease-in-out infinite",
          "@keyframes listening-dot": {
            "0%, 100%": { opacity: 0.4 },
            "50%": { opacity: 1 },
          },
        }}
      />
      <Icon sx={{ fontSize: "1rem !important", color: accent }}>mic</Icon>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.primary" }}>
        Ask Amara
      </Typography>
    </Box>
  );
}

export default memo(VoiceOverlay);
