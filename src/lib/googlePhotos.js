/**
 * Google Photos Library API integration.
 * Uses the provider_token from Supabase Auth (Google OAuth) instead of separate GIS popups.
 * The token is captured during sign-in and stored in localStorage.
 */

const PHOTOS_API = "https://photoslibrary.googleapis.com/v1";

// Get the Google provider token (from Supabase Auth sign-in)
function getProviderToken() {
  return localStorage.getItem("famcal_provider_token") || null;
}

// Check if Google Photos is accessible (has a provider token)
export function isGooglePhotosConnected() {
  return Boolean(getProviderToken());
}

// No separate "connect" needed — photos access comes from the main Google sign-in.
// If the user signed in with the photos scope, the provider token has access.
// If not, they need to sign out and sign in again.
export async function connectGooglePhotos() {
  const token = getProviderToken();
  if (!token) {
    throw new Error("No Google token available. Please sign out and sign in again to grant Photos access.");
  }
  // Verify the token works by making a test call
  const res = await fetch(`${PHOTOS_API}/albums?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) {
    throw new Error(
      "SCOPE_ERROR: Photos permission not granted. Please sign out, then sign in again — " +
      "you'll be prompted to grant Google Photos access."
    );
  }
  if (!res.ok) {
    throw new Error("Failed to verify Google Photos access: " + res.status);
  }
  return token;
}

export function disconnectGooglePhotos() {
  localStorage.removeItem("famcal_photos_selected_albums");
}

// Fetch albums
export async function fetchAlbums() {
  const token = getProviderToken();
  if (!token) throw new Error("Not signed in with Google. Sign out and sign in again.");

  const res = await fetch(`${PHOTOS_API}/albums?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) {
    throw new Error(
      "SCOPE_ERROR: Google Photos permission not granted during sign-in. " +
      "Please sign out and sign in again — the consent screen will ask for Photos access."
    );
  }
  if (res.status === 401) {
    // Token expired — user needs to sign in again
    throw new Error("TOKEN_EXPIRED: Google token expired. Please sign out and sign in again.");
  }
  if (!res.ok) throw new Error("Failed to fetch albums: " + res.status);

  const data = await res.json();
  return (data.albums || []).map(a => ({
    id: a.id,
    title: a.title || "Untitled",
    coverUrl: a.coverPhotoBaseUrl ? `${a.coverPhotoBaseUrl}=w200-h200-c` : null,
    itemCount: parseInt(a.mediaItemsCount || "0"),
  }));
}

// Fetch photos from selected albums
export async function fetchPhotosFromAlbums(albumIds) {
  if (!albumIds || albumIds.length === 0) return [];

  const token = getProviderToken();
  if (!token) return [];

  const photos = [];

  for (const albumId of albumIds) {
    try {
      const res = await fetch(`${PHOTOS_API}/mediaItems:search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ albumId, pageSize: 50 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const items = (data.mediaItems || [])
        .filter(item => item.mimeType?.startsWith("image/"))
        .map(item => ({
          id: item.id,
          url: `${item.baseUrl}=w1920-h1080`,
          caption: item.description || "",
          width: parseInt(item.mediaMetadata?.width || "1920"),
          height: parseInt(item.mediaMetadata?.height || "1080"),
          creationTime: item.mediaMetadata?.creationTime || "",
        }));
      photos.push(...items);
    } catch (err) {
      console.warn(`[photos] Failed to fetch album ${albumId}:`, err.message);
    }
  }

  // Shuffle
  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }

  return photos;
}
