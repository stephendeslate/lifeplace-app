// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/PaymentGatewayFormDialog.tsx

import React from 'react';
import { Box } from '@mui/material';
import { ModernDialog, createDialogActions } from '@/components/common';
import type { PaymentGateway } from '@/types/payments';
import { usePaymentGatewayFormDialogLogic } from './usePaymentGatewayFormDialogLogic';
import { ConfigurationStatusAlert } from './ConfigurationStatusAlert';
import { QuickSetupSection } from './QuickSetupSection';
import { BasicInfoFields } from './BasicInfoFields';
import { StripeConfigSection } from './StripeConfigSection';
import { PayMongoConfigSection } from './PayMongoConfigSection';
import { AdvancedConfigSection } from './AdvancedConfigSection';

interface PaymentGatewayFormDialogProps {
  open: boolean;
  onClose: () => void;
  gateway?: PaymentGateway | null;
}

export const PaymentGatewayFormDialog: React.FC<PaymentGatewayFormDialogProps> = ({
  open,
  onClose,
  gateway,
}) => {
  const {
    formData,
    errors,
    isEditing,
    isSubmitting,
    isStripe,
    isPayMongo,
    stripeConfig,
    paymongoConfig,
    showAdvanced,
    setShowAdvanced,
    handleChange,
    handleStripeConfigChange,
    handlePayMongoConfigChange,
    handleConfigJsonChange,
    setupGateway,
    handleSubmit,
  } = usePaymentGatewayFormDialogLogic(open, onClose, gateway);

  const actions = createDialogActions(onClose, handleSubmit, {
    cancelLabel: 'Cancel',
    confirmLabel: isEditing ? 'Update Gateway' : 'Create Gateway',
    isLoading: isSubmitting,
    confirmDisabled: isSubmitting,
  });

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
      actions={actions}
      maxWidth="md"
      fullWidth
      contentSx={{ minHeight: '60vh' }}
    >
      <Box sx={{ mt: 2 }}>
        {isEditing && gateway?.masked_config && <ConfigurationStatusAlert gateway={gateway} />}

        {!isEditing && <QuickSetupSection onSetupGateway={setupGateway} />}

        <BasicInfoFields
          formData={formData}
          errors={errors}
          isEditing={isEditing}
          handleChange={handleChange}
        />

        {isStripe && (
          <StripeConfigSection
            stripeConfig={stripeConfig}
            errors={errors}
            gateway={gateway}
            onConfigChange={handleStripeConfigChange}
          />
        )}

        {isPayMongo && (
          <PayMongoConfigSection
            paymongoConfig={paymongoConfig}
            errors={errors}
            gateway={gateway}
            onConfigChange={handlePayMongoConfigChange}
          />
        )}

        <AdvancedConfigSection
          showAdvanced={showAdvanced}
          onToggle={() => setShowAdvanced(!showAdvanced)}
          configJson={JSON.stringify(formData.config, null, 2)}
          onConfigJsonChange={handleConfigJsonChange}
        />
      </Box>
    </ModernDialog>
  );
};
