// Currency & Taxes Settings Page
// Following the pattern from Payments.tsx

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Alert,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  CurrencyExchange as CurrencyIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { ModernPageLayout, ModernPageHeader } from '../../../components/common';
import { CurrencySettingsForm } from '../../../components/settings/CurrencySettingsForm';
import { TaxRateTable } from '../../../components/payments/TaxRateTable';
import { TaxRateFormDialog } from '../../../components/payments/TaxRateFormDialog';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import { useTaxRates, useDeleteTaxRate } from '../../../hooks/usePayments';
import type { TaxRate } from '../../../types/payments.types';

export const CurrencyTaxes: React.FC = () => {
  const [taxRateDialogOpen, setTaxRateDialogOpen] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);

  // Currency settings
  const {
    settings: currencySettings,
    isLoading: isLoadingCurrency,
    updateSettings: updateCurrencySettings,
    resetSettings: resetCurrencySettings,
    isUpdating: isUpdatingCurrency,
    isResetting: isResettingCurrency,
    error: currencyError,
  } = useCurrencySettings();

  // Tax rates
  const { data: taxRates = [], isLoading: isLoadingTaxRates } = useTaxRates();
  const deleteTaxRateMutation = useDeleteTaxRate();

  const handleEditTaxRate = (taxRate: TaxRate) => {
    setEditingTaxRate(taxRate);
    setTaxRateDialogOpen(true);
  };

  const handleDeleteTaxRate = (id: number) => {
    deleteTaxRateMutation.mutate(id);
  };

  const handleCloseTaxRateDialog = () => {
    setTaxRateDialogOpen(false);
    setEditingTaxRate(null);
  };

  const handleCreateTaxRate = () => {
    setEditingTaxRate(null);
    setTaxRateDialogOpen(true);
  };

  const handleResetCurrency = () => {
    resetCurrencySettings();
  };

  return (
    <ModernPageLayout backgroundPattern="minimal">
      <ModernPageHeader
        title="Currency & Taxes"
        subtitle="Configure currency display and tax rate settings"
        icon={<CurrencyIcon />}
      />

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, space: 3 }}>
        {/* Currency Settings Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Currency Settings
            </Typography>
            <Tooltip title="Reset to defaults">
              <Fab 
                size="small" 
                onClick={handleResetCurrency}
                disabled={isResettingCurrency}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                }}
              >
                <RefreshIcon />
              </Fab>
            </Tooltip>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure how currency amounts are displayed throughout the application. 
            These settings affect invoices, payments, and all financial data display.
          </Typography>

          {currencyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load currency settings. Please try again.
            </Alert>
          )}

          <CurrencySettingsForm
            settings={currencySettings}
            onSubmit={updateCurrencySettings}
            loading={isLoadingCurrency || isUpdatingCurrency}
          />
        </Paper>

        <Divider sx={{ my: 4 }} />

        {/* Tax Rates Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Tax Rates
            </Typography>
            <Fab 
              size="small" 
              onClick={handleCreateTaxRate}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                },
              }}
            >
              <AddIcon />
            </Fab>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage tax rates for different regions or services. Tax rates are automatically 
            applied to invoices and payments based on the client's location or service type.
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Philippine Tax Context:</strong> Standard VAT rate is 12% for most goods and services. 
              Some services may be VAT-exempt or zero-rated. Consult with a tax professional for specific requirements.
            </Typography>
          </Alert>

          <TaxRateTable
            taxRates={taxRates}
            isLoading={isLoadingTaxRates}
            onEdit={handleEditTaxRate}
            onDelete={handleDeleteTaxRate}
            isDeleting={deleteTaxRateMutation.isPending}
          />
        </Paper>
      </Box>

      {/* Tax Rate Form Dialog */}
      <TaxRateFormDialog
        open={taxRateDialogOpen}
        onClose={handleCloseTaxRateDialog}
        taxRate={editingTaxRate}
      />
    </ModernPageLayout>
  );
};