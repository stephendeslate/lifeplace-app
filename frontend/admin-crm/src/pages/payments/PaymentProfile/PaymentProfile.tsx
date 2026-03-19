import React from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Payment as PaymentIcon,
  Send as SendIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { ActivityTimeline, QuickActions, EntityNavigation } from '@/components/common';
import { PAYMENT_STATUSES } from '@/types/payments';
import {
  ModernPageLayout,
  ModernEmptyState,
  ModernPageHeader,
  createRefreshAction,
} from '@/components/common/ModernDesignSystem';

import { usePaymentProfileLogic } from './usePaymentProfileLogic';
import { PaymentOverviewCards } from './PaymentOverviewCards';
import { PaymentTabs } from './PaymentTabs';
import { PaymentDialogs } from './PaymentDialogs';

export const PaymentProfile: React.FC = () => {
  const logic = usePaymentProfileLogic();

  if (logic.isLoadingPayment) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  if (!logic.payment) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernPageHeader
          title="Payment Not Found"
          subtitle="The requested payment could not be located"
          icon={<PaymentIcon />}
          secondaryActions={[
            {
              label: 'Back to Payments',
              onClick: () => logic.navigate('/payments'),
              icon: <ArrowBackIcon />,
            },
          ]}
        />
        <ModernEmptyState
          icon={PaymentIcon}
          title="Payment Not Found"
          description="The payment you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Back to Payments',
            onClick: () => logic.navigate('/payments'),
            icon: <ArrowBackIcon />,
            color: 'primary',
          }}
          size="medium"
        />
      </ModernPageLayout>
    );
  }

  const payment = logic.payment;

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Page Header */}
      <ModernPageHeader
        title={`Payment ${payment.payment_number}`}
        subtitle={payment.event_details?.name || 'No Event Associated'}
        icon={<PaymentIcon />}
        primaryAction={{
          label:
            payment.status === 'PENDING' && payment.payment_method
              ? 'Process Payment'
              : payment.status === 'COMPLETED'
                ? 'Send Receipt'
                : 'Edit Payment',
          onClick:
            payment.status === 'PENDING' && payment.payment_method
              ? logic.handleProcessPayment
              : payment.status === 'COMPLETED'
                ? logic.handleSendReceipt
                : logic.handleEditPayment,
          icon:
            payment.status === 'PENDING' && payment.payment_method ? (
              <PaymentIcon />
            ) : payment.status === 'COMPLETED' ? (
              <SendIcon />
            ) : (
              <EditIcon />
            ),
          variant: 'contained',
          color: 'primary',
          disabled: logic.isProcessingPayment || logic.isSendingReceipt,
        }}
        secondaryActions={[
          {
            label: 'Back to Payments',
            onClick: () => logic.navigate('/payments'),
            icon: <ArrowBackIcon />,
            variant: 'outlined',
          },
          createRefreshAction(() => logic.refetchPayment()),
          {
            label: 'More Options',
            onClick: (e) => logic.setAnchorEl(e?.currentTarget ?? null),
            icon: <MoreVertIcon />,
            variant: 'icon',
          },
        ]}
        status={{
          label: PAYMENT_STATUSES.find((s) => s.value === payment.status)?.label || payment.status,
          color: logic.getStatusColor(payment.status),
          variant: 'filled',
        }}
        stats={[
          {
            label: 'Amount',
            value: logic.formatPaymentAmount(payment.amount),
          },
          {
            label: 'Due Date',
            value: new Date(payment.due_date).toLocaleDateString(),
          },
          ...(payment.paid_on
            ? [
                {
                  label: 'Paid On',
                  value: new Date(payment.paid_on).toLocaleDateString(),
                },
              ]
            : []),
        ]}
        size="medium"
      />

      {/* Payment Overview Cards */}
      <PaymentOverviewCards
        payment={payment}
        daysRemaining={logic.daysRemaining}
        formatPaymentAmount={logic.formatPaymentAmount}
      />

      {/* Enhanced Sections */}
      <Stack spacing={4} sx={{ mb: 4 }}>
        {/* Quick Actions & Related Entities */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <QuickActions
                actions={logic.quickActions}
                title="Payment Actions"
                compactMode={false}
              />
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <EntityNavigation
                title="Related"
                entities={logic.relatedEntities}
                layout="compact"
                maxVisible={3}
              />
            </Box>
          </Box>
        </Box>

        {/* Activity Timeline */}
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <ActivityTimeline
            activities={logic.activityItems}
            maxHeight="300px"
            showFilters={false}
            onRefresh={() => logic.refetchPayment()}
          />
        </Box>
      </Stack>

      {/* Tabs */}
      <PaymentTabs
        tabValue={logic.tabValue}
        setTabValue={logic.setTabValue}
        activityItems={logic.activityItems}
        invoice={logic.invoice}
        isLoadingInvoice={logic.isLoadingInvoice}
        paymentId={logic.paymentId}
        paymentNumber={payment.payment_number}
        refetchPayment={logic.refetchPayment}
        formatPaymentAmount={logic.formatPaymentAmount}
      />

      {/* Dialogs */}
      <PaymentDialogs
        payment={payment}
        anchorEl={logic.anchorEl}
        onMenuClose={logic.handleMenuClose}
        onEditPayment={logic.handleEditPayment}
        onDeletePayment={logic.handleDeletePayment}
        onSendReceipt={logic.handleSendReceipt}
        isSendingReceipt={logic.isSendingReceipt}
        editDialogOpen={logic.editDialogOpen}
        onCloseEditDialog={() => logic.setEditDialogOpen(false)}
        onEdit={logic.handleEdit}
        isUpdatingPayment={logic.isUpdatingPayment}
        deleteDialogOpen={logic.deleteDialogOpen}
        onCloseDeleteDialog={() => logic.setDeleteDialogOpen(false)}
        onDelete={logic.handleDelete}
        isDeletingPayment={logic.isDeletingPayment}
        refundDialogOpen={logic.refundDialogOpen}
        onCloseRefundDialog={() => logic.setRefundDialogOpen(false)}
        refundAmount={logic.refundAmount}
        onRefundAmountChange={logic.setRefundAmount}
        refundReason={logic.refundReason}
        onRefundReasonChange={logic.setRefundReason}
        onCreateRefund={logic.handleCreateRefund}
        isCreatingRefund={logic.isCreatingRefund}
        formatPaymentAmount={logic.formatPaymentAmount}
      />
    </ModernPageLayout>
  );
};
