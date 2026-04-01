// Notification utility for FamCal
// Handles permission requests and showing browser notifications

export const NOTIF_PERMISSION = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default',
};

export function canNotify() {
  return 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!canNotify()) return NOTIF_PERMISSION.DENIED;
  if (Notification.permission === NOTIF_PERMISSION.GRANTED) return NOTIF_PERMISSION.GRANTED;
  return await Notification.requestPermission();
}

export function showNotification(title, options = {}) {
  if (!canNotify() || Notification.permission !== NOTIF_PERMISSION.GRANTED) return;
  const notif = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  });
  // Auto-close after 5 seconds
  setTimeout(() => notif.close(), 5000);
  return notif;
}

export function notifyEventAdded(event, actorName) {
  showNotification(`${actorName} added an event`, {
    body: `${event.title}${event.start ? ` · ${new Date(event.start).toLocaleDateString()}` : ''}`,
    tag: `event-add-${event.id}`,
  });
}

export function notifyEventUpdated(event, actorName) {
  showNotification(`${actorName} updated an event`, {
    body: event.title,
    tag: `event-update-${event.id}`,
  });
}

export function notifyEventDeleted(eventTitle, actorName) {
  showNotification(`${actorName} removed an event`, {
    body: eventTitle,
    tag: `event-delete-${Date.now()}`,
  });
}
