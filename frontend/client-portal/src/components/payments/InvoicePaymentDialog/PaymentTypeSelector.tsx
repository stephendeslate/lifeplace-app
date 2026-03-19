import React from 'react';
import {
  Typography,
  Box,
  Alert,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  InputAdornment,
} from '@mui/material';
import FinancialApi from '@/apis/financial';
import type { Invoice } from '@/types/financial';

interface PaymentTypeSelectorProps {
  invoice: Invoice;
  paymentType: 'FULL' | 'DEPOSIT' | 'CUSTOM';
  onPaymentTypeChange: (type: 'FULL' | 'DEPOSIT' | 'CUSTOM') => void;
  paymentAmounts: {
    full: number;
    deposit: number;
    depositPercentage: number;
    remaining: number;
  };
  amountRemaining: number;
  isDepositAlreadyPaid: boolean;
  customAmount: string;
  onCustomAmountChange: (value: string) => void;
  customAmountError: string | null;
  formatAmount: (amount: number, currency: string) => string;
}

export const PaymentTypeSelector: React.FC<PaymentTypeSelectorProps> = ({
  invoice,
  paymentType,
  onPaymentTypeChange,
  paymentAmounts,
  amountRemaining,
  isDepositAlreadyPaid,
  customAmount,
  onCustomAmountChange,
  customAmountError,
  formatAmount,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Payment Type
      </Typography>

      {isDepositAlreadyPaid && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Deposit of {formatAmount(paymentAmounts.deposit, invoice.currency)} has been paid. You can
          pay the remaining balance or a custom amount.
        </Alert>
      )}

      <RadioGroup
        value={paymentType}
        onChange={(e) => onPaymentTypeChange(e.target.value as 'FULL' | 'DEPOSIT' | 'CUSTOM')}
      >
        <FormControlLabel
          value="FULL"
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Pay Full Amount
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatAmount(amountRemaining, invoice.currency)}
              </Typography>
            </Box>
          }
          sx={{ mb: 1 }}
        />

        {!isDepositAlreadyPaid && (
          <FormControlLabel
            value="DEPOSIT"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Pay Deposit
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(paymentAmounts.deposit, invoice.currency)} (
                  {paymentAmounts.depositPercentage}%)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Remaining balance of {formatAmount(paymentAmounts.remaining, invoice.currency)}{' '}
                  due by {new Date(invoice.due_date).toLocaleDateString()}
                </Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />
        )}

        <FormControlLabel
          value="CUSTOM"
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Custom Amount
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pay a custom amount between{' '}
                {formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)}{' '}
                and {formatAmount(paymentAmounts.full, invoice.currency)}
              </Typography>
            </Box>
          }
        />
      </RadioGroup>

      {paymentType === 'CUSTOM' && (
        <TextField
          fullWidth
          type="number"
          label="Custom Payment Amount"
          value={customAmount}
          onChange={(e) => onCustomAmountChange(e.target.value)}
          error={!!customAmountError}
          helperText={
            customAmountError ||
            `Enter amount between ${formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)} and ${formatAmount(paymentAmounts.full, invoice.currency)}. If not paying in full, must leave at least ${formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)} remaining.`
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {FinancialApi.getCurrencySymbol(invoice.currency)}
              </InputAdornment>
            ),
          }}
          sx={{ mt: 2 }}
          inputProps={{
            min: FinancialApi.getMinimumCharge(invoice.currency),
            max: paymentAmounts.full,
            step: 0.01,
          }}
        />
      )}

      {paymentType === 'CUSTOM' && (
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Payment gateway minimum is{' '}
            {formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)}. If
            you're not paying the full amount, you must leave at least this amount as the remaining
            balance.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};
