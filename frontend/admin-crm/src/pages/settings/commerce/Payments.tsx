// frontend/admin-crm/src/pages/settings/commerce/Payments.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { usePaymentGateways, useGatewayHealth } from '../../../hooks/usePayments';
import {
  PaymentGatewayTable,
  PaymentGatewayFormDialog,
  PaymentPlanSettings,
} from '../../../components/payments';
import type { PaymentGateway } from '../../../types/payments.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernPageHeader, type HeaderAction, createRefreshAction, createAddAction } from '../../../components/common/ModernPageHeader';

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

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

  // Data fetching
  const { data: gateways = [], isLoading: gatewaysLoading, refetch: refetchGateways } = usePaymentGateways();
  const { data: healthData, refetch: refetchHealth } = useGatewayHealth();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRefresh = () => {
    refetchGateways();
    refetchHealth();
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setSearchQuery('');
    }
  };

  const hasPayMongo = gateways.some(g => g.code === 'paymongo' && g.is_active);

  // Calculate stats
  const activeGateways = gateways.filter(g => g.is_active).length;

  // Header actions
  const headerActions: HeaderAction[] = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon',
      tooltip: showSearchField ? 'Hide search field' : 'Search payment gateways',
    },
    createRefreshAction(handleRefresh),
  ];

  const primaryAction = activeTab === 0 ? createAddAction(
    'New Gateway',
    handleAddGateway,
    'primary'
  ) : undefined;

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Payment Configuration"
        subtitle="Configure payment gateways and payment plans for client transactions"
        icon={<PaymentIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Commerce' },
          { label: 'Payments' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Active Gateways', value: activeGateways },
          { label: 'Total Gateways', value: gateways.length },
        ]}
        size="medium"
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SearchIcon color="primary" />
            <Typography variant="h6" fontWeight="600">
              Search Payment Configuration
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find payment gateways by name, type, or configuration details
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by name, type, or configuration..."
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

      {/* Quick Setup Alert */}
      {!hasPayMongo && (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity="info"
            icon={<PaymentIcon />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleAddGateway}
              >
                Setup PayMongo
              </Button>
            }
          >
            <strong>Philippine Business?</strong> Setup PayMongo for seamless local payment processing including cards, e-wallets, and bank transfers.
          </Alert>
        </Box>
      )}

      {/* Main Content Card */}
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        {/* Tab System */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="payment configuration tabs"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
              },
            }}
          >
            <Tab
              label="Payment Gateways"
              icon={<PaymentIcon />}
              iconPosition="start"
            />
            <Tab
              label="Payment Plans and Terms"
              icon={<SettingsIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {/* Payment Gateways Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }}>
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
              healthData={healthData}
            />
          </TabPanel>

          {/* Payment Plans and Terms Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }}>
                  Payment Plan Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure default payment plan behavior, installment settings, and late fee policies
                </Typography>
              </Box>
            </Box>

            <PaymentPlanSettings />
          </TabPanel>
        </Box>
      </Box>

      {/* Dialogs */}
      <PaymentGatewayFormDialog
        open={gatewayDialogOpen}
        onClose={handleCloseGatewayDialog}
        gateway={selectedGateway}
      />
    </ModernSettingsLayout>
  );
};
