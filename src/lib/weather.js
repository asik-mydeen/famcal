const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const CACHE_KEY = "famcal_weather_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const ICON_MAP = {
  "01d": "wb_sunny",
  "01n": "nights_stay",
  "02d": "partly_cloudy_day",
  "02n": "nights_stay",
  "03d": "cloud",
  "03n": "cloud",
  "04d": "cloud",
  "04n": "cloud",
  "09d": "water_drop",
  "09n": "water_drop",
  "10d": "rainy",
  "10n": "rainy",
  "11d": "thunderstorm",
  "11n": "thunderstorm",
  "13d": "ac_unit",
  "13n": "ac_unit",
  "50d": "foggy",
  "50n": "foggy",
};

export async function fetchWeather(location) {
  if (!API_KEY || !location) return null;

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    } catch {
      /* ignore bad cache */
    }
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        location
      )}&units=imperial&appid=${API_KEY}`
    );
    if (!res.ok) return null;
    const json = await res.json();

    const weather = {
      temp: Math.round(json.main.temp),
      condition: json.weather[0]?.main || "",
      icon: ICON_MAP[json.weather[0]?.icon] || "wb_sunny",
      humidity: json.main.humidity,
      wind: Math.round(json.wind?.speed || 0),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: weather, timestamp: Date.now() }));
    return weather;
  } catch {
    return null;
  }
}

export async function fetchForecast(location) {
  if (!API_KEY || !location) return [];

  const cacheKey = "famcal_forecast_cache";
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    } catch {
      /* ignore */
    }
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        location
      )}&units=imperial&appid=${API_KEY}`
    );
    if (!res.ok) return [];
    const json = await res.json();

    // Get one entry per day (noon)
    const days = {};
    for (const item of json.list) {
      const date = item.dt_txt.split(" ")[0];
      const hour = parseInt(item.dt_txt.split(" ")[1].split(":")[0]);
      if (hour === 12 && !days[date]) {
        days[date] = {
          date,
          temp: Math.round(item.main.temp),
          icon: ICON_MAP[item.weather[0]?.icon] || "wb_sunny",
          condition: item.weather[0]?.main || "",
        };
      }
    }

    const forecast = Object.values(days).slice(0, 3);
    localStorage.setItem(cacheKey, JSON.stringify({ data: forecast, timestamp: Date.now() }));
    return forecast;
  } catch {
    return [];
  }
}
