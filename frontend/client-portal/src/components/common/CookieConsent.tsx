// frontend/client-portal/src/components/common/CookieConsent.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Paper,
  Link,
  Slide,
  type SlideProps,
} from '@mui/material';
import CookieIcon from '@mui/icons-material/Cookie';

const COOKIE_CONSENT_KEY = 'lifeplace_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

interface ConsentState {
  version: string;
  analytics: boolean;
  marketing: boolean;
  necessary: boolean;
  timestamp: string;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const CookieConsent: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    version: COOKIE_CONSENT_VERSION,
    analytics: false,
    marketing: false,
    necessary: true,
    timestamp: '',
  });

  useEffect(() => {
    // Check if consent has been given
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);

    if (storedConsent) {
      try {
        const parsed = JSON.parse(storedConsent) as ConsentState;
        // Check if consent version matches
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          setConsent(parsed);
          // Don't show banner if already consented
          return;
        }
      } catch {
        // Invalid stored consent, show banner
      }
    }

    // Show banner after a short delay
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (newConsent: ConsentState) => {
    const consentWithTimestamp = {
      ...newConsent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setConsent(consentWithTimestamp);
    setOpen(false);

    // Dispatch event for analytics initialization
    if (newConsent.analytics) {
      window.dispatchEvent(new CustomEvent('cookie-consent-analytics', { detail: true }));
    }
  };

  const handleAcceptAll = () => {
    saveConsent({
      version: COOKIE_CONSENT_VERSION,
      analytics: true,
      marketing: true,
      necessary: true,
      timestamp: '',
    });
  };

  const handleAcceptNecessary = () => {
    saveConsent({
      version: COOKIE_CONSENT_VERSION,
      analytics: false,
      marketing: false,
      necessary: true,
      timestamp: '',
    });
  };

  const handleSavePreferences = () => {
    saveConsent(consent);
    setShowPreferences(false);
  };

  if (!open) return null;

  return (
    <Snackbar
      open={open}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 3,
          width: '100vw',
          maxWidth: '100vw',
          borderRadius: 0,
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ maxWidth: 900, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <CookieIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Cookie Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We use cookies to enhance your experience. By continuing to visit this site you
                agree to our use of cookies.{' '}
                <Link href="/privacy" sx={{ color: 'primary.main' }}>
                  Learn more
                </Link>
              </Typography>
            </Box>
          </Box>

          {showPreferences ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={500}>
                  Necessary Cookies (Always Active)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Required for the website to function properly
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Analytics Cookies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Help us understand how visitors interact with our website
                    </Typography>
                  </Box>
                </label>
              </Box>
              <Box sx={{ mb: 2 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Marketing Cookies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Used to deliver personalized advertisements
                    </Typography>
                  </Box>
                </label>
              </Box>
            </Box>
          ) : null}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {showPreferences ? (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSavePreferences}
                  sx={{ borderRadius: 28 }}
                >
                  Save Preferences
                </Button>
                <Button
                  variant="text"
                  onClick={() => setShowPreferences(false)}
                  sx={{ borderRadius: 28 }}
                >
                  Back
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAcceptAll}
                  sx={{ borderRadius: 28 }}
                >
                  Accept All
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleAcceptNecessary}
                  sx={{ borderRadius: 28 }}
                >
                  Necessary Only
                </Button>
                <Button
                  variant="text"
                  onClick={() => setShowPreferences(true)}
                  sx={{ borderRadius: 28 }}
                >
                  Customize
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>
    </Snackbar>
  );
};

// Helper to check if analytics consent was given
export const hasAnalyticsConsent = (): boolean => {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      const consent = JSON.parse(stored) as ConsentState;
      return consent.analytics === true;
    }
  } catch {
    // Ignore errors
  }
  return false;
};

export default CookieConsent;
