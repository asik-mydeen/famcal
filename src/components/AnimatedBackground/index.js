import Box from "@mui/material/Box";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";

export default function AnimatedBackground() {
  const { tokens, darkMode } = useAppTheme();

  if (darkMode) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: -1,
          background: "#0a0a1a",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-40%", left: "-40%", width: "180%", height: "180%",
            background: `
              radial-gradient(ellipse at 20% 80%, ${alpha(tokens.accent.main, 0.12)} 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.10) 0%, transparent 50%)
            `,
            animation: "meshFloat 25s ease-in-out infinite",
          },
          "@keyframes meshFloat": {
            "0%, 100%": { transform: "translate(0,0) rotate(0deg)" },
            "50%": { transform: "translate(2%,-1%) rotate(0.5deg)" },
          },
        }}
      />
    );
  }

  // Light mode: tinted background derived from accent
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: -1,
        background: `linear-gradient(180deg, ${alpha(tokens.accent.light, 0.06)} 0%, #FFFFFF 50%, #FFFFFF 100%)`,
      }}
    />
  );
}
