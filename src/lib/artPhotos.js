/**
 * Art Institute of Chicago API client.
 *
 * Free, CORS-enabled, no authentication required.
 * Fetches high-quality artwork images for the screensaver.
 *
 * API docs: https://api.artic.edu/docs/
 * Image URL pattern: https://www.artic.edu/iiif/2/{image_id}/full/1686,/0/default.jpg
 */

const AIC_BASE = "https://api.artic.edu/api/v1";
const AIC_IIIF = "https://www.artic.edu/iiif/2";
const FIELDS = "id,title,artist_display,date_display,image_id";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Category search terms mapped to AIC query strings
export const ART_CATEGORIES = [
  { key: "all",           label: "All Art",        icon: "auto_awesome" },
  { key: "impressionism", label: "Impressionism",  icon: "brush" },
  { key: "renaissance",   label: "Renaissance",    icon: "account_balance" },
  { key: "modern",        label: "Modern Art",     icon: "grid_view" },
  { key: "asian",         label: "Asian Art",      icon: "temple_buddhist" },
  { key: "landscape",     label: "Landscapes",     icon: "landscape" },
  { key: "portrait",      label: "Portraits",      icon: "face" },
];

const CATEGORY_QUERIES = {
  all:           null,
  impressionism: "impressionism monet renoir",
  renaissance:   "renaissance da vinci raphael",
  modern:        "modern abstract picasso",
  asian:         "chinese japanese asian",
  landscape:     "landscape nature scenery",
  portrait:      "portrait figure",
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseArtwork(item) {
  if (!item.image_id) return null;
  return {
    id: `art-${item.id}`,
    url: `${AIC_IIIF}/${item.image_id}/full/1686,/0/default.jpg`,
    title: item.title || "Untitled",
    artist: (item.artist_display || "").split("\n")[0] || "Unknown Artist",
    year: item.date_display || "",
    source: "art",
    caption: item.title || "",
  };
}

/**
 * Fetch artwork photos from the Art Institute of Chicago.
 * @param {string} category - One of ART_CATEGORIES keys
 * @param {number} count - Number of artworks to fetch
 * @returns {Promise<Array>} Array of photo objects with { id, url, title, artist, year, source }
 */
export async function fetchArtPhotos(category = "all", count = 24) {
  const cacheKey = `famcal_art_cache_${category}`;

  // Return cached results if fresh
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { photos, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return shuffleArray(photos);
      }
    }
  } catch {}

  const query = CATEGORY_QUERIES[category];
  const randomPage = Math.floor(Math.random() * 8) + 1;

  let url;
  if (query) {
    // Search endpoint for specific categories
    url = `${AIC_BASE}/artworks/search?q=${encodeURIComponent(query)}&limit=${count}&page=${randomPage}&fields=${FIELDS}`;
  } else {
    // General endpoint — all artworks, random page
    url = `${AIC_BASE}/artworks?limit=${count}&page=${randomPage}&fields=${FIELDS}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Art API error: ${res.status}`);

  const data = await res.json();
  const photos = (data.data || [])
    .map(parseArtwork)
    .filter(Boolean);

  // Cache to sessionStorage
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ photos, timestamp: Date.now() }));
  } catch {}

  return shuffleArray(photos);
}
