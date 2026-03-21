/**
 * Google Photos Library API integration.
 * Uses GIS (Google Identity Services) for OAuth tokens with photos scope.
 */

const PHOTOS_SCOPE = "https://www.googleapis.com/auth/photoslibrary.readonly";
const PHOTOS_API = "https://photoslibrary.googleapis.com/v1";

// Token management (separate from calendar tokens)
let photosToken = null;
let photosTokenExpiry = 0;

function getGoogleClientId() {
  return process.env.REACT_APP_GOOGLE_CLIENT_ID || localStorage.getItem("famcal_google_client_id") || "";
}

// Request access token for Google Photos
export function requestPhotosToken() {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) return reject(new Error("Google Client ID not configured"));
    if (!window.google?.accounts?.oauth2) return reject(new Error("Google Identity Services not loaded"));

    // Check cache
    if (photosToken && photosTokenExpiry > Date.now()) return resolve(photosToken);

    // Check localStorage
    const stored = localStorage.getItem("famcal_photos_token");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.expiry > Date.now()) {
        photosToken = parsed.token;
        photosTokenExpiry = parsed.expiry;
        return resolve(photosToken);
      }
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: PHOTOS_SCOPE,
      include_granted_scopes: true,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        photosToken = resp.access_token;
        photosTokenExpiry = Date.now() + resp.expires_in * 1000 - 60000;
        localStorage.setItem("famcal_photos_token", JSON.stringify({ token: photosToken, expiry: photosTokenExpiry }));
        resolve(photosToken);
      },
      error_callback: () => reject(new Error("Google Photos auth failed — try reconnecting in Settings")),
    });

    tokenClient.requestAccessToken({ prompt: "" });
  });
}

// Connect Google Photos (with consent prompt)
export function connectGooglePhotos() {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) return reject(new Error("Google Client ID not configured"));
    if (!window.google?.accounts?.oauth2) return reject(new Error("Google Identity Services not loaded"));

    // Clear any cached token so we get a fresh one with the photos scope
    photosToken = null;
    photosTokenExpiry = 0;
    localStorage.removeItem("famcal_photos_token");

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: PHOTOS_SCOPE,
      include_granted_scopes: true,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        // Verify the granted scope includes photos
        const grantedScopes = (resp.scope || "").split(" ");
        if (!grantedScopes.some(s => s.includes("photoslibrary"))) {
          return reject(new Error("Photos permission was not granted. Please allow access to Google Photos."));
        }
        photosToken = resp.access_token;
        photosTokenExpiry = Date.now() + resp.expires_in * 1000 - 60000;
        localStorage.setItem("famcal_photos_token", JSON.stringify({ token: photosToken, expiry: photosTokenExpiry }));
        resolve(photosToken);
      },
      error_callback: () => reject(new Error("Google Photos auth was cancelled or failed")),
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// Disconnect
export function disconnectGooglePhotos() {
  if (photosToken) {
    window.google?.accounts?.oauth2?.revoke?.(photosToken);
  }
  photosToken = null;
  photosTokenExpiry = 0;
  localStorage.removeItem("famcal_photos_token");
  localStorage.removeItem("famcal_photos_albums");
  localStorage.removeItem("famcal_photos_selected_albums");
}

// Check if connected
export function isGooglePhotosConnected() {
  if (photosToken && photosTokenExpiry > Date.now()) return true;
  const stored = localStorage.getItem("famcal_photos_token");
  if (stored) {
    const parsed = JSON.parse(stored);
    return parsed.expiry > Date.now();
  }
  return false;
}

// Fetch albums
export async function fetchAlbums() {
  const token = await requestPhotosToken();
  const res = await fetch(`${PHOTOS_API}/albums?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) {
    // Token doesn't have photos scope — clear it and force reconnect
    disconnectGooglePhotos();
    throw new Error(
      "SCOPE_ERROR: Google Photos permission not granted. " +
      "Please ensure 'Photos Library API' is enabled in Google Cloud Console AND " +
      "'photoslibrary.readonly' scope is added to your OAuth consent screen (OAuth consent screen → Scopes → Add scope)."
    );
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

  const token = await requestPhotosToken();
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
          // Google Photos URLs need size params. =w1920-h1080 gets a 1080p version
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
