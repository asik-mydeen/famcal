import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import { motion } from "framer-motion";
import { useThemeMode } from "context/ThemeContext";
import { fetchWeather, fetchForecast } from "lib/weather";

const getDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

const getTimeLabel = (dateTime) => {
  const date = new Date(dateTime);
  const hours = date.getHours();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}${period}`;
};

// CSS keyframes for weather icon animations
const weatherAnimations = `
  @keyframes sunPulse {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(15deg); }
  }
  @keyframes rainDrip {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(2px); }
  }
  @keyframes cloudFloat {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(3px); }
  }
  @keyframes snowSway {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    33% { transform: translateX(-2px) rotate(-5deg); }
    66% { transform: translateX(2px) rotate(5deg); }
  }
`;

const getIconAnimation = (icon) => {
  if (icon === "wb_sunny") return "sunPulse 3s ease-in-out infinite";
  if (icon === "rainy" || icon === "water_drop") return "rainDrip 1s ease-in-out infinite";
  if (icon === "cloud" || icon === "partly_cloudy_day") return "cloudFloat 4s ease-in-out infinite";
  if (icon === "ac_unit") return "snowSway 2.5s ease-in-out infinite";
  return "none";
};

function WeatherWidget({ variant = "header", location }) {
  const { darkMode } = useThemeMode();
  const [weather, setWeather] = useState(null);
  const [forecastData, setForecastData] = useState({ forecast: [], hourly: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    // Fetch current weather
    fetchWeather(location).then((data) => {
      if (mounted && data) {
        setWeather(data);
        setLoading(false);
      }
    });

    // Fetch forecast data
    fetchForecast(location).then((data) => {
      if (mounted) {
        setForecastData(data);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [location, variant]);

  // No location configured
  if (!location) return null;

  // Loading state (max 3 seconds)
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: variant === "header" ? 40 : 100,
          opacity: 0.5,
        }}
      >
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  // Error/no data
  if (!weather) return null;

  // Check for rain alert (probability > 40% in next 12h)
  const rainAlert = forecastData.hourly?.find((h) => h.pop > 40);

  // Header variant (compact)
  if (variant === "header") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <style>{weatherAnimations}</style>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "12px",
              background: darkMode
                ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                : "linear-gradient(135deg, #FFA726, #FF7043)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              sx={{
                color: "#fff",
                fontSize: "1.2rem",
                animation: getIconAnimation(weather.icon),
              }}
            >
              {weather.icon}
            </Icon>
          </Box>
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.95rem",
                lineHeight: 1.2,
              }}
            >
              {weather.city} {weather.temp}°
            </Typography>
            <Typography
              sx={{
                fontSize: "0.65rem",
                color: "text.secondary",
                lineHeight: 1.2,
              }}
            >
              Feels like {weather.feelsLike}°
            </Typography>
          </Box>
          {rainAlert && (
            <Chip
              label={`Rain in ${getTimeLabel(rainAlert.time)}`}
              size="small"
              icon={<Icon sx={{ fontSize: "0.9rem !important" }}>water_drop</Icon>}
              sx={{
                height: 22,
                fontSize: "0.65rem",
                fontWeight: 600,
                background: darkMode ? "rgba(96, 165, 250, 0.2)" : "rgba(59, 130, 246, 0.15)",
                color: darkMode ? "#60a5fa" : "#2563eb",
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          )}
        </Box>
      </motion.div>
    );
  }

  // Sidebar variant (full)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <style>{weatherAnimations}</style>
      <Box>
        {/* Current weather header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: darkMode
                ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                : "linear-gradient(135deg, #FFA726, #FF7043)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              sx={{
                color: "#fff",
                fontSize: "2rem",
                animation: getIconAnimation(weather.icon),
              }}
            >
              {weather.icon}
            </Icon>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", lineHeight: 1.2 }}>
              {weather.temp}°F
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.2 }}>
              {weather.city} • Feels like {weather.feelsLike}°
            </Typography>
          </Box>
        </Box>

        {/* Additional info */}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Icon sx={{ fontSize: "1rem", color: "text.secondary" }}>water_drop</Icon>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {weather.humidity}%
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Icon sx={{ fontSize: "1rem", color: "text.secondary" }}>air</Icon>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {weather.wind} mph
            </Typography>
          </Box>
        </Box>

        {/* Rain alert banner */}
        {rainAlert && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: "12px",
              background: darkMode ? "rgba(96, 165, 250, 0.15)" : "rgba(59, 130, 246, 0.1)",
              border: `1px solid ${darkMode ? "rgba(96, 165, 250, 0.3)" : "rgba(59, 130, 246, 0.2)"}`,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Icon sx={{ color: darkMode ? "#60a5fa" : "#2563eb", fontSize: "1.2rem" }}>
              water_drop
            </Icon>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: darkMode ? "#60a5fa" : "#2563eb",
              }}
            >
              {rainAlert.pop}% chance of rain at {getTimeLabel(rainAlert.time)}
            </Typography>
          </Box>
        )}

        {/* Hourly forecast strip */}
        {forecastData.hourly?.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "text.secondary",
                mb: 1,
              }}
            >
              Next 12 Hours
            </Typography>
            <Box sx={{ display: "flex", gap: 1, overflowX: "auto" }}>
              {forecastData.hourly.map((hour, idx) => (
                <Box
                  key={idx}
                  sx={{
                    flex: "0 0 auto",
                    textAlign: "center",
                    p: 1,
                    minWidth: 60,
                    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderRadius: "10px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      color: "text.secondary",
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    {getTimeLabel(hour.time)}
                  </Typography>
                  <Icon
                    sx={{
                      fontSize: "1.1rem",
                      mb: 0.5,
                      display: "block",
                      animation: getIconAnimation(hour.icon),
                    }}
                  >
                    {hour.icon}
                  </Icon>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700 }}>
                    {hour.temp}°
                  </Typography>
                  {hour.pop > 30 && (
                    <Typography sx={{ fontSize: "0.6rem", color: "#60a5fa", fontWeight: 600 }}>
                      {hour.pop}%
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* 3-day forecast */}
        {forecastData.forecast?.length > 0 && (
          <Box>
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "text.secondary",
                mb: 1,
              }}
            >
              3-Day Forecast
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {forecastData.forecast.map((day) => (
                <Box
                  key={day.date}
                  sx={{
                    flex: 1,
                    textAlign: "center",
                    p: 1.5,
                    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      color: "text.secondary",
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    {getDayName(day.date)}
                  </Typography>
                  <Icon
                    sx={{
                      fontSize: "1.5rem",
                      my: 0.5,
                      display: "block",
                      animation: getIconAnimation(day.icon),
                    }}
                  >
                    {day.icon}
                  </Icon>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 700 }}>
                    {day.temp}°
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </motion.div>
  );
}

WeatherWidget.propTypes = {
  variant: PropTypes.oneOf(["header", "sidebar"]),
  location: PropTypes.string,
};

export default memo(WeatherWidget);
