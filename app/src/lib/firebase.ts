// src/lib/firebase.ts
import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = initializeFirestore(app, { localCache: persistentLocalCache() });

// Web usa getAuth(); nativo usa initializeAuth + AsyncStorage
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : (() => {
        try {
          // Intentar obtener una instancia ya inicializada para evitar el error de re-inicialización
          const existingAuth = getAuth(app);
          if (existingAuth) return existingAuth;
        } catch (e) {
          // Si no está inicializada aún, getAuth(app) lanzará un error y pasará a inicializarla abajo
        }

        try {
          return initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
        } catch (e) {
          console.warn("initializeAuth failed, falling back to getAuth:", e);
          try {
            return getAuth(app);
          } catch (err) {
            console.error("Fallback getAuth also failed:", err);
            throw err;
          }
        }
      })();