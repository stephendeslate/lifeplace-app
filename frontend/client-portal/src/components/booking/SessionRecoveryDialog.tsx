// frontend/client-portal/src/components/booking/SessionRecoveryDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Restore as RestoreIcon,
  DeleteForever as DeleteIcon,
  AccessTime as TimeIcon,
  CheckCircle as ProgressIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

interface SessionRecoveryInfo {
  canRecover: boolean;
  lastUpdated?: string;
  currentStep?: string;
  progressPercentage?: number;
  totalSteps?: number;
}

interface SessionRecoveryDialogProps {
  open: boolean;
  recoveryInfo: SessionRecoveryInfo;
  onRestore: () => void;
  onDiscard: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const SessionRecoveryDialog: React.FC<SessionRecoveryDialogProps> = ({
  open,
  recoveryInfo,
  onRestore,
  onDiscard,
  onClose,
  isLoading = false,
}) => {
  if (!recoveryInfo.canRecover) {
    return null;
  }

  const formatStepName = (step: string) => {
    return step
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getLastUpdatedDisplay = () => {
    if (!recoveryInfo.lastUpdated) return 'Unknown';

    try {
      const lastUpdate = new Date(recoveryInfo.lastUpdated);
      const now = new Date();
      const diffInMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${Math.round(diffInMinutes)} minutes ago`;
      } else {
        return formatDistanceToNow(lastUpdate, { addSuffix: true });
      }
    } catch (_error) {
      return 'Recently';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RestoreIcon color="primary" />
          <Typography variant="h6" component="span">
            Restore Your Booking?
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          We found an incomplete booking from your previous visit. Would you like to continue where
          you left off?
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Booking Progress
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={500}>
                {recoveryInfo.progressPercentage || 0}% Complete
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={recoveryInfo.progressPercentage || 0}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {recoveryInfo.currentStep && (
              <Chip
                icon={<ProgressIcon />}
                label={`Current: ${formatStepName(recoveryInfo.currentStep)}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}

            {recoveryInfo.totalSteps && (
              <Chip
                label={`${recoveryInfo.totalSteps} steps total`}
                color="default"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Session Details
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Last updated: {getLastUpdatedDisplay()}
            </Typography>
          </Box>

          {recoveryInfo.lastUpdated && (
            <Typography variant="caption" color="text.disabled">
              {format(new Date(recoveryInfo.lastUpdated), 'PPpp')}
            </Typography>
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Alert severity="warning" variant="outlined">
            <Typography variant="body2">
              <strong>Note:</strong> If you don't restore this session, your progress will be lost
              and you'll need to start over.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onDiscard}
          startIcon={<DeleteIcon />}
          disabled={isLoading}
          color="error"
          variant="outlined"
        >
          Start Over
        </Button>

        <Button
          onClick={onRestore}
          startIcon={<RestoreIcon />}
          disabled={isLoading}
          variant="contained"
          sx={{ flex: 1 }}
        >
          {isLoading ? 'Restoring...' : 'Continue Booking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Re-export hook from separate file for backwards compatibility
export { useSessionRecoveryDialog } from './useSessionRecoveryDialog';
