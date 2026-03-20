import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useThemeMode } from "context/ThemeContext";

function HeaderBar({ weather, topCountdown, members, weatherWidget, countdownWidget }) {
  const theme = useTheme();
  const { darkMode } = useThemeMode();
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
};

export default memo(HeaderBar);
