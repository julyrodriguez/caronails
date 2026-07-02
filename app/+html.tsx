import React from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* PWA Links */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D48C9E" />
        
        {/* PWA iOS Specific Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Caro Nails" />
        <link rel="apple-touch-icon" href="/iconCaro.jpeg" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('Service Worker registrado:', reg.scope))
                    .catch(err => console.log('Error al registrar Service Worker:', err));
                });
              }
            `,
          }}
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
