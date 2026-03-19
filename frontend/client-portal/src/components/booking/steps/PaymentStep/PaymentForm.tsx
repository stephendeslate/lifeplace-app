import React from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  Button,
} from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import { UnifiedStripePaymentFlow } from '@/components/payments/UnifiedStripePaymentFlow';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import type {
  BookingModeConfig,
  PaymentFlowResult,
  PaymentFlowError,
  PaymentGateway,
} from '@/types/unified-payment-flow.types';
import type { PaymentStepData, PaymentInfoStepConfiguration } from '@/types/booking';
import type { PaymentMethod } from '@/types/financial';
import type { CompletionChoice } from './usePaymentStepLogic';
import { BookingSummaryCard } from './BookingSummaryCard';
import { PaymentMethodSuccessFeedback } from './PaymentMethodSuccessFeedback';

interface Amounts {
  total: number;
  deposit: number;
  depositPercentage: number;
  balanceDueDays: number;
  dueNow: number;
  remaining: number;
  formattedTotal: string;
  formattedDeposit: string;
  formattedDueNow: string;
  formattedRemaining: string;
  allowRefunds: boolean;
  refundPercentage: number;
  refundDeadlineHours: number;
}

interface PaymentFormProps {
  config: PaymentInfoStepConfiguration | null;
  paymentData: PaymentStepData;
  amounts: Amounts;
  isAuthenticated: boolean;
  isValidating: boolean;
  selectedPaymentMethod: PaymentMethod | null;
  isAddingNewMethod: boolean;
  selectedGateway: PaymentGateway | null;
  filteredGateways: PaymentGateway[];
  flowGateways: PaymentGateway[];
  paymentMethodCreated: boolean;
  paymentFlowConfig: BookingModeConfig;
  paymentPlanSettings: { refund_policy_text?: string } | null;
  validationErrors: Record<string, string[]>;
  setCompletionChoice: (choice: CompletionChoice) => void;
  updateData: (updates: Partial<PaymentStepData>) => void;
  onPaymentMethodSelect: (method: PaymentMethod | null) => void;
  onAddNewMethodClick: () => void;
  onGatewaySelect: (gateway: Record<string, unknown>) => void;
  onPaymentFlowSuccess: (result: PaymentFlowResult) => void;
  onPaymentFlowError: (error: PaymentFlowError) => void;
  onResetPaymentMethod: () => void;
  onCancelAddNewMethod: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  config,
  paymentData,
  amounts,
  isAuthenticated,
  isValidating,
  selectedPaymentMethod,
  isAddingNewMethod,
  selectedGateway,
  filteredGateways,
  flowGateways,
  paymentMethodCreated,
  paymentFlowConfig,
  paymentPlanSettings,
  validationErrors,
  setCompletionChoice,
  updateData,
  onPaymentMethodSelect,
  onAddNewMethodClick,
  onGatewaySelect,
  onPaymentFlowSuccess,
  onPaymentFlowError,
  onResetPaymentMethod,
  onCancelAddNewMethod,
}) => {
  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {config?.allow_quote_request ? 'Complete Payment' : 'Secure Your Booking'}
      </Typography>

      {config?.allow_quote_request && (
        <Button variant="text" onClick={() => setCompletionChoice(null)} sx={{ mb: 2 }}>
          ← Back to Options
        </Button>
      )}

      {!config?.allow_quote_request && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Your date is popular - secure it now!
        </Typography>
      )}

      {/* Booking Summary with payment options, trust signals, refund policy */}
      <BookingSummaryCard
        config={config}
        paymentData={paymentData}
        amounts={amounts}
        paymentPlanSettings={paymentPlanSettings}
        updateData={updateData}
      />

      {/* Payment Method Selection - Only show for authenticated users */}
      {isAuthenticated && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payment Method
          </Typography>

          <PaymentMethodSelector
            selectedMethod={selectedPaymentMethod}
            onMethodSelect={onPaymentMethodSelect}
            disabled={isValidating}
            showAddNew={true}
            onAddNewClick={onAddNewMethodClick}
          />

          {/* Show message for saved payment methods */}
          {selectedPaymentMethod && selectedPaymentMethod.gateway_details && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: 'success.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'success.200',
              }}
            >
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                ✓ Using saved payment method:{' '}
                {selectedPaymentMethod.nickname || selectedPaymentMethod.type_display}
                {selectedPaymentMethod.last_four && ` ending in ${selectedPaymentMethod.last_four}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This payment method will be used when you complete your booking.
              </Typography>
            </Box>
          )}

          {/* Show new payment method flow only when explicitly adding new method */}
          {isAddingNewMethod && (
            <>
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Select Payment Gateway
                </Typography>

                <RadioGroup
                  value={selectedGateway?.id || ''}
                  onChange={(e) => {
                    const gateway = flowGateways.find((g) => g.id === parseInt(e.target.value));
                    if (gateway) onGatewaySelect(gateway as unknown as Record<string, unknown>);
                  }}
                >
                  {filteredGateways.map((gateway) => (
                    <FormControlLabel
                      key={gateway.id}
                      value={gateway.id}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard />
                          <Typography>{gateway.name}</Typography>
                          {gateway.description && (
                            <Typography variant="caption" color="text.secondary">
                              {gateway.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </Box>

              <Button
                variant="outlined"
                onClick={onCancelAddNewMethod}
                disabled={isValidating}
                sx={{ mt: 2 }}
              >
                Back to Saved Methods
              </Button>
            </>
          )}
        </Paper>
      )}

      {/* Gateway Selection for Guest Users */}
      {!isAuthenticated && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Payment Gateway
          </Typography>

          <RadioGroup
            value={selectedGateway?.id || ''}
            onChange={(e) => {
              const gateway = flowGateways.find((g) => g.id === parseInt(e.target.value));
              if (gateway) onGatewaySelect(gateway as unknown as Record<string, unknown>);
            }}
          >
            {filteredGateways.map((gateway) => (
              <FormControlLabel
                key={gateway.id}
                value={gateway.id}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCard />
                    <Typography>{gateway.name}</Typography>
                    {gateway.description && (
                      <Typography variant="caption" color="text.secondary">
                        {gateway.description}
                      </Typography>
                    )}
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </Paper>
      )}

      {/* Unified Stripe Payment Flow */}
      {((isAuthenticated && isAddingNewMethod) || !isAuthenticated) &&
        selectedGateway?.code === 'stripe' &&
        amounts.dueNow > 0 &&
        !paymentMethodCreated && (
          <UnifiedStripePaymentFlow
            config={paymentFlowConfig}
            gateway={
              {
                ...selectedGateway,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as PaymentGateway
            }
            isAuthenticated={isAuthenticated}
            onSuccess={onPaymentFlowSuccess}
            onError={onPaymentFlowError}
            disabled={isValidating}
            loading={isValidating}
            debugMode={process.env.NODE_ENV === 'development'}
          />
        )}

      {/* Payment Method Success Feedback */}
      {paymentMethodCreated && selectedGateway?.code === 'stripe' && (
        <PaymentMethodSuccessFeedback
          isAuthenticated={isAuthenticated}
          formattedDueNow={amounts.formattedDueNow}
          onResetPaymentMethod={onResetPaymentMethod}
        />
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Debug:</strong> Total Amount: {amounts.dueNow.toFixed(2)} | Payment Data:{' '}
            {JSON.stringify(paymentData)}
          </Typography>
        </Alert>
      )}

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {Object.entries(validationErrors).map(([field, errors]) => (
            <Typography key={field} variant="body2">
              {field}: {errors.join(', ')}
            </Typography>
          ))}
        </Alert>
      )}
    </>
  );
};
