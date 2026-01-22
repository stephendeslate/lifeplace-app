import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Initialize Sentry for error monitoring in production (v2)
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
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Release tracking
    release: import.meta.env.VITE_SENTRY_RELEASE || 'client-portal@unknown',

    // Don't send PII
    sendDefaultPii: false,

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop',
      'Non-Error exception captured',
      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
    ],
  });

  console.log('Sentry initialized for client-portal');
}

// SECURITY FIX: Global error handlers for production monitoring
// Catches unhandled promise rejections that would otherwise fail silently
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.captureException(event.reason);
  }
});

// Catches uncaught errors that bypass React error boundaries
window.addEventListener('error', (event) => {
  console.error('Uncaught Error:', event.error);
  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.captureException(event.error);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }: { error: unknown; componentStack: string; eventId: string; resetError: () => void }) => (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={resetError}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2d5016',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Try Again
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'auto',
              maxWidth: '100%',
              textAlign: 'left'
            }}>
              {error?.toString()}
            </pre>
          )}
        </div>
      )}
      onError={(error: unknown) => {
        console.error('React Error Boundary caught error:', error);
      }}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
