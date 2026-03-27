import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAppTheme } from "context/ThemeContext";
import { alpha } from "theme/helpers";
import TimerAlarmChips from "components/TimerAlarmChips";
import BirthdayWidget from "components/BirthdayWidget";

function HeaderBar({ weather, topCountdown, members, weatherWidget, countdownWidget, kioskEnabled, onKioskToggle, fontScale, onFontScaleChange, onOpenTimerPanel, urgentMessageCount }) {
  const { tokens, darkMode } = useAppTheme();
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
        background: tokens.header.bg,
        backdropFilter: darkMode ? "blur(20px)" : "none",
        borderBottom: `1px solid ${tokens.header.border}`,
        transition: "all 0.3s ease",
      }}
    >
      {/* Left: Date */}
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: isMobile ? "1.2rem" : "1.6rem",
          letterSpacing: "-0.03em",
          color: "text.primary",
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
                background: "linear-gradient(135deg, #FFA726 0%, #FF7043 100%)",
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
                  color: "text.primary",
                  lineHeight: 1,
                }}
              >
                {weather.temp}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  lineHeight: 1,
                }}
              >
                {weather.condition}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Timer/Alarm Chips */}
        <TimerAlarmChips onOpenPanel={onOpenTimerPanel} />

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
              background: alpha(tokens.accent.main, darkMode ? 0.2 : 0.1),
              border: `1px solid ${alpha(tokens.accent.main, darkMode ? 0.3 : 0.2)}`,
            }}
          >
            <Icon
              sx={{
                fontSize: "16px",
                color: tokens.accent.light
              }}
            >
              {topCountdown.icon}
            </Icon>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              {topCountdown.title}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: tokens.accent.light,
              }}
            >
              {topCountdown.daysLeft}d
            </Typography>
          </Box>
        ))}

        {/* Birthday Widget (hidden on mobile) */}
        {!isMobile && members && members.length > 0 && (
          <BirthdayWidget members={members} />
        )}

        {/* Message notification badge */}
        {urgentMessageCount > 0 && !isMobile && (
          <Tooltip title={`${urgentMessageCount} urgent message${urgentMessageCount > 1 ? "s" : ""}`} arrow>
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: alpha(tokens.accent.main, darkMode ? 0.15 : 0.08),
                cursor: "pointer",
              }}
            >
              <Icon sx={{ fontSize: "1.2rem !important", color: tokens.accent.light }}>forum</Icon>
              <Box
                sx={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  bgcolor: tokens.priority?.high || "#ef4444",
                  color: "#fff",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${tokens.header?.bg || "#fff"}`,
                }}
              >
                {urgentMessageCount}
              </Box>
            </Box>
          </Tooltip>
        )}

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
                  border: `2px solid ${tokens.header.bg}`,
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
                    ? alpha(tokens.accent.main, darkMode ? 0.15 : 0.1)
                    : tokens.glass.overlay,
                  color: fontMenuOpen
                    ? tokens.accent.light
                    : "text.secondary",
                  "&:hover": {
                    bgcolor: alpha(tokens.accent.main, darkMode ? 0.2 : 0.15),
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
                    bgcolor: tokens.glass.solidBg,
                    borderRadius: "14px", p: 2, minWidth: 200,
                    boxShadow: darkMode
                      ? "0 8px 32px rgba(0,0,0,0.5)"
                      : "0 8px 32px rgba(0,0,0,0.12)",
                    border: "1px solid",
                    borderColor: tokens.glass.divider,
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
                      disabled={(fontScale || 1) <= 1.0}
                      sx={{ width: 32, height: 32, bgcolor: tokens.glass.overlay }}
                    >
                      <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "text.primary" }}>A</Typography>
                    </IconButton>

                    <Box sx={{
                      flex: 1, height: 4, borderRadius: 2,
                      bgcolor: tokens.glass.overlayHover,
                      position: "relative", mx: 0.5,
                    }}>
                      <Box sx={{
                        position: "absolute", top: -2, height: 8, width: 8, borderRadius: "50%",
                        bgcolor: tokens.accent.main,
                        left: `${(((fontScale || 1) - 1.0) / 0.7) * 100}%`,
                        transform: "translateX(-50%)",
                        transition: "left 0.15s ease",
                      }} />
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => { onFontScaleChange((fontScale || 1) + 0.05); }}
                      disabled={(fontScale || 1) >= 1.6}
                      sx={{ width: 32, height: 32, bgcolor: tokens.glass.overlay }}
                    >
                      <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "text.primary" }}>A</Typography>
                    </IconButton>
                  </Box>

                  {/* Preset buttons */}
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {[
                      { label: "S", value: 1.15 },
                      { label: "M", value: 1.3 },
                      { label: "L", value: 1.45 },
                      { label: "XL", value: 1.6 },
                    ].map((preset) => (
                      <Box
                        key={preset.label}
                        onClick={() => { onFontScaleChange(preset.value); setFontMenuOpen(false); }}
                        sx={{
                          flex: 1, py: 0.75, borderRadius: "8px", textAlign: "center",
                          cursor: "pointer", fontWeight: 700, fontSize: "0.7rem",
                          bgcolor: Math.abs((fontScale || 1) - preset.value) < 0.03
                            ? alpha(tokens.accent.main, darkMode ? 0.2 : 0.12)
                            : tokens.glass.overlay,
                          color: Math.abs((fontScale || 1) - preset.value) < 0.03
                            ? tokens.accent.light
                            : "text.secondary",
                          border: "1px solid",
                          borderColor: Math.abs((fontScale || 1) - preset.value) < 0.03
                            ? alpha(tokens.accent.main, darkMode ? 0.3 : 0.2)
                            : "transparent",
                          "&:hover": {
                            bgcolor: alpha(tokens.accent.main, darkMode ? 0.15 : 0.08),
                          },
                          transition: "all 0.15s ease",
                        }}
                      >
                        {preset.label}
                      </Box>
                    ))}
                  </Box>

                  <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", mt: 1.5, textAlign: "center" }}>
                    {Math.round((fontScale || 1) * 100)}% — {(fontScale || 1) >= 1.5 ? "Extra Large" : (fontScale || 1) >= 1.35 ? "Large" : (fontScale || 1) >= 1.2 ? "Medium" : "Standard"}
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
                  ? alpha(tokens.accent.main, darkMode ? 0.15 : 0.1)
                  : tokens.glass.overlay,
                color: kioskEnabled
                  ? tokens.accent.light
                  : "text.secondary",
                "&:hover": {
                  bgcolor: alpha(tokens.accent.main, darkMode ? 0.2 : 0.15),
                  color: tokens.accent.light,
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
            color: "text.primary",
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
  onOpenTimerPanel: PropTypes.func,
  urgentMessageCount: PropTypes.number,
};

export default memo(HeaderBar);
