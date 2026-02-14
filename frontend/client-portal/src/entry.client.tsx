// frontend/client-portal/src/entry.client.tsx

import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import * as Sentry from "@sentry/react";
import "./index.css";

// Initialize Sentry for error monitoring in production
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (import.meta.env.PROD && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: import.meta.env.VITE_SENTRY_RELEASE || "client-portal@unknown",

    // Don't send PII
    sendDefaultPii: false,

    // Ignore specific errors
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error exception captured",
      "Network request failed",
      "Failed to fetch",
    ],
  });

  console.log("Sentry initialized for client-portal");
}

// Global error handlers for production monitoring
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.captureException(event.reason);
  }
});

window.addEventListener("error", (event) => {
  console.error("Uncaught Error:", event.error);
  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.captureException(event.error);
  }
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
