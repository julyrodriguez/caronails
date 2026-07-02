// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAVH2AUNTZh5yS3CkORijBehtlMIQKVIEo",
  authDomain: "aplicacioncelucine.firebaseapp.com",
  projectId: "aplicacioncelucine",
  storageBucket: "aplicacioncelucine.appspot.com",
  messagingSenderId: "357929481942",
  appId: "1:357929481942:android:252a53c3592be338137b77"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Mensaje push en segundo plano recibido:', payload);
  const notificationTitle = payload.notification?.title || '💅 Turno Caro Nails';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes un turno programado.',
    icon: '/iconCaro.jpeg',
    badge: '/iconCaro.jpeg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
