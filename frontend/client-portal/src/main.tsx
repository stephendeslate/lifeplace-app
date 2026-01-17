import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// SECURITY FIX: Global error handlers for production monitoring
// Catches unhandled promise rejections that would otherwise fail silently
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // In production, this would be sent to Sentry or other monitoring
  if (import.meta.env.PROD && typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
    (window as unknown as { Sentry: { captureException: (e: unknown) => void } }).Sentry.captureException(event.reason);
  }
});

// Catches uncaught errors that bypass React error boundaries
window.addEventListener('error', (event) => {
  console.error('Uncaught Error:', event.error);
  // In production, this would be sent to Sentry or other monitoring
  if (import.meta.env.PROD && typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
    (window as unknown as { Sentry: { captureException: (e: unknown) => void } }).Sentry.captureException(event.error);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
