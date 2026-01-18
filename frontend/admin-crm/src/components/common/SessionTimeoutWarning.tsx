// frontend/admin-crm/src/components/common/SessionTimeoutWarning.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../../contexts/AuthContext';

interface SessionTimeoutWarningProps {
  // Warning shows this many minutes before expiry
  warningMinutes?: number;
  // Session timeout in minutes (should match backend)
  sessionTimeoutMinutes?: number;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  warningMinutes = 5,
  sessionTimeoutMinutes = 30,
}) => {
  const { isAuthenticated, refreshToken, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(warningMinutes * 60);
  const [isExtending, setIsExtending] = useState(false);

  // Track last activity
  const [lastActivity, setLastActivity] = useState(Date.now());

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Listen for user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated, updateActivity]);

  // Check for impending session timeout
  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      return;
    }

    const checkTimeout = () => {
      const inactiveMs = Date.now() - lastActivity;
      const inactiveMinutes = inactiveMs / (1000 * 60);
      const remainingMinutes = sessionTimeoutMinutes - inactiveMinutes;

      if (remainingMinutes <= 0) {
        // Session expired
        logout();
        setOpen(false);
      } else if (remainingMinutes <= warningMinutes && !open) {
        // Show warning
        setTimeLeft(Math.floor(remainingMinutes * 60));
        setOpen(true);
      } else if (remainingMinutes > warningMinutes && open) {
        // User was active, hide warning
        setOpen(false);
      }
    };

    const interval = setInterval(checkTimeout, 10000); // Check every 10 seconds
    checkTimeout(); // Initial check

    return () => clearInterval(interval);
  }, [
    isAuthenticated,
    lastActivity,
    sessionTimeoutMinutes,
    warningMinutes,
    open,
    logout,
  ]);

  // Countdown timer when dialog is open
  useEffect(() => {
    if (!open) return;

    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          logout();
          setOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [open, logout]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await refreshToken?.();
      setLastActivity(Date.now());
      setOpen(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
      logout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / (warningMinutes * 60)) * 100;

  if (!isAuthenticated) return null;

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon color="warning" />
          <Typography variant="h6">Session Expiring Soon</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Your session will expire in{' '}
          <strong>{formatTime(timeLeft)}</strong> due to inactivity.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={progress < 30 ? 'error' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Click "Stay Logged In" to continue your session, or you will be
          automatically logged out.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleLogout} color="inherit" disabled={isExtending}>
          Log Out Now
        </Button>
        <Button
          onClick={handleExtendSession}
          variant="contained"
          color="primary"
          disabled={isExtending}
          sx={{ minWidth: 140 }}
        >
          {isExtending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Stay Logged In'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutWarning;
