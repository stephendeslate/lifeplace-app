// Currency & Taxes Settings Page
// Following the exact Account Management pattern

import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Button, Stack, TextField, InputAdornment } from '@mui/material';
import {
  CurrencyExchange as CurrencyIcon,
  Refresh as RefreshIcon,
  Receipt as TaxIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import {
  ModernSettingsLayout,
  ModernPageHeader,
  ModernDialog,
  createDeleteActions,
} from '../../../components/common';
import {
  type HeaderAction,
  createRefreshAction,
  createAddAction,
} from '../../../components/common/ModernPageHeader';
import { CurrencySettingsForm } from '../../../components/settings/CurrencySettingsForm';
import { TaxRateTable } from '../../../components/payments/TaxRateTable';
import { TaxRateFormDialog } from '../../../components/payments/TaxRateFormDialog';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import { useTaxRates, useDeleteTaxRate } from '../../../hooks/usePayments';
import type { TaxRate } from '../../../types/payments.types';

export const CurrencyTaxes: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [taxRateDialogOpen, setTaxRateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
  const [taxRateToDelete, setTaxRateToDelete] = useState<TaxRate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

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

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: 'Settings' }, { label: 'Commerce' }, { label: 'Currency & Taxes' }]);
  }, [setBreadcrumbs]);

  const handleEditTaxRate = (taxRate: TaxRate) => {
    setEditingTaxRate(taxRate);
    setTaxRateDialogOpen(true);
  };

  const handleDeleteTaxRate = (taxRate: TaxRate) => {
    setTaxRateToDelete(taxRate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (taxRateToDelete) {
      deleteTaxRateMutation.mutate(taxRateToDelete.id);
      setDeleteDialogOpen(false);
      setTaxRateToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTaxRateToDelete(null);
  };

  const handleCloseTaxRateDialog = () => {
    setTaxRateDialogOpen(false);
    setEditingTaxRate(null);
  };

  const handleCreateTaxRate = () => {
    setEditingTaxRate(null);
    setTaxRateDialogOpen(true);
  };

  // Filter tax rates based on search
  const filteredTaxRates = taxRates.filter((rate) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      rate.name.toLowerCase().includes(searchLower) || rate.rate.toString().includes(searchLower)
    );
  });

  const handleResetCurrency = () => {
    resetCurrencySettings();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setSearchQuery('');
    }
  };

  // Header actions
  const headerActions: HeaderAction[] = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon',
      tooltip: showSearchField ? 'Hide search field' : 'Search currency and tax settings',
    },
    createRefreshAction(handleRefresh),
  ];

  const primaryAction = createAddAction('Add Tax Rate', handleCreateTaxRate, 'primary');

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Currency & Taxes"
        subtitle="Configure currency display settings and manage tax rates for your business"
        icon={<CurrencyIcon />}
        breadcrumbs={[{ label: 'Settings' }, { label: 'Commerce' }, { label: 'Currency & Taxes' }]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Currency', value: currencySettings?.defaultCurrency || 'USD' },
          { label: 'Tax Rates', value: taxRates.length },
          {
            label: 'Default Rate',
            value: filteredTaxRates.filter((rate) => rate.is_default).length,
          },
        ]}
        size="medium"
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SearchIcon color="primary" />
            <Typography variant="h6" fontWeight="600">
              Search Currency & Tax Settings
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find tax rates by name, description, or rate percentage
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by name, description, or rate..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Currency Settings Section */}
      <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <SettingsIcon color="primary" />
          <Typography variant="h6" fontWeight="600">
            Display Configuration
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          These settings affect invoices, payments, and all financial data display throughout the
          system.
        </Typography>

        {currencyError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load currency settings. Please try again.
          </Alert>
        )}

        <CurrencySettingsForm
          settings={currencySettings}
          onSubmit={updateCurrencySettings}
          loading={isLoadingCurrency || isUpdatingCurrency}
        />

        <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleResetCurrency}
            disabled={isResettingCurrency}
            startIcon={<RefreshIcon />}
          >
            Reset to Defaults
          </Button>
        </Stack>
      </Box>

      {/* Tax Rates Section */}
      <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <TaxIcon color="success" />
          <Typography variant="h6" fontWeight="600">
            Tax Configuration
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {searchQuery
            ? `Search results for "${searchQuery}" - ${filteredTaxRates.length} found`
            : "Tax rates are automatically applied to invoices and payments based on the client's location or service type."}
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Philippine Tax Context:</strong> Standard VAT rate is 12% for most goods and
            services. Some services may be VAT-exempt or zero-rated. Consult with a tax professional
            for specific requirements.
          </Typography>
        </Alert>

        <TaxRateTable
          taxRates={filteredTaxRates}
          isLoading={isLoadingTaxRates}
          onEdit={handleEditTaxRate}
          onDelete={(id) => {
            const taxRate = filteredTaxRates.find((rate) => rate.id === id);
            if (taxRate) handleDeleteTaxRate(taxRate);
          }}
          isDeleting={deleteTaxRateMutation.isPending}
        />
      </Box>

      {/* Dialogs */}
      <TaxRateFormDialog
        open={taxRateDialogOpen}
        onClose={handleCloseTaxRateDialog}
        taxRate={editingTaxRate}
      />

      {/* Delete Confirmation Dialog */}
      <ModernDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        title="Delete Tax Rate"
        maxWidth="sm"
        fullWidth
        actions={createDeleteActions(
          handleDeleteCancel,
          handleDeleteConfirm,
          deleteTaxRateMutation.isPending,
        )}
      >
        <Typography>
          Are you sure you want to delete the tax rate "{taxRateToDelete?.name}"? This action cannot
          be undone.
        </Typography>
      </ModernDialog>
    </ModernSettingsLayout>
  );
};
