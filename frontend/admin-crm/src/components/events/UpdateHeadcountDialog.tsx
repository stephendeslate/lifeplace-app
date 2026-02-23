// frontend/admin-crm/src/components/events/UpdateHeadcountDialog.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import { useUpdateHeadcount } from '../../hooks/useUpdateHeadcount';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import type { Event } from '../../types/events.types';

interface UpdateHeadcountDialogProps {
  open: boolean;
  onClose: () => void;
  event: Event;
}

export const UpdateHeadcountDialog: React.FC<UpdateHeadcountDialogProps> = ({
  open,
  onClose,
  event,
}) => {
  const [newHeadcount, setNewHeadcount] = useState<number>(event.num_participants || 0);
  const [notes, setNotes] = useState('');
  const [createQuoteRevision, setCreateQuoteRevision] = useState(true);
  const [createSupplementaryInvoice, setCreateSupplementaryInvoice] = useState(true);

  const updateHeadcountMutation = useUpdateHeadcount();
  const { settings: currencySettings } = useCurrencySettings();

  const formatEventPrice = (price: string | number) => {
    const currency = currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(price, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode:
        currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  const currentHeadcount = event.num_participants || 0;
  const currentTotal = parseFloat(event.current_total_amount || event.total_price || '0');

  // Derive per-person rate from current total / headcount
  const perPersonRate = useMemo(() => {
    if (currentHeadcount > 0 && currentTotal > 0) {
      return currentTotal / currentHeadcount;
    }
    return 0;
  }, [currentHeadcount, currentTotal]);

  // Price impact preview
  const headcountDelta = newHeadcount - currentHeadcount;
  const priceDelta = perPersonRate * headcountDelta;
  const newTotal = currentTotal + priceDelta;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setNewHeadcount(event.num_participants || 0);
      setNotes('');
      setCreateQuoteRevision(true);
      setCreateSupplementaryInvoice(true);
    }
  }, [open, event.num_participants]);

  // Auto-adjust supplementary invoice label based on delta direction
  const invoiceLabel = useMemo(() => {
    if (headcountDelta < 0) {
      return 'Flag for refund';
    }
    return 'Create supplementary invoice';
  }, [headcountDelta]);

  // Default supplementary invoice checkbox based on delta
  useEffect(() => {
    if (headcountDelta > 0) {
      setCreateSupplementaryInvoice(true);
    } else if (headcountDelta < 0) {
      setCreateSupplementaryInvoice(true);
    } else {
      setCreateSupplementaryInvoice(false);
    }
  }, [headcountDelta]);

  const handleSubmit = () => {
    updateHeadcountMutation.mutate(
      {
        eventId: event.id,
        data: {
          num_participants: newHeadcount,
          notes: notes.trim() || undefined,
          create_quote_revision: createQuoteRevision,
          create_supplementary_invoice: createSupplementaryInvoice,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    if (!updateHeadcountMutation.isPending) {
      onClose();
    }
  };

  const isLoading = updateHeadcountMutation.isPending;
  const isUnchanged = newHeadcount === currentHeadcount;
  const isInvalid = newHeadcount < 1;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {open && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" /> Update Headcount
          </DialogTitle>

          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Event Info */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Event
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {event.name || `Event #${event.id}`}
                </Typography>
                {event.client_name && (
                  <Typography variant="body2" color="text.secondary">
                    Client: {event.client_name}
                  </Typography>
                )}
              </Box>

              {/* Current Headcount */}
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: 600,
                  }}
                >
                  Current Headcount
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                  {currentHeadcount} {currentHeadcount === 1 ? 'guest' : 'guests'}
                </Typography>
                {perPersonRate > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatEventPrice(perPersonRate)} per person (estimated)
                  </Typography>
                )}
              </Box>

              {/* New Headcount Input */}
              <TextField
                fullWidth
                label="New Headcount"
                type="number"
                value={newHeadcount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) {
                    setNewHeadcount(val);
                  } else if (e.target.value === '') {
                    setNewHeadcount(0);
                  }
                }}
                inputProps={{ min: 1 }}
                error={isInvalid}
                helperText={isInvalid ? 'Headcount must be at least 1' : undefined}
                disabled={isLoading}
              />

              {/* Price Impact Preview */}
              {perPersonRate > 0 && !isUnchanged && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Price Impact Preview
                    </Typography>
                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Current Total
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatEventPrice(currentTotal)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          New Total (estimated)
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatEventPrice(newTotal)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600}>
                          Difference
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={
                            priceDelta > 0
                              ? 'error.main'
                              : priceDelta < 0
                                ? 'success.main'
                                : 'text.primary'
                          }
                        >
                          {priceDelta > 0 ? '+' : ''}
                          {formatEventPrice(priceDelta)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </>
              )}

              {!isUnchanged && perPersonRate === 0 && currentTotal > 0 && (
                <Alert severity="info" variant="outlined">
                  Price impact will be calculated by the server based on package pricing.
                </Alert>
              )}

              {/* Options */}
              {!isUnchanged && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Options
                    </Typography>
                    <Stack spacing={0.5}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={createQuoteRevision}
                            onChange={(e) => setCreateQuoteRevision(e.target.checked)}
                            disabled={isLoading}
                          />
                        }
                        label="Create new quote version"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={createSupplementaryInvoice}
                            onChange={(e) => setCreateSupplementaryInvoice(e.target.checked)}
                            disabled={isLoading}
                          />
                        }
                        label={invoiceLabel}
                      />
                    </Stack>
                  </Box>
                </>
              )}

              {/* Notes */}
              <TextField
                fullWidth
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                placeholder="e.g., Client confirmed final headcount"
                disabled={isLoading}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading || isUnchanged || isInvalid}
              startIcon={isLoading ? <CircularProgress size={20} /> : <PeopleIcon />}
              sx={{ minWidth: 160 }}
            >
              {isLoading ? 'Updating...' : 'Update Headcount'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
