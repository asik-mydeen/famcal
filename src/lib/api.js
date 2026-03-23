// API base URL — uses relative paths on Vercel, full URL in Tauri/local
const VERCEL_URL = "https://calendar-app-01.vercel.app";

function isVercel() {
  return typeof window !== "undefined" &&
    window.location.hostname.includes("vercel.app");
}

export function apiUrl(path) {
  // On Vercel deployment, use relative paths (same origin)
  if (isVercel()) return path;
  // Locally or in Tauri, call the deployed Vercel API
  return `${VERCEL_URL}${path}`;
}
