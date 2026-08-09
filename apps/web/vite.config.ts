import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Gathere",
        short_name: "Gathere",
        description: "Discover and join local activities with Gathere",
        theme_color: "#004c22",
        background_color: "#fcf9f6",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "activity-media",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@activity-match/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@activity-match/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  optimizeDeps: {
    // Workspace packages change often; pre-bundling caches stale exports (e.g. ToggleSwitch).
    exclude: ["@activity-match/shared", "@activity-match/ui"],
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    open: true,
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
    watch: {
      // Rebuild when shared workspace packages change.
      ignored: ["!**/packages/**"],
    },
  },
});
