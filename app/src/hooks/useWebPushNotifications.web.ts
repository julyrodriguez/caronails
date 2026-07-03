import React from "react";
import { Platform } from "react-native";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useWebPushNotifications(user: any) {
  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!user) return;

    async function registerPush() {
      try {
        // 1. Solicitar permisos de notificación en el navegador
        if (!("Notification" in window)) {
          console.log("Este navegador no soporta notificaciones de escritorio.");
          return;
        }

        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.log("Permiso de notificaciones denegado por el usuario.");
          return;
        }

        // 2. Obtener token de FCM
        const messaging = getMessaging();
        const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

        if (!vapidKey) {
          console.warn(
            "Falta definir la variable EXPO_PUBLIC_FIREBASE_VAPID_KEY en tu entorno (.env.local o Vercel). No se puede registrar el token de notificaciones push web."
          );
          return;
        }

        const token = await getToken(messaging, { vapidKey });

        if (token) {
          console.log("FCM Web Token obtenido con éxito:", token);

          // 3. Guardar el token en Firestore bajo la cuenta del usuario
          const tokenRef = doc(db, "accounts", "caro", "fcm_tokens", token);
          await setDoc(
            tokenRef,
            {
              token,
              platform: "web",
              userAgent: navigator.userAgent,
              lastSeen: serverTimestamp(),
            },
            { merge: true }
          );

          // 4. Registrar callback para cuando la app está abierta en primer plano
          onMessage(messaging, (payload) => {
            console.log("Mensaje push en primer plano recibido:", payload);
            // Mostrar notificación visual
            new Notification(payload.notification?.title || "💅 Turno Caro Nails", {
              body: payload.notification?.body || "",
              icon: "/iconCaro.jpeg",
            });
          });
        }
      } catch (error) {
        console.error("Error al registrar notificaciones push web:", error);
      }
    }

    registerPush();
  }, [user]);
}
