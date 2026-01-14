// frontend/client-portal/src/components/booking/DateUnavailableModal.tsx

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
} from '@mui/material';
import {
  EventBusy as EventBusyIcon,
  CalendarMonth as CalendarIcon,
  CreditCardOff as NoChargeIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

interface DateUnavailableModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** The date that became unavailable (ISO format: YYYY-MM-DD) */
  unavailableDate: string | null;
  /** Callback when user clicks to select a new date */
  onSelectNewDate: () => void;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Optional custom message */
  message?: string;
}

/**
 * Modal shown when a user's selected date becomes unavailable
 * during the booking process (e.g., another user completed payment first).
 *
 * Key features:
 * - Reassures user their card was NOT charged
 * - Explains why the date is no longer available
 * - Provides clear CTA to select a new date
 */
export const DateUnavailableModal: React.FC<DateUnavailableModalProps> = ({
  open,
  unavailableDate,
  onSelectNewDate,
  onClose,
  message,
}) => {
  const formatDateForDisplay = (dateStr: string | null): string => {
    if (!dateStr) return 'your selected date';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
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
          <EventBusyIcon color="error" fontSize="large" />
          <Typography variant="h6" component="span">
            Date No Longer Available
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Primary message */}
        <Alert
          severity="warning"
          icon={<CalendarIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body1">
            {message ||
              `Unfortunately, ${formatDateForDisplay(unavailableDate)} is no longer available. Another customer completed their booking for this date just before you.`}
          </Typography>
        </Alert>

        {/* Reassurance about payment */}
        <Alert
          severity="info"
          icon={<NoChargeIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body1" fontWeight={500}>
            Your card has NOT been charged.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            We check availability before processing any payment, so no transaction was made.
          </Typography>
        </Alert>

        {/* Next steps */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            What happens next?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can select a different date and continue with your booking.
            Your other booking information has been saved.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
        >
          Close
        </Button>
        <Button
          onClick={onSelectNewDate}
          variant="contained"
          color="primary"
          startIcon={<CalendarIcon />}
          sx={{ flex: 1 }}
        >
          Select New Date
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Hook to manage DateUnavailableModal state
 */
export const useDateUnavailableModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [unavailableDate, setUnavailableDate] = React.useState<string | null>(
    null
  );

  const showModal = React.useCallback((date: string) => {
    setUnavailableDate(date);
    setIsOpen(true);
  }, []);

  const hideModal = React.useCallback(() => {
    setIsOpen(false);
    // Don't clear the date immediately to allow for animation
    setTimeout(() => setUnavailableDate(null), 300);
  }, []);

  return {
    isOpen,
    unavailableDate,
    showModal,
    hideModal,
  };
};

export default DateUnavailableModal;
