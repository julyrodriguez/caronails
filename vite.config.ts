import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'EXPO_PUBLIC_']);
  
  // Format environment variables safely for client-side injection
  const processEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    processEnv[`process.env.${k}`] = JSON.stringify(v);
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    define: processEnv,
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
