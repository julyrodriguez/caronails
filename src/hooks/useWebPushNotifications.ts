// src/hooks/useWebPushNotifications.ts
import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useWebPushNotifications(user: any) {
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    async function registerPush() {
      try {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          return;
        }

        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          return;
        }

        const messaging = getMessaging();
        const vapidKey =
          process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY ||
          (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
          (import.meta as any).env?.EXPO_PUBLIC_FIREBASE_VAPID_KEY ||
          "BJlJKXi-l9wonfaEbZaXPuvEneWSvefFT0EnamnbQdte7WDRB0prO26jkFQlkPmGFEzLNr-jk4oNx3z1Yh4xe7s";

        const token = await getToken(messaging, { vapidKey });

        if (token) {
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

          onMessage(messaging, (payload) => {
            new Notification(payload.notification?.title || "💅 Turno Caro Nails", {
              body: payload.notification?.body || "",
              icon: "/iconCaro.jpeg",
            });
          });
        }
      } catch (error) {
        console.warn("Push notifications initialization notice:", error);
      }
    }

    registerPush();
  }, [user]);
}
