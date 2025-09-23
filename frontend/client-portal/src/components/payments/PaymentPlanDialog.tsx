// frontend/client-portal/src/components/payments/PaymentPlanDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  alpha,
} from '@mui/material';
import {
  Schedule as PlanIcon,
  CalendarToday as CalendarIcon,
  Calculate as CalculatorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addWeeks, addMonths, format } from 'date-fns';
import { GlassCard } from '../../design-system';
import FinancialApi from '../../apis/financial.api';
import type {
  Invoice,
  PaymentPlanRequest,
  PaymentPlan,
} from '../../types/financial.types';

interface PaymentPlanDialogProps {
  open: boolean;
  invoice: Invoice;
  onClose: () => void;
  onSuccess?: (paymentPlan: PaymentPlan) => void;
}

interface InstallmentPreview {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  description: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly', addFunction: addWeeks },
  { value: 'BIWEEKLY', label: 'Bi-weekly', addFunction: (date: Date, amount: number) => addWeeks(date, amount * 2) },
  { value: 'MONTHLY', label: 'Monthly', addFunction: addMonths },
] as const;

export const PaymentPlanDialog: React.FC<PaymentPlanDialogProps> = ({
  open,
  invoice,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PaymentPlanRequest>({
    down_payment_amount: '0',
    number_of_installments: 3,
    frequency: 'MONTHLY',
    down_payment_due_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [installmentPreviews, setInstallmentPreviews] = useState<InstallmentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
  const totalAmount = paymentStatus.amountRemaining;
  const downPaymentAmount = parseFloat(formData.down_payment_amount || '0');
  const remainingAmount = totalAmount - downPaymentAmount;
  const installmentAmount = remainingAmount / formData.number_of_installments;

  // Calculate installment previews
  useEffect(() => {
    const previews: InstallmentPreview[] = [];
    const downPaymentDate = new Date(formData.down_payment_due_date);
    const frequency = FREQUENCY_OPTIONS.find(f => f.value === formData.frequency);

    if (!frequency) return;

    // Add down payment if amount > 0
    if (downPaymentAmount > 0) {
      previews.push({
        installmentNumber: 0,
        amount: downPaymentAmount,
        dueDate: downPaymentDate,
        description: 'Down Payment',
      });
    }

    // Add regular installments
    for (let i = 1; i <= formData.number_of_installments; i++) {
      const dueDate = frequency.addFunction(downPaymentDate, i);
      previews.push({
        installmentNumber: i,
        amount: installmentAmount,
        dueDate,
        description: `Installment ${i}`,
      });
    }

    setInstallmentPreviews(previews);
  }, [formData, downPaymentAmount, installmentAmount]);

  const handleDownPaymentChange = (value: number) => {
    const maxDownPayment = totalAmount * 0.8; // Max 80% down payment
    const clampedValue = Math.max(0, Math.min(value, maxDownPayment));
    setFormData(prev => ({
      ...prev,
      down_payment_amount: clampedValue.toString(),
    }));
  };

  const handleInstallmentCountChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      number_of_installments: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (remainingAmount <= 0) {
        throw new Error('Remaining amount after down payment must be greater than 0');
      }

      if (formData.number_of_installments < 2) {
        throw new Error('Number of installments must be at least 2');
      }

      const paymentPlan = await FinancialApi.setupInvoicePaymentPlan(invoice.id, formData);
      onSuccess?.(paymentPlan);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create payment plan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => FinancialApi.formatAmount(amount, invoice.currency);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha('#fff', 0.95),
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <PlanIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Create Payment Plan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Invoice #{invoice.invoice_id}
              </Typography>
            </Box>
          </Stack>
          <Button
            onClick={onClose}
            sx={{ minWidth: 'auto', p: 1 }}
            disabled={loading}
          >
            <CloseIcon />
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={4}>
          {/* Amount Summary */}
          <GlassCard variant="light" intensity="subtle">
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Payment Summary
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Total Amount Due:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Down Payment:
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                    {formatCurrency(downPaymentAmount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Remaining Amount:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(remainingAmount)}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Per Installment:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {formatCurrency(installmentAmount)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </GlassCard>

          {/* Configuration Form */}
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalculatorIcon />
              Plan Configuration
            </Typography>

            {/* Down Payment */}
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Down Payment Amount
              </Typography>
              <TextField
                type="number"
                value={formData.down_payment_amount}
                onChange={(e) => handleDownPaymentChange(parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>{FinancialApi.getCurrencySymbol(invoice.currency)}</Typography>,
                }}
                fullWidth
                inputProps={{
                  min: 0,
                  max: totalAmount * 0.8,
                  step: 0.01,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Optional down payment (0 - {formatCurrency(totalAmount * 0.8)})
              </Typography>
            </Box>

            {/* Number of Installments */}
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Number of Installments: {formData.number_of_installments}
              </Typography>
              <Slider
                value={formData.number_of_installments}
                onChange={(_, value) => handleInstallmentCountChange(value as number)}
                min={2}
                max={12}
                step={1}
                marks
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Box>

            {/* Payment Frequency */}
            <FormControl fullWidth>
              <InputLabel>Payment Frequency</InputLabel>
              <TextField
                select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  frequency: e.target.value as PaymentPlanRequest['frequency']
                }))}
                label="Payment Frequency"
                disabled={loading}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </FormControl>

            {/* Down Payment Due Date */}
            <DatePicker
              label="Down Payment Due Date"
              value={new Date(formData.down_payment_due_date)}
              onChange={(date) => {
                if (date) {
                  setFormData(prev => ({
                    ...prev,
                    down_payment_due_date: date.toISOString().split('T')[0]
                  }));
                }
              }}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  InputProps: {
                    startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  },
                },
              }}
            />

            {/* Notes */}
            <TextField
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={3}
              placeholder="Any special notes or instructions for this payment plan..."
              fullWidth
              disabled={loading}
            />
          </Stack>

          {/* Installment Preview */}
          {installmentPreviews.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Payment Schedule Preview
              </Typography>
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Due Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {installmentPreviews.map((installment, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {installment.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatCurrency(installment.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {format(installment.dueDate, 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Validation Warnings */}
          {remainingAmount <= 0 && (
            <Alert severity="warning">
              Down payment covers the full amount. Consider reducing the down payment to create installments.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || remainingAmount <= 0}
          startIcon={loading && <CircularProgress size={20} />}
          sx={{ minWidth: 150 }}
        >
          {loading ? 'Creating...' : 'Create Payment Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentPlanDialog;