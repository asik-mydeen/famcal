/**
 * Google Photos Library API integration.
 *
 * Calls go through /api/photos serverless function because the Photos Library API
 * does NOT support CORS for direct browser requests.
 * Uses the provider_token from Supabase Auth (Google OAuth) for authentication.
 */

function getProviderToken() {
  return localStorage.getItem("famcal_provider_token") || null;
}

export function isGooglePhotosConnected() {
  return Boolean(getProviderToken());
}

export async function connectGooglePhotos() {
  const token = getProviderToken();
  if (!token) {
    throw new Error("No Google token available. Please sign out and sign in again to grant Photos access.");
  }
  // Test via serverless proxy
  const res = await fetch("/api/photos?action=albums", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) {
    const errBody = await res.json().catch(() => ({}));
    console.error("[photos] 403 via proxy:", JSON.stringify(errBody));
    throw new Error(
      "SCOPE_ERROR: Google Photos permission issue. Check that Photos Library API is enabled " +
      "and photoslibrary.readonly scope is granted during sign-in."
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

export async function fetchAlbums() {
  const token = getProviderToken();
  if (!token) throw new Error("Not signed in with Google. Sign out and sign in again.");

  const res = await fetch("/api/photos?action=albums", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    console.error("[photos] Albums 403:", JSON.stringify(err));
    throw new Error(
      "PHOTOS_ACCESS_DENIED: " + (err.error?.message || "Google Photos access denied. " +
      "Ensure Photos Library API is enabled in Google Cloud Console.")
    );
  }
  if (res.status === 401) {
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

export async function fetchPhotosFromAlbums(albumIds) {
  if (!albumIds || albumIds.length === 0) return [];

  const token = getProviderToken();
  if (!token) return [];

  const photos = [];

  for (const albumId of albumIds) {
    try {
      const res = await fetch("/api/photos?action=photos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ albumId }),
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
