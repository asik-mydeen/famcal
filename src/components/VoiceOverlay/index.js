/**
 * VoiceOverlay — Minimal listening indicator for voice mode.
 * All voice interaction UI lives in AIAssistant sidebar.
 * Shows "Ask Amara" pill when listening, "Tap to interrupt" pill when speaking.
 */
/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";
import { VOICE_STATES } from "hooks/useVoiceMode";

function VoiceOverlay({ voiceState, isEnabled, onDisable, onTapToSpeak, onInterrupt }) {
  const { tokens, darkMode } = useAppTheme();

  if (!isEnabled) return null;

  const accent = tokens.accent.main;

  // Interrupt pill — shown while Nova/Amara is speaking
  const isSpeaking = voiceState === "speaking" || voiceState === VOICE_STATES.SPEAKING;
  if (isSpeaking) {
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
          boxShadow: `0 2px 12px ${alpha(accent, 0.25)}`,
          cursor: "pointer",
          pointerEvents: "auto",
          touchAction: "manipulation",
          "&:hover": { boxShadow: `0 4px 20px ${alpha(accent, 0.4)}` },
          "&:active": { transform: "scale(0.95)" },
        }}
        onClick={onInterrupt}
      >
        <Box
          sx={{
            width: 8, height: 8, borderRadius: "50%",
            bgcolor: accent,
            animation: "speaking-dot 1s ease-in-out infinite",
            "@keyframes speaking-dot": {
              "0%, 100%": { transform: "scale(1)", opacity: 0.7 },
              "50%": { transform: "scale(1.4)", opacity: 1 },
            },
          }}
        />
        <Icon sx={{ fontSize: "1rem !important", color: accent }}>mic</Icon>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.primary" }}>
          Tap to interrupt
        </Typography>
      </Box>
    );
  }

  // Hide during processing/recording/connecting (sidebar handles those)
  const hiddenStates = [VOICE_STATES.RECORDING, VOICE_STATES.PROCESSING, "connecting"];
  if (hiddenStates.includes(voiceState)) return null;

  // Default: "Ask Amara" listening pill
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
