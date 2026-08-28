// src/lib/notifications.ts
export async function requestNotificationPermissions(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }
  return false;
}

export async function scheduleAppointmentNotification(
  _appointmentId: string,
  _clientName: string,
  _date: Date
) {
  // En Web PWA, las notificaciones se envían de forma centralizada vía Cloud Functions / Push FCM
  return null;
}

export async function cancelNotification(_notificationId?: string) {
  return null;
}
