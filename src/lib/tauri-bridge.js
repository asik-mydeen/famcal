/**
 * Tauri bridge — detects Tauri environment and provides platform-safe wrappers.
 * All functions gracefully fall back to browser APIs when not in Tauri.
 */

export function isTauri() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export async function toggleFullscreen() {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const isFs = await win.isFullscreen();
      await win.setFullscreen(!isFs);
      return !isFs;
    } catch {
      // Fall through to browser API
    }
  }
  // Browser fallback
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.();
    return true;
  } else {
    await document.exitFullscreen?.();
    return false;
  }
}

export async function setAlwaysOnTop(enabled) {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setAlwaysOnTop(enabled);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function preventSleep() {
  // Try browser Wake Lock first (works in WebView2)
  if ("wakeLock" in navigator) {
    try {
      return await navigator.wakeLock.request("screen");
    } catch {
      // Wake Lock not available (e.g., macOS WKWebView)
    }
  }
  return null;
}

export async function enableAutostart() {
  if (isTauri()) {
    try {
      const { enable } = await import("@tauri-apps/plugin-autostart");
      await enable();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function isAutostartEnabled() {
  if (isTauri()) {
    try {
      const { isEnabled } = await import("@tauri-apps/plugin-autostart");
      return await isEnabled();
    } catch {
      return false;
    }
  }
  return false;
}

export async function disableAutostart() {
  if (isTauri()) {
    try {
      const { disable } = await import("@tauri-apps/plugin-autostart");
      await disable();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function restartApp() {
  if (isTauri()) {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
      return;
    } catch {
      // Fall through
    }
  }
  window.location.reload();
}
