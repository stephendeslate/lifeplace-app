// frontend/client-portal/src/components/booking/steps/PaymentStep/PaymentStep.tsx

import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import type {
  PaymentStepData,
  PaymentInfoStepConfiguration,
  StepValidationResult,
} from '@/types/booking';
import { usePaymentStepLogic } from './usePaymentStepLogic';
import { CompletionChoiceScreen } from './CompletionChoiceScreen';
import { QuoteRequestForm } from './QuoteRequestForm';
import { PaymentForm } from './PaymentForm';

interface PaymentStepProps {
  stepData?: PaymentStepData;
  config: PaymentInfoStepConfiguration | null;
  onDataChange: (data: PaymentStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  totalAmount: string;
  flowId?: number;
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  stepData = { payment_method: '', payment_type: '' },
  config,
  onDataChange,
  validationErrors,
  isValidating,
  totalAmount,
  flowId,
  onValidate,
}) => {
  const logic = usePaymentStepLogic({
    stepData,
    config,
    onDataChange,
    totalAmount,
    flowId,
    onValidate,
    isValidating,
  });

  // Loading state
  if (logic.gatewaysLoading || logic.isLoadingPaymentSettings) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={3}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
          Loading payment options...
        </Typography>
      </Box>
    );
  }

  // Error states
  if (logic.gatewaysError) {
    return <Alert severity="error">{logic.gatewaysError}</Alert>;
  }

  if (logic.paymentSettingsError) {
    return (
      <Alert severity="error">
        Failed to load payment settings: {logic.paymentSettingsError.message || 'Unknown error'}
      </Alert>
    );
  }

  if (!logic.paymentPlanSettings) {
    return (
      <Alert severity="warning">Payment settings are not configured. Please contact support.</Alert>
    );
  }

  // Show completion choice if quote requests are enabled and no choice is made yet
  if (config?.allow_quote_request && logic.completionChoice === null) {
    return (
      <CompletionChoiceScreen
        config={config}
        amounts={logic.amounts}
        hasPackagesSelected={logic.hasPackagesSelected}
        onChoiceSelect={logic.setCompletionChoice}
        updateData={logic.updateData}
      />
    );
  }

  // Main render - conditionally show quote form or payment form
  return (
    <Box>
      {/* Quote request form */}
      {logic.completionChoice === 'quote' && (
        <QuoteRequestForm
          paymentData={logic.paymentData}
          formattedTotal={logic.amounts.formattedTotal}
          quickQuoteMode={logic.bookingState.quickQuoteMode}
          updateData={logic.updateData}
          onBackToOptions={() =>
            logic.updateData({ completion_type: undefined, quote_message: '' })
          }
          setCompletionChoice={logic.setCompletionChoice}
        />
      )}

      {/* Payment form */}
      {logic.completionChoice !== 'quote' && (
        <PaymentForm
          config={config}
          paymentData={logic.paymentData}
          amounts={logic.amounts}
          isAuthenticated={logic.isAuthenticated}
          isValidating={isValidating}
          selectedPaymentMethod={logic.selectedPaymentMethod}
          isAddingNewMethod={logic.isAddingNewMethod}
          selectedGateway={logic.selectedGateway}
          filteredGateways={logic.filteredGateways}
          flowGateways={logic.flowGateways}
          paymentMethodCreated={logic.paymentMethodCreated}
          paymentFlowConfig={logic.paymentFlowConfig}
          paymentPlanSettings={logic.paymentPlanSettings}
          validationErrors={validationErrors}
          setCompletionChoice={logic.setCompletionChoice}
          updateData={logic.updateData}
          onPaymentMethodSelect={logic.handlePaymentMethodSelect}
          onAddNewMethodClick={logic.handleAddNewMethodClick}
          onGatewaySelect={logic.handleGatewaySelect}
          onPaymentFlowSuccess={logic.handlePaymentFlowSuccess}
          onPaymentFlowError={logic.handlePaymentFlowError}
          onResetPaymentMethod={logic.handleResetPaymentMethod}
          onCancelAddNewMethod={logic.handleCancelAddNewMethod}
        />
      )}
    </Box>
  );
};
