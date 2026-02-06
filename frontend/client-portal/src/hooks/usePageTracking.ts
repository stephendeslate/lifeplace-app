// frontend/client-portal/src/hooks/usePageTracking.ts
/**
 * Hook to track SPA page views with GA4.
 * Call this inside a component that has access to useLocation().
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/ga4';

export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
}
