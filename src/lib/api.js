// API base URL — uses relative paths on same-origin, full URL in Tauri/local
const FALLBACK_URL = "https://calendar-app-01.vercel.app";

function isSameOrigin() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("vercel.app") || host.includes("asikmydeen.com") || host === "localhost";
}

export function apiUrl(path) {
  // On same-origin deployments (Vercel, self-hosted, local), use relative paths
  if (isSameOrigin()) return path;
  // In Tauri or other contexts, call the deployed API
  return `${FALLBACK_URL}${path}`;
}
