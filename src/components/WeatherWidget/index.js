import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useThemeMode } from "context/ThemeContext";
import { fetchWeather, fetchForecast } from "lib/weather";

const getDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

function WeatherWidget({ variant = "header", location }) {
  const { darkMode } = useThemeMode();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
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

    // Fetch forecast only for sidebar variant
    if (variant === "sidebar") {
      fetchForecast(location).then((data) => {
        if (mounted) setForecast(data);
      });
    }

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

  // Header variant (compact pill)
  if (variant === "header") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            background: "linear-gradient(135deg, #FFA726, #FF7043)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ color: "#fff", fontSize: "1.1rem" }}>{weather.icon}</Icon>
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem",
              lineHeight: 1.2,
            }}
          >
            {weather.temp}°F
          </Typography>
          <Typography
            sx={{
              fontSize: "0.65rem",
              color: "text.secondary",
              lineHeight: 1.2,
            }}
          >
            {weather.condition}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Sidebar variant (full card with forecast)
  return (
    <Box>
      {/* Current weather */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            background: "linear-gradient(135deg, #FFA726, #FF7043)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ color: "#fff", fontSize: "1.5rem" }}>{weather.icon}</Icon>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.4rem" }}>
            {weather.temp}°F
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {weather.condition}
          </Typography>
        </Box>
      </Box>

      {/* 3-day forecast */}
      {forecast.length > 0 && (
        <Box sx={{ display: "flex", gap: 1 }}>
          {forecast.map((day) => (
            <Box
              key={day.date}
              sx={{
                flex: 1,
                textAlign: "center",
                p: 1,
                background: darkMode
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.02)",
                borderRadius: "10px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                {getDayName(day.date)}
              </Typography>
              <Icon
                sx={{
                  fontSize: "1.2rem",
                  my: 0.5,
                  display: "block",
                }}
              >
                {day.icon}
              </Icon>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                {day.temp}°
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

WeatherWidget.propTypes = {
  variant: PropTypes.oneOf(["header", "sidebar"]),
  location: PropTypes.string,
};

export default memo(WeatherWidget);
