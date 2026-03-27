/**
 * VoiceOverlay — Visual feedback for "Hey Amara" voice mode.
 *
 * States:
 * - listening: mic pill in corner (tap or say "Hey Amara")
 * - recording: pulsing accent border, mic animation (VAD detected speech)
 * - activated: pulsing border, waiting for command after wake word
 * - processing: steady border glow, "Thinking..." text
 * - speaking: gentle glow, speaker icon, AI response text
 */
/* eslint-disable react/prop-types */
import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { motion, AnimatePresence } from "framer-motion";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";
import { VOICE_STATES } from "hooks/useVoiceMode";

function VoiceOverlay({ voiceState, transcript, aiResponse, isEnabled, onDisable, onTapToSpeak }) {
  const { tokens, darkMode } = useAppTheme();

  if (!isEnabled || voiceState === VOICE_STATES.IDLE) return null;

  const isActive = [VOICE_STATES.ACTIVATED, VOICE_STATES.RECORDING, VOICE_STATES.PROCESSING, VOICE_STATES.SPEAKING].includes(voiceState);
  const accent = tokens.accent.main;

  return (
    <>
      {/* Pulsing screen border — visible during activated/processing/speaking */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              pointerEvents: "none",
            }}
          >
            {/* Border overlay */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                border: `4px solid ${accent}`,
                borderRadius: "0px",
                animation: (voiceState === VOICE_STATES.ACTIVATED || voiceState === VOICE_STATES.RECORDING)
                  ? "voice-pulse 1.5s ease-in-out infinite"
                  : voiceState === VOICE_STATES.SPEAKING
                  ? "voice-glow 2s ease-in-out infinite"
                  : "none",
                boxShadow: `inset 0 0 60px ${alpha(accent, 0.15)}, 0 0 30px ${alpha(accent, 0.2)}`,
                "@keyframes voice-pulse": {
                  "0%, 100%": { borderColor: accent, boxShadow: `inset 0 0 60px ${alpha(accent, 0.15)}, 0 0 30px ${alpha(accent, 0.2)}` },
                  "50%": { borderColor: tokens.accent.light, boxShadow: `inset 0 0 100px ${alpha(accent, 0.25)}, 0 0 60px ${alpha(accent, 0.35)}` },
                },
                "@keyframes voice-glow": {
                  "0%, 100%": { boxShadow: `inset 0 0 40px ${alpha(accent, 0.1)}, 0 0 20px ${alpha(accent, 0.15)}` },
                  "50%": { boxShadow: `inset 0 0 70px ${alpha(accent, 0.18)}, 0 0 40px ${alpha(accent, 0.25)}` },
                },
              }}
            />

            {/* Subtle background tint */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: alpha(accent, 0.03),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom status bar */}
      <AnimatePresence>
        {(voiceState !== VOICE_STATES.IDLE) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 3,
                py: 1.5,
                borderRadius: "24px",
                background: darkMode ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)",
                backdropFilter: "blur(20px)",
                boxShadow: isActive
                  ? `0 8px 32px ${alpha(accent, 0.3)}, 0 0 0 2px ${alpha(accent, 0.5)}`
                  : `0 4px 16px rgba(0,0,0,0.15)`,
                border: `2px solid ${isActive ? accent : "transparent"}`,
                maxWidth: "90vw",
                transition: "box-shadow 0.3s, border-color 0.3s",
              }}
            >
              {/* Mic/speaker icon */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: (voiceState === VOICE_STATES.ACTIVATED || voiceState === VOICE_STATES.RECORDING)
                    ? accent
                    : voiceState === VOICE_STATES.PROCESSING
                    ? alpha(accent, 0.2)
                    : voiceState === VOICE_STATES.SPEAKING
                    ? tokens.priority.low
                    : alpha(accent, 0.1),
                  animation: (voiceState === VOICE_STATES.ACTIVATED || voiceState === VOICE_STATES.RECORDING) ? "mic-pulse 1s ease-in-out infinite" : "none",
                  "@keyframes mic-pulse": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.15)" },
                  },
                }}
              >
                <Icon sx={{ color: (voiceState === VOICE_STATES.ACTIVATED || voiceState === VOICE_STATES.RECORDING) ? "#fff" : accent, fontSize: "1.3rem !important" }}>
                  {voiceState === VOICE_STATES.SPEAKING ? "volume_up" : voiceState === VOICE_STATES.PROCESSING ? "hourglass_top" : "mic"}
                </Icon>
              </Box>

              {/* Text */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "text.primary",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {voiceState === VOICE_STATES.LISTENING && "Say 'Hey Amara'..."}
                  {voiceState === VOICE_STATES.RECORDING && (transcript || "Recording...")}
                  {voiceState === VOICE_STATES.ACTIVATED && (transcript || "Listening...")}
                  {voiceState === VOICE_STATES.PROCESSING && (transcript || "Thinking...")}
                  {voiceState === VOICE_STATES.SPEAKING && (aiResponse || "...")}
                </Typography>

                {voiceState === VOICE_STATES.ACTIVATED && transcript && (
                  <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.25 }}>
                    Speak your request...
                  </Typography>
                )}
              </Box>

              {/* Close button (only when active) */}
              {isActive && (
                <Box
                  onClick={(e) => { e.stopPropagation(); onDisable?.(); }}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    pointerEvents: "auto",
                    bgcolor: "action.hover",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  <Icon sx={{ fontSize: "0.9rem !important", color: "text.secondary" }}>close</Icon>
                </Box>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening indicator / tap-to-speak button */}
      {voiceState === VOICE_STATES.LISTENING && (
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
      )}
    </>
  );
}

export default memo(VoiceOverlay);
