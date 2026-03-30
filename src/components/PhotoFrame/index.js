import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";

// Generate random Ken Burns params for each photo
function randomKenBurns() {
  const directions = [
    { startX: 0, startY: 0, endX: -3, endY: -2 },
    { startX: -2, startY: -1, endX: 1, endY: 1 },
    { startX: 1, startY: -2, endX: -1, endY: 0 },
    { startX: -1, startY: 1, endX: 2, endY: -1 },
    { startX: 0, startY: -2, endX: 0, endY: 2 },
    { startX: -2, startY: 0, endX: 2, endY: 0 },
  ];
  const dir = directions[Math.floor(Math.random() * directions.length)];
  const startScale = 1.0 + Math.random() * 0.05;
  const endScale = startScale + 0.12 + Math.random() * 0.06;
  return { ...dir, startScale, endScale };
}

const FADE_TIME = 1500; // 1.5s crossfade

/**
 * Fullscreen photo slideshow overlay with Sony TV-style Ken Burns effect
 */
function PhotoFrame({ photos, interval = 10, weather, onDismiss }) {
  const displayTime = interval * 1000;
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState(-1);
  const [fading, setFading] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const kenBurnsRef = useRef(photos.map(() => randomKenBurns()));

  // Ensure kenBurns array matches photos length
  useEffect(() => {
    if (photos.length > kenBurnsRef.current.length) {
      kenBurnsRef.current = photos.map(() => randomKenBurns());
    }
  }, [photos.length]);

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
      setDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Photo cycling with crossfade
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => {
        setPrevious(prev);
        setFading(true);
        const next = (prev + 1) % photos.length;
        // Generate new Ken Burns for next photo
        kenBurnsRef.current[next] = randomKenBurns();
        setTimeout(() => { setFading(false); setPrevious(-1); }, FADE_TIME);
        return next;
      });
    }, displayTime);
    return () => clearInterval(timer);
  }, [photos.length, displayTime]);

  if (!photos || photos.length === 0) {
    return (
      <Box onClick={onDismiss} sx={{
        position: "fixed", inset: 0, zIndex: 9999, background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}>
        <Box sx={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
          <Icon sx={{ fontSize: "4rem", mb: 2, display: "block" }}>photo_library</Icon>
          <Typography sx={{ fontSize: "1.2rem" }}>No photos configured</Typography>
          <Typography sx={{ fontSize: "0.85rem", mt: 1, opacity: 0.6 }}>
            Connect Google Photos in Settings
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderPhoto = (index, isActive) => {
    if (index < 0 || index >= photos.length) return null;
    const kb = kenBurnsRef.current[index] || randomKenBurns();
    const photo = photos[index];

    return (
      <Box
        key={`${photo.id}-${index}`}
        sx={{
          position: "absolute", inset: 0,
          opacity: isActive ? 1 : 0,
          transition: `opacity ${FADE_TIME}ms ease-in-out`,
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={photo.url}
          alt=""
          sx={{
            position: "absolute",
            inset: "-8%",
            width: "116%",
            height: "116%",
            objectFit: "cover",
            animation: isActive ? `kenburns ${displayTime}ms ease-out forwards` : "none",
            "@keyframes kenburns": {
              "0%": {
                transform: `scale(${kb.startScale}) translate(${kb.startX}%, ${kb.startY}%)`,
              },
              "100%": {
                transform: `scale(${kb.endScale}) translate(${kb.endX}%, ${kb.endY}%)`,
              },
            },
          }}
        />
      </Box>
    );
  };

  return (
    <Box
      onClick={onDismiss}
      sx={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000", cursor: "pointer", overflow: "hidden",
      }}
    >
      {/* Previous photo (fading out) */}
      {fading && renderPhoto(previous, false)}

      {/* Current photo (active) */}
      {renderPhoto(current, true)}

      {/* Vignette overlay */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
      }} />

      {/* Bottom gradient for text readability */}
      <Box sx={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
        background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
        pointerEvents: "none",
      }} />

      {/* Clock — bottom left, large and elegant */}
      <Box sx={{
        position: "absolute", bottom: 40, left: 40,
        color: "white", pointerEvents: "none",
      }}>
        <Typography sx={{
          fontSize: { xs: "3rem", md: "4.5rem" },
          fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}>
          {time}
        </Typography>
        <Typography sx={{
          fontSize: { xs: "0.9rem", md: "1.2rem" },
          fontWeight: 400, opacity: 0.8, mt: 0.5,
          textShadow: "0 1px 10px rgba(0,0,0,0.5)",
        }}>
          {date}
        </Typography>
      </Box>

      {/* Weather — bottom right */}
      {weather && (
        <Box sx={{
          position: "absolute", bottom: 40, right: 40,
          color: "white", pointerEvents: "none", textAlign: "right",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
            <Icon sx={{ fontSize: "2rem", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              {weather.icon || "wb_sunny"}
            </Icon>
            <Typography sx={{
              fontSize: { xs: "2rem", md: "3rem" },
              fontWeight: 300, letterSpacing: "-0.02em",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}>
              {weather.temp}°
            </Typography>
          </Box>
          <Typography sx={{
            fontSize: "0.9rem", opacity: 0.7, mt: 0.5,
            textShadow: "0 1px 10px rgba(0,0,0,0.5)",
          }}>
            {weather.condition}
          </Typography>
        </Box>
      )}

      {/* Art attribution — shown for artwork photos (bottom right, above weather) */}
      {(() => {
        const photo = photos[current];
        if (!photo || photo.source !== "art") return null;
        return (
          <Box sx={{
            position: "absolute",
            bottom: weather ? 140 : 40,
            right: 40,
            maxWidth: { xs: 200, md: 280 },
            textAlign: "right",
            pointerEvents: "none",
          }}>
            <Box sx={{
              display: "inline-block",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              borderRadius: "12px",
              px: 2, py: 1.25,
            }}>
              {photo.title && (
                <Typography sx={{
                  fontSize: { xs: "0.75rem", md: "0.85rem" },
                  fontWeight: 600, color: "white", lineHeight: 1.3,
                  textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                }}>
                  {photo.title}
                </Typography>
              )}
              {photo.artist && (
                <Typography sx={{
                  fontSize: { xs: "0.65rem", md: "0.72rem" },
                  color: "rgba(255,255,255,0.72)", mt: 0.25,
                }}>
                  {photo.artist}{photo.year ? ` · ${photo.year}` : ""}
                </Typography>
              )}
              <Typography sx={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", mt: 0.25 }}>
                Art Institute of Chicago
              </Typography>
            </Box>
          </Box>
        );
      })()}

      {/* Tap to dismiss hint */}
      <Box sx={{
        position: "absolute", top: 20, right: 20,
        color: "rgba(255,255,255,0.3)", pointerEvents: "none",
        fontSize: "0.75rem",
      }}>
        Tap to dismiss
      </Box>
    </Box>
  );
}

PhotoFrame.propTypes = {
  photos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
      caption: PropTypes.string,
      source: PropTypes.string,
      title: PropTypes.string,
      artist: PropTypes.string,
      year: PropTypes.string,
    })
  ).isRequired,
  interval: PropTypes.number,
  weather: PropTypes.shape({
    temp: PropTypes.number,
    condition: PropTypes.string,
    icon: PropTypes.string,
  }),
  onDismiss: PropTypes.func.isRequired,
};

export default PhotoFrame;
