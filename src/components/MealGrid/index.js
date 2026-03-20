import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MealGrid({ meals, weekDates, onCellClick, onMealEdit, darkMode }) {
  const theme = useTheme();

  // Get current date (no time) for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getMealForCell = (date, mealType) => {
    const dateStr = date.toISOString().split("T")[0];
    return meals.find((m) => m.date === dateStr && m.meal_type === mealType);
  };

  const isToday = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  return (
    <Box
      sx={{
        overflowX: "auto",
        borderRadius: "16px",
        border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "100px repeat(4, 1fr)",
          minWidth: "600px",
        }}
      >
        {/* Header row */}
        <Box
          sx={{
            p: 1.5,
            borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Day
          </Typography>
        </Box>
        {MEAL_TYPES.map((mealType) => (
          <Box
            key={mealType}
            sx={{
              p: 1.5,
              borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              borderLeft: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {MEAL_LABELS[mealType]}
            </Typography>
          </Box>
        ))}

        {/* Rows for each day */}
        {weekDates.map((date, dayIndex) => {
          const isTodayRow = isToday(date);
          return (
            <Box
              key={dayIndex}
              sx={{
                display: "contents",
              }}
            >
              {/* Day column */}
              <Box
                sx={{
                  p: 1.5,
                  borderBottom:
                    dayIndex < 6
                      ? darkMode
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "1px solid rgba(0,0,0,0.06)"
                      : "none",
                  background: isTodayRow
                    ? "rgba(108,92,231,0.04)"
                    : darkMode
                    ? "transparent"
                    : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={isTodayRow ? 700 : 600}
                  color={isTodayRow ? "primary" : "text.secondary"}
                >
                  {DAY_NAMES[dayIndex]}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={isTodayRow ? 700 : 400}
                  color={isTodayRow ? "primary" : "text.primary"}
                >
                  {date.getDate()}
                </Typography>
              </Box>

              {/* Meal cells */}
              {MEAL_TYPES.map((mealType) => {
                const meal = getMealForCell(date, mealType);
                const isDinner = mealType === "dinner";

                return (
                  <Box
                    key={`${dayIndex}-${mealType}`}
                    onClick={() => {
                      if (meal) {
                        onMealEdit(meal);
                      } else {
                        onCellClick(date, mealType);
                      }
                    }}
                    sx={{
                      p: 1.5,
                      borderBottom:
                        dayIndex < 6
                          ? darkMode
                            ? "1px solid rgba(255,255,255,0.08)"
                            : "1px solid rgba(0,0,0,0.06)"
                          : "none",
                      borderLeft: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                      background: isTodayRow
                        ? "rgba(108,92,231,0.04)"
                        : isDinner
                        ? darkMode
                          ? "rgba(124,58,237,0.03)"
                          : "rgba(78,205,196,0.02)"
                        : "transparent",
                      cursor: "pointer",
                      touchAction: "manipulation",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                        transform: "translateY(-1px)",
                      },
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "60px",
                    }}
                  >
                    {meal ? (
                      <Box
                        sx={{
                          background: darkMode ? "rgba(124,58,237,0.15)" : "rgba(78,205,196,0.1)",
                          borderRadius: "10px",
                          px: 1.5,
                          py: 0.75,
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{
                            fontSize: "0.8rem",
                            color: darkMode ? "#e9d5ff" : "#0f766e",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {meal.title}
                        </Typography>
                      </Box>
                    ) : (
                      <Icon
                        sx={{
                          fontSize: "1.5rem",
                          opacity: 0.3,
                          color: darkMode ? "#fff" : "#000",
                        }}
                      >
                        add
                      </Icon>
                    )}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

MealGrid.propTypes = {
  meals: PropTypes.array.isRequired,
  weekDates: PropTypes.array.isRequired,
  onCellClick: PropTypes.func.isRequired,
  onMealEdit: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

export default MealGrid;
