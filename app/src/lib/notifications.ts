import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const APPOINTMENT_CHANNEL_ID = "appointments";
const APPOINTMENT_REMINDER_MINUTES = 30;

export type ScheduleAppointmentResult =
  | { ok: true; notificationId: string }
  | {
      ok: false;
      reason:
        | "web"
        | "permission-denied"
        | "trigger-in-past"
        | "schedule-failed";
      message: string;
    };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(APPOINTMENT_CHANNEL_ID, {
    name: "Turnos",
    description: "Recordatorios de turnos",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    enableLights: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: "default",
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  await setupNotifications();

  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;

  if (!granted) {
    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    granted = request.granted;
  }

  return granted;
}

export async function scheduleAppointmentNotification(
  appointmentId: string,
  clientName: string,
  appointmentTime: Date
): Promise<ScheduleAppointmentResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      reason: "web",
      message: "En web no se programan notificaciones locales.",
    };
  }

  try {
    await setupNotifications();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return {
        ok: false,
        reason: "permission-denied",
        message: "La app no tiene permisos de notificación.",
      };
    }

    const now = new Date();
    const notificationDate = new Date(
      appointmentTime.getTime() - APPOINTMENT_REMINDER_MINUTES * 60 * 1000
    );

    if (notificationDate <= now) {
      return {
        ok: false,
        reason: "trigger-in-past",
        message:
          "No se pudo programar el recordatorio porque la hora de aviso ya pasó.",
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💅 Turno próximo",
        body: `En ${APPOINTMENT_REMINDER_MINUTES} minutos llega ${clientName}`,
        data: { appointmentId, clientName },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
        ...(Platform.OS === "android"
          ? { channelId: APPOINTMENT_CHANNEL_ID }
          : {}),
      },
    });

    return {
      ok: true,
      notificationId,
    };
  } catch (error: any) {
    return {
      ok: false,
      reason: "schedule-failed",
      message:
        error?.message ??
        "Android no permitió programar la notificación en este momento.",
    };
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getAllScheduledNotifications() {
  if (Platform.OS === "web") return [];
  return await Notifications.getAllScheduledNotificationsAsync();
}