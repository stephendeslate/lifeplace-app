import React from 'react';
import { Box, Typography, Stack, Divider, CircularProgress, alpha, Alert } from '@mui/material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { QuoteRejectionDialog } from '@/components/common/QuoteRejectionDialog';
import { useDashboardLogic } from './useDashboardLogic';
import UnfinishedBookingsSection from './UnfinishedBookingsSection';
import CriticalActionsSection from './CriticalActionsSection';
import EventStatusSection from './EventStatusSection';
import FinancialSummarySection from './FinancialSummarySection';
import VIPRewardsSection from './VIPRewardsSection';
import CommunicationHighlightsSection from './CommunicationHighlightsSection';

const Dashboard: React.FC = () => {
  const {
    user,
    navigate,
    formatAmount,
    dashboardData,
    unfinishedBookings,
    isLoadingBookings,
    vipStatus,
    isVIPLoading,
    benefitsDialogOpen,
    setBenefitsDialogOpen,
    rejectionDialog,
    rejectQuoteMutation,
    handleQuoteAction,
    handleQuoteRejection,
    handleRejectionDialogClose,
    handlePaymentAction,
    handleViewEvent,
  } = useDashboardLogic();

  return (
    <>
      <Box sx={{ width: '100%' }}>
        {/* Welcome Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            Welcome back, {user?.first_name || 'Client'}! 🌿
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your events and view communications.
          </Typography>
        </Box>

        {/* Main Dashboard Content */}
        <AnimatedElement animation="slideUp" delay={400}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              border: `1px solid ${alpha('#fff', 0.1)}`,
              overflow: 'hidden',
              p: 3,
            }}
          >
            {dashboardData.loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : dashboardData.error ? (
              <Alert severity="error">{dashboardData.error}</Alert>
            ) : (
              <Stack spacing={4}>
                {!isLoadingBookings && unfinishedBookings && unfinishedBookings.length > 0 && (
                  <UnfinishedBookingsSection
                    unfinishedBookings={unfinishedBookings}
                    onNavigate={navigate}
                  />
                )}

                {unfinishedBookings && unfinishedBookings.length > 0 && <Divider />}

                <CriticalActionsSection
                  criticalActions={dashboardData.criticalActions}
                  onNavigate={navigate}
                  onQuoteAction={handleQuoteAction}
                  onPaymentAction={handlePaymentAction}
                  onViewEvent={handleViewEvent}
                />

                <Divider />

                <EventStatusSection
                  eventStatus={dashboardData.eventStatus}
                  onViewEvent={handleViewEvent}
                  onNavigate={navigate}
                />

                <Divider />

                <FinancialSummarySection
                  financialSummary={dashboardData.financialSummary}
                  formatAmount={formatAmount}
                />

                {!isVIPLoading && vipStatus && (
                  <>
                    <Divider />
                    <VIPRewardsSection
                      vipStatus={vipStatus}
                      benefitsDialogOpen={benefitsDialogOpen}
                      onSetBenefitsDialogOpen={setBenefitsDialogOpen}
                    />
                  </>
                )}

                <Divider />

                <CommunicationHighlightsSection
                  communications={dashboardData.communications}
                  onNavigate={navigate}
                />
              </Stack>
            )}
          </GlassCard>
        </AnimatedElement>

        <QuoteRejectionDialog
          open={rejectionDialog.open}
          onClose={handleRejectionDialogClose}
          onConfirm={handleQuoteRejection}
          quoteName={rejectionDialog.quoteName || undefined}
          isLoading={rejectQuoteMutation.isPending}
        />
      </Box>
    </>
  );
};

export default Dashboard;
