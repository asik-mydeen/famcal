import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useThemeMode } from "context/ThemeContext";

function HeaderBar({ weather, topCountdown, members, weatherWidget, countdownWidget, kioskEnabled, onKioskToggle, fontScale, onFontScaleChange }) {
  const theme = useTheme();
  const { darkMode } = useThemeMode();
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:767px)");

  // Current time state (updates every minute)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Format date (e.g., "Thursday, Mar 19")
  const formatDate = () => {
    const options = { weekday: "long", month: "short", day: "numeric" };
    return currentTime.toLocaleDateString("en-US", options);
  };

  // Format time (e.g., "3:45 PM")
  const formatTime = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  // Determine if a color is light (for text contrast)
  const isLightColor = (color) => {
    if (!color) return false;
    // Gold color (#FDCB6E) needs dark text
    return color.toUpperCase() === "#FDCB6E";
  };

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: isMobile ? 2 : 3,
        py: isMobile ? 1.5 : 2,
        background: darkMode ? "rgba(10, 10, 26, 0.95)" : "#ffffff",
        backdropFilter: darkMode ? "blur(20px)" : "none",
        borderBottom: darkMode
          ? "1px solid rgba(255, 255, 255, 0.06)"
          : "1px solid rgba(0, 0, 0, 0.08)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Left: Date */}
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: isMobile ? "1.2rem" : "1.6rem",
          letterSpacing: "-0.03em",
          color: darkMode ? "#ffffff" : "#1A1A1A",
        }}
      >
        {formatDate()}
      </Typography>

      {/* Right: Weather, Countdown, Avatars, Clock */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 1.5 : 2,
        }}
      >
        {/* Weather Widget - prefer widget node, fallback to data-driven */}
        {weatherWidget ? weatherWidget : weather && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {/* Weather Icon */}
            <Box
              sx={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #FF9A56 0%, #FF6B6B 100%)",
              }}
            >
              <Icon sx={{ color: "#ffffff", fontSize: "18px" }}>
                {weather.icon}
              </Icon>
            </Box>

            {/* Temperature and Condition */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: darkMode ? "#ffffff" : "#1A1A1A",
                  lineHeight: 1,
                }}
              >
                {weather.temp}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: darkMode ? "rgba(255, 255, 255, 0.6)" : "#8B8680",
                  lineHeight: 1,
                }}
              >
                {weather.condition}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Countdown Pill (hidden on mobile) - prefer widget node, fallback to data-driven */}
        {!isMobile && (countdownWidget ? countdownWidget : topCountdown && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: "20px",
              background: darkMode
                ? "rgba(124, 58, 237, 0.2)"
                : "rgba(108, 92, 231, 0.1)",
              border: darkMode
                ? "1px solid rgba(124, 58, 237, 0.3)"
                : "1px solid rgba(108, 92, 231, 0.2)",
            }}
          >
            <Icon
              sx={{
                fontSize: "16px",
                color: darkMode ? "#a78bfa" : "#6C5CE7"
              }}
            >
              {topCountdown.icon}
            </Icon>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: darkMode ? "#ffffff" : "#1A1A1A",
              }}
            >
              {topCountdown.title}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: darkMode ? "#a78bfa" : "#6C5CE7",
              }}
            >
              {topCountdown.daysLeft}d
            </Typography>
          </Box>
        ))}

        {/* Family Avatars (hidden on mobile) */}
        {members && members.length > 0 && !isMobile && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: 0.5,
            }}
          >
            {members.slice(0, 4).map((member, index) => (
              <Box
                key={member.id}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: member.avatar_color || "#6C5CE7",
                  backgroundImage: member.avatar_url
                    ? `url(${member.avatar_url})`
                    : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: isLightColor(member.avatar_color) ? "#1A1A1A" : "#ffffff",
                  border: darkMode
                    ? "2px solid rgba(10, 10, 26, 0.95)"
                    : "2px solid #ffffff",
                  marginLeft: index > 0 ? "-8px" : 0,
                  zIndex: members.length - index,
                  transition: "transform 0.2s ease",
                  "&:hover": {
                    transform: "scale(1.1)",
                    zIndex: 100,
                  },
                }}
              >
                {!member.avatar_url && (member.name?.[0] || "?")}
              </Box>
            ))}
          </Box>
        )}

        {/* Font Size Control */}
        {onFontScaleChange && (
          <Box sx={{ position: "relative" }}>
            <Tooltip title={`Font size: ${Math.round((fontScale || 1) * 100)}%`} arrow>
              <IconButton
                onClick={() => setFontMenuOpen((prev) => !prev)}
                size="small"
                sx={{
                  width: 36, height: 36,
                  bgcolor: fontMenuOpen
                    ? (darkMode ? "rgba(139,92,246,0.15)" : "rgba(108,92,231,0.1)")
                    : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                  color: fontMenuOpen
                    ? (darkMode ? "#a78bfa" : "#6C5CE7")
                    : "text.secondary",
                  "&:hover": {
                    bgcolor: darkMode ? "rgba(139,92,246,0.2)" : "rgba(108,92,231,0.15)",
                  },
                  transition: "all 0.2s ease",
                  fontSize: "0.85rem", fontWeight: 800,
                }}
              >
                Aa
              </IconButton>
            </Tooltip>

            {/* Font size popover */}
            {fontMenuOpen && (
              <>
                <Box
                  onClick={() => setFontMenuOpen(false)}
                  sx={{ position: "fixed", inset: 0, zIndex: 1299 }}
                />
                <Box
                  sx={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 1300,
                    bgcolor: darkMode ? "#1e1e32" : "#fff",
                    borderRadius: "14px", p: 2, minWidth: 200,
                    boxShadow: darkMode
                      ? "0 8px 32px rgba(0,0,0,0.5)"
                      : "0 8px 32px rgba(0,0,0,0.12)",
                    border: "1px solid",
                    borderColor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  }}
                >
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Text Size
                  </Typography>

                  {/* Size buttons */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => { onFontScaleChange((fontScale || 1) - 0.05); }}
                      disabled={(fontScale || 1) <= 0.8}
                      sx={{ width: 32, height: 32, bgcolor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
                    >
                      <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "text.primary" }}>A</Typography>
                    </IconButton>

                    <Box sx={{
                      flex: 1, height: 4, borderRadius: 2,
                      bgcolor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      position: "relative", mx: 0.5,
                    }}>
                      <Box sx={{
                        position: "absolute", top: -2, height: 8, width: 8, borderRadius: "50%",
                        bgcolor: darkMode ? "#8b5cf6" : "#6C5CE7",
                        left: `${(((fontScale || 1) - 0.8) / 0.8) * 100}%`,
                        transform: "translateX(-50%)",
                        transition: "left 0.15s ease",
                      }} />
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => { onFontScaleChange((fontScale || 1) + 0.05); }}
                      disabled={(fontScale || 1) >= 1.6}
                      sx={{ width: 32, height: 32, bgcolor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
                    >
                      <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "text.primary" }}>A</Typography>
                    </IconButton>
                  </Box>

                  {/* Preset buttons */}
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {[
                      { label: "S", value: 0.85 },
                      { label: "M", value: 1.0 },
                      { label: "L", value: 1.15 },
                      { label: "XL", value: 1.35 },
                    ].map((preset) => (
                      <Box
                        key={preset.label}
                        onClick={() => { onFontScaleChange(preset.value); setFontMenuOpen(false); }}
                        sx={{
                          flex: 1, py: 0.75, borderRadius: "8px", textAlign: "center",
                          cursor: "pointer", fontWeight: 700, fontSize: "0.7rem",
                          bgcolor: Math.abs((fontScale || 1) - preset.value) < 0.03
                            ? (darkMode ? "rgba(139,92,246,0.2)" : "rgba(108,92,231,0.12)")
                            : (darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                          color: Math.abs((fontScale || 1) - preset.value) < 0.03
                            ? (darkMode ? "#a78bfa" : "#6C5CE7")
                            : "text.secondary",
                          border: "1px solid",
                          borderColor: Math.abs((fontScale || 1) - preset.value) < 0.03
                            ? (darkMode ? "rgba(139,92,246,0.3)" : "rgba(108,92,231,0.2)")
                            : "transparent",
                          "&:hover": {
                            bgcolor: darkMode ? "rgba(139,92,246,0.15)" : "rgba(108,92,231,0.08)",
                          },
                          transition: "all 0.15s ease",
                        }}
                      >
                        {preset.label}
                      </Box>
                    ))}
                  </Box>

                  <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", mt: 1.5, textAlign: "center" }}>
                    {Math.round((fontScale || 1) * 100)}% — {(fontScale || 1) <= 0.9 ? "Compact" : (fontScale || 1) >= 1.3 ? "Extra Large" : (fontScale || 1) >= 1.1 ? "Large" : "Default"}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Fullscreen / Kiosk toggle */}
        {onKioskToggle && (
          <Tooltip title={kioskEnabled ? "Exit fullscreen" : "Enter fullscreen"} arrow>
            <IconButton
              onClick={onKioskToggle}
              size="small"
              sx={{
                width: 36, height: 36,
                bgcolor: kioskEnabled
                  ? (darkMode ? "rgba(139,92,246,0.15)" : "rgba(108,92,231,0.1)")
                  : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                color: kioskEnabled
                  ? (darkMode ? "#a78bfa" : "#6C5CE7")
                  : "text.secondary",
                "&:hover": {
                  bgcolor: darkMode ? "rgba(139,92,246,0.2)" : "rgba(108,92,231,0.15)",
                  color: darkMode ? "#a78bfa" : "#6C5CE7",
                },
                transition: "all 0.2s ease",
              }}
            >
              <Icon sx={{ fontSize: "1.2rem" }}>
                {kioskEnabled ? "fullscreen_exit" : "fullscreen"}
              </Icon>
            </IconButton>
          </Tooltip>
        )}

        {/* Digital Clock */}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: isMobile ? "1.1rem" : "1.3rem",
            letterSpacing: "-0.02em",
            color: darkMode ? "#ffffff" : "#1A1A1A",
            minWidth: isMobile ? "70px" : "90px",
            textAlign: "right",
          }}
        >
          {formatTime()}
        </Typography>
      </Box>
    </Box>
  );
}

HeaderBar.propTypes = {
  weather: PropTypes.shape({
    icon: PropTypes.string,
    temp: PropTypes.string,
    condition: PropTypes.string,
  }),
  topCountdown: PropTypes.shape({
    icon: PropTypes.string,
    title: PropTypes.string,
    daysLeft: PropTypes.number,
  }),
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      avatar_color: PropTypes.string,
      avatar_url: PropTypes.string,
    })
  ),
  weatherWidget: PropTypes.node,
  countdownWidget: PropTypes.node,
  kioskEnabled: PropTypes.bool,
  onKioskToggle: PropTypes.func,
  fontScale: PropTypes.number,
  onFontScaleChange: PropTypes.func,
};

export default memo(HeaderBar);
