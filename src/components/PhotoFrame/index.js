import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";

// ── Ambient info card sub-components ──────────────────────────────────────

function TasksCard({ tasks, total }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Icon sx={{ fontSize: "1rem !important", color: "rgba(255,255,255,0.5)" }}>task_alt</Icon>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          Today's Tasks
        </Typography>
        {total > 0 && (
          <Box sx={{ ml: 1, px: 1, py: 0.25, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.15)" }}>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "white" }}>{total} pending</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {tasks.map((row, i) => (
          <Box key={i} display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.memberColor, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "white", minWidth: 80, flexShrink: 0 }}>
              {row.memberName}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
              {row.items.join(" · ")}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MealsCard({ meals }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Icon sx={{ fontSize: "1rem !important", color: "rgba(255,255,255,0.5)" }}>restaurant</Icon>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          Today's Meals
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {meals.map((meal, i) => (
          <Box key={i} display="flex" alignItems="center" gap={2}>
            <Typography sx={{ fontSize: "1.1rem", lineHeight: 1, width: 28, flexShrink: 0 }}>{meal.emoji}</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", width: 80, flexShrink: 0 }}>
              {meal.label}
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "white" }}>
              {meal.title}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function EventsCard({ events }) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Icon sx={{ fontSize: "1rem !important", color: "rgba(255,255,255,0.5)" }}>event</Icon>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          Coming Up
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {events.map((evt, i) => (
          <Box key={i} display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: evt.memberColor, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "white", minWidth: 80, flexShrink: 0 }}>
              {evt.memberName}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", flex: 1 }}>
              {evt.title}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", flexShrink: 0, ml: 2 }}>
              {evt.timeLabel}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

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

// Module-level counter — avoids CRA closure bugs in setInterval callbacks
let moduleTransitionCount = 0;

/**
 * Fullscreen photo slideshow overlay with Sony TV-style Ken Burns effect
 */
function PhotoFrame({ photos, interval = 10, weather, ambientInfo, onDismiss }) {
  const displayTime = interval * 1000;
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState(-1);
  const [fading, setFading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoCardIndex, setInfoCardIndex] = useState(0);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const kenBurnsRef = useRef(photos.map(() => randomKenBurns()));

  // Ensure kenBurns array matches photos length
  useEffect(() => {
    if (photos.length > kenBurnsRef.current.length) {
      kenBurnsRef.current = photos.map(() => randomKenBurns());
    }
  }, [photos.length]);

  // Reset transition counter on mount/unmount
  useEffect(() => {
    moduleTransitionCount = 0;
    return () => { moduleTransitionCount = 0; };
  }, []);

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

        // Trigger ambient info panel every 2nd transition
        moduleTransitionCount += 1;
        if (moduleTransitionCount % 2 === 0 && ambientInfo) {
          const activeCards = [
            ambientInfo.tasks?.length  > 0 && "tasks",
            ambientInfo.meals?.length  > 0 && "meals",
            ambientInfo.events?.length > 0 && "events",
          ].filter(Boolean);
          if (activeCards.length > 0) {
            setInfoCardIndex((idx) => (idx + 1) % activeCards.length);
            setShowInfo(true);
            setTimeout(() => setShowInfo(false), 8000);
          }
        }

        return next;
      });
    }, displayTime);
    return () => clearInterval(timer);
  }, [photos.length, displayTime, ambientInfo]);

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
        position: "absolute",
        bottom: showInfo ? 280 : 40,
        left: 40,
        color: "white", pointerEvents: "none",
        transition: "bottom 600ms cubic-bezier(0.22, 1, 0.36, 1)",
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
          position: "absolute",
          bottom: showInfo ? 280 : 40,
          right: 40,
          color: "white", pointerEvents: "none", textAlign: "right",
          transition: "bottom 600ms cubic-bezier(0.22, 1, 0.36, 1)",
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

      {/* Ambient info lower-third panel — cycles Tasks / Meals / Events */}
      {ambientInfo && (() => {
        const activeCards = [
          ambientInfo.tasks?.length  > 0 && "tasks",
          ambientInfo.meals?.length  > 0 && "meals",
          ambientInfo.events?.length > 0 && "events",
        ].filter(Boolean);
        if (activeCards.length === 0) return null;
        const currentCard = activeCards[infoCardIndex % activeCards.length];
        return (
          <Box sx={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            transform: showInfo ? "translateY(0)" : "translateY(100%)",
            opacity: showInfo ? 1 : 0,
            transition: showInfo
              ? "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease"
              : "opacity 1000ms ease, transform 800ms ease",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            px: { xs: 3, md: 5 }, pt: 3, pb: 4,
            pointerEvents: "none",
            zIndex: 2,
          }}>
            {/* Gradient blend into photo above */}
            <Box sx={{
              position: "absolute", top: -40, left: 0, right: 0, height: 40,
              background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
              pointerEvents: "none",
            }} />
            {currentCard === "tasks"  && <TasksCard  tasks={ambientInfo.tasks}  total={ambientInfo.totalPendingTasks} />}
            {currentCard === "meals"  && <MealsCard  meals={ambientInfo.meals} />}
            {currentCard === "events" && <EventsCard events={ambientInfo.events} />}
          </Box>
        );
      })()}

      {/* Art attribution — shown for artwork photos (bottom right, above weather) */}
      {(() => {
        const photo = photos[current];
        if (!photo || photo.source !== "art") return null;
        return (
          <Box sx={{
            position: "absolute",
            bottom: showInfo ? (weather ? 340 : 240) : (weather ? 140 : 40),
            transition: "bottom 600ms cubic-bezier(0.22, 1, 0.36, 1)",
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
  ambientInfo: PropTypes.shape({
    tasks: PropTypes.arrayOf(PropTypes.shape({
      memberName: PropTypes.string,
      memberColor: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.string),
    })),
    meals: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string,
      emoji: PropTypes.string,
      label: PropTypes.string,
      title: PropTypes.string,
    })),
    events: PropTypes.arrayOf(PropTypes.shape({
      memberName: PropTypes.string,
      memberColor: PropTypes.string,
      title: PropTypes.string,
      timeLabel: PropTypes.string,
    })),
    totalPendingTasks: PropTypes.number,
  }),
};

export default PhotoFrame;
