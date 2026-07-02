import { VercelRequest, VercelResponse } from "@vercel/node";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Inicializar Firebase Admin SDK de forma segura
if (getApps().length === 0) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    } else {
      console.warn("Falta definir la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY. No se puede inicializar Firebase Admin.");
    }
  } catch (error) {
    console.error("Error al inicializar Firebase Admin:", error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validar la llamada de Vercel Cron (seguridad)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  // 2. Verificar que Firebase Admin esté listo
  if (getApps().length === 0) {
    return res.status(500).json({
      error: "Firebase Admin no está inicializado. Asegúrate de configurar FIREBASE_SERVICE_ACCOUNT_KEY.",
    });
  }

  try {
    const db = getFirestore();
    const messaging = getMessaging();

    const now = new Date();
    // Buscar turnos que comiencen entre ahora + 20 minutos y ahora + 40 minutos (ventana para el aviso de 30 mins)
    const minTime = new Date(now.getTime() + 20 * 60 * 1000);
    const maxTime = new Date(now.getTime() + 40 * 60 * 1000);

    console.log(`Buscando turnos entre ${minTime.toISOString()} y ${maxTime.toISOString()}`);

    // Consultar los turnos de la cuenta 'caro'
    const appointmentsRef = db.collection("accounts").doc("caro").collection("appointments");
    const snapshot = await appointmentsRef
      .where("startAt", ">=", Timestamp.fromDate(minTime))
      .where("startAt", "<=", Timestamp.fromDate(maxTime))
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ message: "No hay turnos próximos en esta ventana de tiempo." });
    }

    // Filtrar en memoria para no requerir índice compuesto con 'webReminderSent'
    const upcomingAppointments = snapshot.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((app: any) => app.webReminderSent !== true && app.canceled !== true);

    if (upcomingAppointments.length === 0) {
      return res.status(200).json({ message: "Todos los turnos de esta ventana ya fueron notificados." });
    }

    // 3. Obtener todos los tokens FCM registrados para 'caro'
    const tokensRef = db.collection("accounts").doc("caro").collection("fcm_tokens");
    const tokensSnapshot = await tokensRef.get();

    if (tokensSnapshot.empty) {
      return res.status(200).json({
        message: "Se encontraron turnos, pero no hay ningún dispositivo registrado para recibir notificaciones (tokens FCM vacíos).",
      });
    }

    const tokens = tokensSnapshot.docs.map((d: any) => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      return res.status(200).json({ message: "No hay tokens válidos." });
    }

    console.log(`Enviando notificaciones a ${tokens.length} dispositivos para ${upcomingAppointments.length} turnos.`);

    let notificationsSent = 0;

    for (const app of upcomingAppointments as any[]) {
      // Enviar multicast a todos los dispositivos registrados
      const response = await messaging.sendEachForMulticast({
        tokens: tokens,
        notification: {
          title: "💅 ¡Turno Próximo!",
          body: `En 30 minutos llega tu clienta: ${app.clientNameSnapshot}`,
        },
        data: {
          appointmentId: app.id,
          click_action: "FLUTTER_NOTIFICATION_CLICK", // Para compatibilidad
        },
      });

      console.log(`Multicast enviado para el turno ${app.id}. Éxitos: ${response.successCount}, Fallas: ${response.failureCount}`);

      // Eliminar tokens que fallaron (por ejemplo, tokens expirados)
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success && resp.error) {
            const badToken = tokens[idx];
            // Si el token es inválido o no está registrado, lo borramos de la base de datos
            if (
              resp.error.code === "messaging/invalid-registration-token" ||
              resp.error.code === "messaging/registration-token-not-registered"
            ) {
              console.log(`Eliminando token inválido de la base de datos: ${badToken}`);
              tokensRef.doc(badToken).delete().catch(console.error);
            }
          }
        });
      }

      // Marcar el turno para no volver a notificarlo en la siguiente ejecución
      await appointmentsRef.doc(app.id).update({
        webReminderSent: true,
      });

      notificationsSent++;
    }

    return res.status(200).json({
      message: `Proceso completado. Notificados ${notificationsSent} turnos a ${tokens.length} dispositivos.`,
    });
  } catch (error: any) {
    console.error("Error al ejecutar recordatorios:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno del servidor" });
  }
}
