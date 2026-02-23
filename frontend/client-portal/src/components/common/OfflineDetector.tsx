// frontend/client-portal/src/components/common/OfflineDetector.tsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Snackbar, Alert, AlertTitle, Box, Button } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';

interface OfflineContextType {
  isOnline: boolean;
  lastOnlineAt: Date | null;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  lastOnlineAt: null,
});

export const useOnlineStatus = () => useContext(OfflineContext);

interface OfflineDetectorProps {
  children: React.ReactNode;
}

export const OfflineDetector: React.FC<OfflineDetectorProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [showBanner, setShowBanner] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);

      // Show reconnected message briefly if we were offline
      if (wasOffline) {
        setWasOffline(false);
        // Could show a "Back online" toast here
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setLastOnlineAt(new Date());
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const handleRetry = () => {
    // Try to fetch a small resource to verify connectivity
    fetch('/api/health/', { method: 'HEAD', cache: 'no-store' })
      .then(() => {
        setIsOnline(true);
        setShowBanner(false);
      })
      .catch(() => {
        // Still offline
      });
  };

  return (
    <OfflineContext.Provider value={{ isOnline, lastOnlineAt }}>
      {children}

      {/* Persistent banner when offline */}
      {!isOnline && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            bgcolor: 'warning.dark',
            color: 'warning.contrastText',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <WifiOffIcon fontSize="small" />
          <span>You are currently offline. Some features may be unavailable.</span>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            sx={{ borderColor: 'currentColor' }}
          >
            Retry
          </Button>
        </Box>
      )}

      {/* Snackbar for offline notification */}
      <Snackbar
        open={showBanner && !isOnline}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          sx={{ width: '100%' }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Connection Lost</AlertTitle>
          You appear to be offline. Changes you make may not be saved until you're back online.
        </Alert>
      </Snackbar>
    </OfflineContext.Provider>
  );
};

export default OfflineDetector;
