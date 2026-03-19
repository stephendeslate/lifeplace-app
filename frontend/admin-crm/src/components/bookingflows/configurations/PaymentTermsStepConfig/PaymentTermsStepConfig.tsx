// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/PaymentTermsStepConfig.tsx

import React from 'react';
import { Box, Typography, Stack, Alert, Button, Collapse, Divider } from '@mui/material';
import {
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { PaymentTermsStepConfigProps } from './types';
import { usePaymentTermsConfigLogic } from './usePaymentTermsConfigLogic';
import { DepositSettingsSection } from './DepositSettingsSection';
import { PaymentScheduleSection } from './PaymentScheduleSection';
import { DateBlockingSection } from './DateBlockingSection';
import { ChildPricingSection } from './ChildPricingSection';

export const PaymentTermsStepConfig: React.FC<PaymentTermsStepConfigProps> = ({
  config,
  onUpdate,
  isLoading = false,
}) => {
  const {
    formData,
    expanded,
    hasOverrides,
    paymentSettings,
    currencyConfig,
    setExpanded,
    handleInputChange,
    handleSelectChange,
    handleNullableSwitchChange,
    handleSave,
    handleClearOverrides,
    handleAddChildTier,
    handleUpdateChildTier,
    handleRemoveChildTier,
    renderGlobalDefault,
  } = usePaymentTermsConfigLogic(config, onUpdate);

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon color="primary" />
          <Typography variant="subtitle1">Flow-Specific Payment Terms Override</Typography>
          {hasOverrides && (
            <Typography
              variant="caption"
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                px: 1,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              Custom
            </Typography>
          )}
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Override global payment settings for this booking flow only. Leave fields empty to use
        global defaults.
      </Typography>

      <Collapse in={expanded}>
        <Divider sx={{ my: 2 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Hierarchy:</strong> Values set here will override global Payment Settings for this
          booking flow only. Leave any field empty/unset to use the global default value.
        </Alert>

        <Stack spacing={3}>
          <DepositSettingsSection
            formData={formData}
            paymentSettings={paymentSettings as Record<string, unknown> | undefined}
            currencySymbol={currencyConfig.symbol}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onSwitchChange={handleNullableSwitchChange}
            renderGlobalDefault={renderGlobalDefault}
          />

          <Divider />

          <PaymentScheduleSection
            formData={formData}
            paymentSettings={paymentSettings as Record<string, unknown> | undefined}
            currencySymbol={currencyConfig.symbol}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onSwitchChange={handleNullableSwitchChange}
            renderGlobalDefault={renderGlobalDefault}
          />

          <Divider />

          <DateBlockingSection
            formData={formData}
            paymentSettings={paymentSettings as Record<string, unknown> | undefined}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
          />

          <Divider />

          <ChildPricingSection
            formData={formData}
            paymentSettings={paymentSettings as Record<string, unknown> | undefined}
            onSwitchChange={handleNullableSwitchChange}
            onAddTier={handleAddChildTier}
            onUpdateTier={handleUpdateChildTier}
            onRemoveTier={handleRemoveChildTier}
            renderGlobalDefault={renderGlobalDefault}
          />

          {/* Actions */}
          <Box display="flex" gap={2} pt={2}>
            <Button variant="contained" onClick={handleSave} disabled={isLoading} size="small">
              {isLoading ? 'Saving...' : 'Save Overrides'}
            </Button>

            <Button variant="outlined" onClick={handleClearOverrides} size="small" color="warning">
              Clear All Overrides
            </Button>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
};
