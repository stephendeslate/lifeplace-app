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
import { usePaymentGateways } from '../../../hooks/usePayments';
import {
  PaymentGatewayTable,
  PaymentGatewayFormDialog,
  PaymentPlanSettings,
} from '../../../components/payments';
import type { PaymentGateway } from '../../../types/payments.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, type HeaderAction, createRefreshAction, createAddAction } from '../../../components/common/ModernPageHeader';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

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
      {/* Modern Header */}
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
        gradient
        glass
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            size="large"
            color="primary"
            animation="fade"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
              },
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: tokens.color.neutral[800],
                  fontWeight: 600,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                Search Payment Configuration
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: tokens.color.neutral[600],
                  mb: 3,
                }}
              >
                Find payment gateways by name, type, or configuration details
              </Typography>

              <TextField
                fullWidth
                placeholder="Search by name, type, or configuration..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    '&:hover': {
                      border: `1px solid ${tokens.color.primary[300]}`,
                    },
                    '&.Mui-focused': {
                      border: `1px solid ${tokens.color.primary[500]}`,
                      boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </ModernCard>
        </Box>
      )}

      {/* Quick Setup Alert */}
      {!hasPayMongo && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            color="primary"
            size="small"
            animation="none"
          >
            <Alert 
              severity="info"
              icon={<PaymentIcon />}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleAddGateway}
                  sx={{
                    borderRadius: tokens.spacing.radius.full,
                    fontWeight: 600,
                  }}
                >
                  Setup PayMongo
                </Button>
              }
              sx={{
                backgroundColor: 'transparent',
                border: 'none',
                '& .MuiAlert-message': {
                  color: tokens.color.primary[700],
                },
              }}
            >
              <strong>Philippine Business?</strong> Setup PayMongo for seamless local payment processing including cards, e-wallets, and bank transfers.
            </Alert>
          </ModernCard>
        </Box>
      )}

      {/* Modern Main Content Card */}
      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Modern Tab System */}
        <Box 
          sx={{ 
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            position: 'relative',
            ...glassPresets.light,
            borderRadius: `${tokens.spacing.radius.xxl} ${tokens.spacing.radius.xxl} 0 0`,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="payment configuration tabs"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: tokens.color.primary[500],
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: `${tokens.spacing.radius.lg} ${tokens.spacing.radius.lg} 0 0`,
                transition: createTransition(['background', 'color'], 'fast'),
                
                '&:hover': {
                  backgroundColor: `${tokens.color.primary[500]}08`,
                },
                
                '&.Mui-selected': {
                  backgroundColor: `${tokens.color.primary[500]}12`,
                  color: tokens.color.primary[700],
                },
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
        <Box sx={{ p: 3, position: 'relative' }}>
          {/* Payment Gateways Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography 
                  variant="h6" 
                  fontWeight="700"
                  sx={{ 
                    color: tokens.color.neutral[800],
                    mb: 0.5,
                  }}
                >
                  Payment Gateways
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: tokens.color.neutral[600],
                  }}
                >
                  Configure payment processing providers for accepting client payments
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddGateway}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                  borderRadius: tokens.spacing.radius.full,
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                  transition: createTransition(['transform', 'box-shadow'], 'fast'),
                  
                  '&:hover': {
                    background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                  },
                }}
              >
                Add Gateway
              </Button>
            </Box>

            <PaymentGatewayTable
              gateways={gateways}
              isLoading={gatewaysLoading}
              onEdit={handleEditGateway}
            />
          </TabPanel>

          {/* Payment Plans and Terms Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="700"
                  sx={{
                    color: tokens.color.neutral[800],
                    mb: 0.5,
                  }}
                >
                  Payment Plan Settings
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.color.neutral[600],
                  }}
                >
                  Configure default payment plan behavior, installment settings, and late fee policies
                </Typography>
              </Box>
            </Box>

            <PaymentPlanSettings />
          </TabPanel>
        </Box>
      </ModernCard>

      {/* Dialogs */}
      <PaymentGatewayFormDialog
        open={gatewayDialogOpen}
        onClose={handleCloseGatewayDialog}
        gateway={selectedGateway}
      />
    </ModernSettingsLayout>
  );
};