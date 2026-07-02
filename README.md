# Caro Nails 💅

Aplicación web progresiva (PWA) de administración y agenda de belleza, optimizada para celulares y escritorio.

## 🚀 Tecnologías

* **Core:** React Native / Expo SDK 54 (Metro Web Bundler)
* **Estilo:** Estilo de diseño premium (Deep Plum & Rose Gold)
* **Base de datos & Auth:** Firebase (Firestore & Auth)
* **Notificaciones:** Firebase Cloud Messaging (FCM) + Vercel Cron Jobs para recordatorios de turnos (30 minutos antes).

## ⚙️ Variables de Entorno (Vercel)

Para habilitar las notificaciones push en la versión Web/PWA, es necesario configurar las siguientes variables de entorno en Vercel:

1. `EXPO_PUBLIC_FIREBASE_VAPID_KEY` - Clave Web Push generada en la consola de Firebase.
2. `FIREBASE_SERVICE_ACCOUNT_KEY` - Clave privada JSON de la cuenta de servicio de Firebase.
3. `CRON_SECRET` - Clave secreta generada por Vercel para autorizar los cron jobs.
