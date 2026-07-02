import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

export const checkReminders = onSchedule("every 10 minutes", async (event) => {
  const db = getFirestore();
  const messaging = getMessaging();

  const now = new Date();
  // Buscar turnos que comiencen entre ahora + 20 minutos y ahora + 40 minutos (ventana para el aviso de 30 mins)
  const minTime = new Date(now.getTime() + 20 * 60 * 1000);
  const maxTime = new Date(now.getTime() + 40 * 60 * 1000);

  console.log(`[Cron] Buscando turnos entre ${minTime.toISOString()} y ${maxTime.toISOString()}`);

  try {
    const appointmentsRef = db.collection("accounts").doc("caro").collection("appointments");
    const snapshot = await appointmentsRef
      .where("startAt", ">=", Timestamp.fromDate(minTime))
      .where("startAt", "<=", Timestamp.fromDate(maxTime))
      .get();

    if (snapshot.empty) {
      console.log("[Cron] No hay turnos en esta ventana de tiempo.");
      return;
    }

    const upcomingAppointments = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((app: any) => app.webReminderSent !== true && app.canceled !== true);

    if (upcomingAppointments.length === 0) {
      console.log("[Cron] Todos los turnos ya fueron notificados.");
      return;
    }

    // Obtener todos los tokens FCM registrados para 'caro'
    const tokensRef = db.collection("accounts").doc("caro").collection("fcm_tokens");
    const tokensSnapshot = await tokensRef.get();

    if (tokensSnapshot.empty) {
      console.log("[Cron] No hay tokens FCM registrados.");
      return;
    }

    const tokens = tokensSnapshot.docs.map((d) => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      console.log("[Cron] No hay tokens válidos.");
      return;
    }

    console.log(`[Cron] Enviando notificaciones a ${tokens.length} dispositivos para ${upcomingAppointments.length} turnos.`);

    for (const app of upcomingAppointments as any[]) {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: tokens,
          notification: {
            title: "💅 ¡Turno Próximo!",
            body: `En 30 minutos llega tu clienta: ${app.clientNameSnapshot}`,
          },
          data: {
            appointmentId: app.id,
          },
        });

        console.log(`[Cron] Mensaje enviado para el turno ${app.id}. Éxitos: ${response.successCount}, Fallas: ${response.failureCount}`);

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const badToken = tokens[idx];
              if (
                resp.error.code === "messaging/invalid-registration-token" ||
                resp.error.code === "messaging/registration-token-not-registered"
              ) {
                console.log(`[Cron] Borrando token inválido: ${badToken}`);
                tokensRef.doc(badToken).delete().catch(console.error);
              }
            }
          });
        }

        // Marcar el turno para no volver a notificarlo en la siguiente ejecución
        await appointmentsRef.doc(app.id).update({
          webReminderSent: true,
        });
      } catch (err) {
        console.error(`[Cron] Falló el multicast del turno ${app.id}:`, err);
      }
    }
  } catch (error) {
    console.error("[Cron] Error ejecutando la tarea de recordatorios:", error);
  }
});
