import React from 'react';
import { Box, Typography, Button, Stack, Alert } from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { usePaymentPlanSettingsLogic } from './usePaymentPlanSettingsLogic';
import { BalanceAndScheduleSection } from './BalanceAndScheduleSection';
import { DepositSettingsSection } from './DepositSettingsSection';
import { FeeSettingsSection } from './FeeSettingsSection';
import { BookingPolicySection } from './BookingPolicySection';
import { SpecialFeeSection } from './SpecialFeeSection';
import { RefundPolicySection } from './RefundPolicySection';
import { ChildPricingSection } from './ChildPricingSection';

export const PaymentPlanSettings: React.FC = () => {
  const {
    control,
    errors,
    isDirty,
    handleSubmit,
    isLoading,
    isUpdating,
    currencySymbol,
    depositType,
    lateFeeEnabled,
    lateFeeType,
    securityDepositEnabled,
    allowRefunds,
    dateBlockingPolicy,
    childPricingEnabled,
    childPricingTiers,
    serviceChargeEnabled,
    reschedulingFeeEnabled,
    reschedulingFeeType,
    lateCheckoutFeeEnabled,
    lateCheckoutFeeType,
    dateHoldEnabled,
    handleAddChildTier,
    handleUpdateChildTier,
    handleRemoveChildTier,
  } = usePaymentPlanSettingsLogic();

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <SettingsIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ mb: 0.5 }}>
              Payment Plan Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure global payment settings including payment plans, refund policies, and
              gateway defaults
            </Typography>
          </Box>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <BalanceAndScheduleSection control={control} errors={errors} />

          <DepositSettingsSection
            control={control}
            errors={errors}
            currencySymbol={currencySymbol}
            depositType={depositType}
            securityDepositEnabled={securityDepositEnabled}
          />

          <FeeSettingsSection
            control={control}
            errors={errors}
            currencySymbol={currencySymbol}
            lateFeeEnabled={lateFeeEnabled}
            lateFeeType={lateFeeType}
            serviceChargeEnabled={serviceChargeEnabled}
          />

          <SpecialFeeSection
            control={control}
            errors={errors}
            currencySymbol={currencySymbol}
            reschedulingFeeEnabled={reschedulingFeeEnabled}
            reschedulingFeeType={reschedulingFeeType}
            lateCheckoutFeeEnabled={lateCheckoutFeeEnabled}
            lateCheckoutFeeType={lateCheckoutFeeType}
          />

          <BookingPolicySection
            control={control}
            errors={errors}
            dateBlockingPolicy={dateBlockingPolicy}
            dateHoldEnabled={dateHoldEnabled}
          />

          <ChildPricingSection
            control={control}
            errors={errors}
            childPricingEnabled={childPricingEnabled}
            childPricingTiers={childPricingTiers}
            onAddTier={handleAddChildTier}
            onUpdateTier={handleUpdateChildTier}
            onRemoveTier={handleRemoveChildTier}
          />

          <RefundPolicySection control={control} errors={errors} allowRefunds={allowRefunds} />

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!isDirty || isLoading}
              sx={{
                bgcolor: 'primary.main',
                borderRadius: 1,
                fontWeight: 600,
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                  transform: 'none',
                  boxShadow: 'none',
                },
              }}
            >
              {isUpdating ? 'Saving Settings...' : 'Save Payment Plan Settings'}
            </Button>
          </Box>
        </Stack>
      </form>

      {/* Information Alert */}
      <Box sx={{ mt: 4 }}>
        <Alert
          severity="success"
          sx={{
            borderRadius: 1,
          }}
        >
          <strong>DRY Compliance Achieved!</strong> These global settings serve as the single source
          of truth for all payment-related configuration. Refund policies and deposit amounts are
          now consistently applied across all booking flows, eliminating configuration duplication.
        </Alert>
      </Box>
    </Box>
  );
};
