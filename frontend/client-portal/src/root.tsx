// frontend/client-portal/src/root.tsx

import React, { Suspense, useEffect } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { ErrorBoundary as AppErrorBoundary } from "./components/common/ErrorBoundary";
import { TestModeBanner } from "./components/common/TestModeBanner";
import { MessengerButton } from "./components/common/MessengerButton";
import { initGA4 } from "./utils/ga4";
import { usePageTracking } from "./hooks/usePageTracking";
import { hasAnalyticsConsent } from "./components/common/CookieConsent";

const CookieConsent = React.lazy(() =>
  import("./components/common/CookieConsent").then((m) => ({
    default: m.CookieConsent,
  })),
);

// Layout renders the HTML document shell.
// Kept minimal (no providers) so it's safe during build-time rendering (ssr: false).
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Book weddings, retreats, team building events at LifePlace Alfonso, Cavite"
        />
        <meta name="theme-color" content="#2d5016" />

        {/* Favicons */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />

        {/* Default Open Graph / Facebook (overridden by route meta()) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="LifePlace Alfonso" />
        <meta
          property="og:description"
          content="Book weddings, retreats, team building events at LifePlace Alfonso, Cavite"
        />
        <meta property="og:image" content="/og-image.jpg" />

        {/* Default Twitter (overridden by route meta()) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="LifePlace Alfonso" />
        <meta
          name="twitter:description"
          content="Book weddings, retreats, team building events at LifePlace Alfonso, Cavite"
        />
        <meta name="twitter:image" content="/og-image.jpg" />

        {/* Route-specific meta tags injected here */}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Root component — wraps the app in providers (client-side only).
export default function Root() {
  // GA4 page tracking — runs on every route (migrated + catchall)
  usePageTracking();

  // Initialize GA4 if user has consented to analytics cookies
  useEffect(() => {
    if (hasAnalyticsConsent()) {
      initGA4();
    }
    const handleConsent = () => initGA4();
    window.addEventListener("cookie-consent-analytics", handleConsent);
    return () =>
      window.removeEventListener("cookie-consent-analytics", handleConsent);
  }, []);

  return (
    <AppProviders>
      <TestModeBanner />
      <AppErrorBoundary>
        <Outlet />
      </AppErrorBoundary>
      <MessengerButton />
      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>
    </AppProviders>
  );
}

// Shown while client JS loads and hydrates (build-time rendered into the HTML shell).
// Uses inline styles only — no MUI/providers available during build.
export function HydrateFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid #e0e0e0",
          borderTopColor: "#2d5016",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <p style={{ color: "#666", fontSize: "14px" }}>
        Loading LifePlace Client Portal...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
