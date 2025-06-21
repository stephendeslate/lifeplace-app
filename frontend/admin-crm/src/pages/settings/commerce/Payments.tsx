// frontend/admin-crm/src/pages/settings/commerce/Payments.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  AccountBalance as TaxIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { usePaymentGateways, useTaxRates } from '../../../hooks/usePayments';
import { 
  PaymentGatewayTable, 
  PaymentGatewayFormDialog,
  TaxRateTable,
  TaxRateFormDialog,
} from '../../../components/payments';
import type { PaymentGateway, TaxRate } from '../../../types/payments.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const Payments: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [activeTab, setActiveTab] = useState(0);
  
  // Gateway management state
  const [gatewayDialogOpen, setGatewayDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  
  // Tax rate management state
  const [taxRateDialogOpen, setTaxRateDialogOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);

  // Data fetching
  const { data: gateways = [], isLoading: gatewaysLoading } = usePaymentGateways();
  const { data: taxRates = [], isLoading: taxRatesLoading } = useTaxRates();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Commerce' },
      { label: 'Payments' },
    ]);
  }, [setBreadcrumbs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Gateway handlers
  const handleAddGateway = () => {
    setSelectedGateway(null);
    setGatewayDialogOpen(true);
  };

  const handleEditGateway = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    setGatewayDialogOpen(true);
  };

  const handleCloseGatewayDialog = () => {
    setGatewayDialogOpen(false);
    setSelectedGateway(null);
  };

  // Tax rate handlers
  const handleAddTaxRate = () => {
    setSelectedTaxRate(null);
    setTaxRateDialogOpen(true);
  };

  const handleEditTaxRate = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate);
    setTaxRateDialogOpen(true);
  };

  const handleCloseTaxRateDialog = () => {
    setTaxRateDialogOpen(false);
    setSelectedTaxRate(null);
  };

  const hasPayMongo = gateways.some(g => g.code === 'paymongo' && g.is_active);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <PaymentIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Payment Configuration
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Configure payment gateways and tax settings for client transactions
            </Typography>
          </Box>
        </Box>

        {/* Quick Setup Alert */}
        {!hasPayMongo && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleAddGateway}>
                Setup PayMongo
              </Button>
            }
          >
            <strong>Philippine Business?</strong> Setup PayMongo for seamless local payment processing including cards, e-wallets, and bank transfers.
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="payment configuration tabs">
            <Tab 
              label="Payment Gateways" 
              icon={<PaymentIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Tax Rates" 
              icon={<TaxIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Payment Gateways Tab */}
        <TabPanel value={activeTab} index={0}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Payment Gateways
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure payment processing providers for accepting client payments
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddGateway}
              >
                Add Gateway
              </Button>
            </Box>

            <PaymentGatewayTable
              gateways={gateways}
              isLoading={gatewaysLoading}
              onEdit={handleEditGateway}
            />
          </CardContent>
        </TabPanel>

        {/* Tax Rates Tab */}
        <TabPanel value={activeTab} index={1}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Tax Rates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage tax rates applied to invoices and quotes
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddTaxRate}
              >
                Add Tax Rate
              </Button>
            </Box>

            <TaxRateTable
              taxRates={taxRates}
              isLoading={taxRatesLoading}
              onEdit={handleEditTaxRate}
            />
          </CardContent>
        </TabPanel>
      </Card>

      {/* Dialogs */}
      <PaymentGatewayFormDialog
        open={gatewayDialogOpen}
        onClose={handleCloseGatewayDialog}
        gateway={selectedGateway}
      />

      <TaxRateFormDialog
        open={taxRateDialogOpen}
        onClose={handleCloseTaxRateDialog}
        taxRate={selectedTaxRate}
      />
    </Box>
  );
};