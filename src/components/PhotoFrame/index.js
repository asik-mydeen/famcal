import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/**
 * Fullscreen photo slideshow overlay for idle mode
 */
function PhotoFrame({ photos, interval = 5, weather, onDismiss }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [time, setTime] = useState("");

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cycle through photos
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [photos.length, interval]);

  return (
    <Box
      onClick={onDismiss}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Photos */}
      {photos.length > 0 ? (
        photos.map((photo, idx) => (
          <Box
            key={photo.id}
            component="img"
            src={photo.url}
            alt={photo.caption || "Family photo"}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: idx === currentIndex ? 1 : 0,
              transition: "opacity 1s ease-in-out",
              pointerEvents: "none",
            }}
          />
        ))
      ) : (
        <Typography sx={{ color: "white", fontSize: "1.5rem", textAlign: "center", px: 3 }}>
          No photos yet. Add photos in Settings.
        </Typography>
      )}

      {/* Clock + Weather overlay */}
      <Box
        sx={{
          position: "absolute",
          bottom: 24,
          right: 24,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          px: 2,
          py: 1,
          color: "white",
          pointerEvents: "none",
        }}
      >
        <Typography sx={{ fontSize: "1.2rem", fontWeight: 700 }}>{time}</Typography>
        {weather && (
          <Typography sx={{ fontSize: "0.8rem", opacity: 0.7 }}>
            {weather.temp}°F · {weather.condition}
          </Typography>
        )}
      </Box>

      {/* Photo caption (if exists) */}
      {photos.length > 0 && photos[currentIndex]?.caption && (
        <Box
          sx={{
            position: "absolute",
            bottom: 24,
            left: 24,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            px: 2,
            py: 1,
            color: "white",
            maxWidth: "50%",
            pointerEvents: "none",
          }}
        >
          <Typography sx={{ fontSize: "0.9rem" }}>{photos[currentIndex].caption}</Typography>
        </Box>
      )}
    </Box>
  );
}

PhotoFrame.propTypes = {
  photos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
      caption: PropTypes.string,
    })
  ).isRequired,
  interval: PropTypes.number,
  weather: PropTypes.shape({
    temp: PropTypes.number,
    condition: PropTypes.string,
  }),
  onDismiss: PropTypes.func.isRequired,
};

export default PhotoFrame;
