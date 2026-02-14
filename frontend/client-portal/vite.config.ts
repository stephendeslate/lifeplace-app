// lifeplace-app/frontend/client-portal/vite.config.ts

import { reactRouter } from "@react-router/dev/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [
    reactRouter(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: "client-portal",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: {
              name: process.env.VITE_SENTRY_RELEASE,
            },
            sourcemaps: {
              filesToDeleteAfterUpload: ["./build/**/*.map"],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
    // Force all React imports to use the same instance from client-portal's node_modules
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
  },
  build: {
    sourcemap: "hidden",
    minify: "esbuild",
    target: "es2020",
    cssCodeSplit: true,
    // Performance optimizations
    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,
    cssMinify: true,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@mui/material",
      "@mui/icons-material",
      "@tanstack/react-query",
      "@stripe/react-stripe-js",
      "@stripe/stripe-js",
      "axios",
    ],
    exclude: ["@vite/client", "@vite/env"],
  },
  server: {
    port: 5174,
    host: true,
    hmr: {
      overlay: false, // Reduce HMR overlay noise
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
  ssr: {
    // Bundle all deps during build so Vite handles CJS→ESM interop for pre-rendering.
    // In dev, only bundle specific CJS packages that break ESM named imports.
    noExternal: command === "build" ? true : [/lodash/],
  },
  // Performance monitoring
  define: {
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));
