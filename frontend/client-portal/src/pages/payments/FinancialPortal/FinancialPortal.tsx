// frontend/client-portal/src/pages/payments/FinancialPortal/FinancialPortal.tsx
// Orchestrator: financial portal with payments, invoices, and payment methods tabs

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import FinancialApi from '@/apis/financial';
import { PaymentViewer } from '@/components/payments/PaymentViewer';
import { InvoiceViewer } from '@/components/payments/InvoiceViewer';
import { InvoicePaymentDialog } from '@/components/payments/InvoicePaymentDialog';
import PaymentMethodEditDialog from '@/components/payments/PaymentMethodEditDialog';
import PaymentMethodDeleteDialog from '@/components/payments/PaymentMethodDeleteDialog';
import AddPaymentMethodDialog from '@/components/payments/AddPaymentMethodDialog';
import { FinancialOverviewCards } from './FinancialOverviewCards';
import { PaymentHistoryTab } from './PaymentHistoryTab';
import { InvoicesTab } from './InvoicesTab';
import { PaymentMethodsTab } from './PaymentMethodsTab';
import { useFinancialPortalLogic } from './useFinancialPortalLogic';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const FinancialPortal: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const logic = useFinancialPortalLogic();

  if (logic.error) {
    return (
      <>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Error Loading Financial Data
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {logic.error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => logic.refetch()}
            startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box>
        {/* Header */}
        <AnimatedElement animation="slideDown" delay={100}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Payments & Invoices
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View your payment history and manage your financial information
            </Typography>
          </Box>
        </AnimatedElement>

        {/* Loading State */}
        {logic.isLoading && (
          <Box sx={{ mb: 4 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
          </Box>
        )}

        {/* Financial Overview Cards */}
        <FinancialOverviewCards
          totalPaid={logic.getTotalPaid()}
          totalPending={logic.getTotalPending()}
          totalOverdue={logic.getTotalOverdue()}
          completedCount={logic.summary?.completed_count || 0}
          pendingCount={logic.summary?.pending_count || 0}
          isLoading={logic.isLoading}
          formatAmount={logic.formatAmount}
          onRefresh={() => logic.refetch()}
        />

        {/* Main Content with Tabs */}
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              border: `1px solid ${alpha('#fff', 0.1)}`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                borderBottom: 1,
                borderColor: alpha(theme.palette.divider, 0.3),
                backgroundColor: alpha('#fff', 0.05),
                backdropFilter: 'blur(10px)',
              }}
            >
              <Tabs
                value={logic.activeTab}
                onChange={logic.handleTabChange}
                aria-label="financial tabs"
                sx={{
                  px: 3,
                  '& .MuiTab-root': {
                    color: alpha(theme.palette.text.primary, 0.7),
                    '&.Mui-selected': {
                      color: theme.palette.primary.main,
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: theme.palette.primary.main,
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                <Tab
                  label={`Invoices (${Array.isArray(logic.invoices) ? logic.invoices.length : 0})`}
                  icon={<ReceiptIcon />}
                  iconPosition="start"
                  id="financial-tab-0"
                  aria-controls="financial-tabpanel-0"
                />
                <Tab
                  label={`Payment History (${Array.isArray(logic.payments) ? logic.payments.length : 0})`}
                  icon={<PaymentIcon />}
                  iconPosition="start"
                  id="financial-tab-1"
                  aria-controls="financial-tabpanel-1"
                />
                <Tab
                  label={`Payment Methods (${Array.isArray(logic.paymentMethods) ? logic.paymentMethods.length : 0})`}
                  icon={<CreditCardIcon />}
                  iconPosition="start"
                  id="financial-tab-2"
                  aria-controls="financial-tabpanel-2"
                />
              </Tabs>
            </Box>

            {/* Payment History Tab */}
            <TabPanel value={logic.activeTab} index={1}>
              <PaymentHistoryTab
                payments={logic.payments}
                isMobile={isMobile}
                downloadReceiptPending={logic.downloadReceiptMutation.isPending}
                onViewPayment={logic.handleViewPayment}
                onDownloadReceipt={logic.handleDownloadReceipt}
                getPaymentStatusColor={FinancialApi.getStatusColor}
              />
            </TabPanel>

            {/* Invoices Tab */}
            <TabPanel value={logic.activeTab} index={0}>
              <InvoicesTab
                invoices={logic.invoices}
                downloadInvoicePending={logic.downloadInvoiceMutation.isPending}
                onViewInvoice={logic.handleViewInvoice}
                onDownloadInvoice={logic.handleDownloadInvoice}
                onPayInvoice={logic.handlePayInvoice}
                canPayInvoice={logic.canPayInvoice}
                getInvoiceDisplayStatus={logic.getInvoiceDisplayStatus}
                isInvoiceOverdue={logic.isInvoiceOverdue}
                getDaysUntilDue={logic.getDaysUntilDue}
                getInvoicePaymentStatus={logic.getInvoicePaymentStatus}
              />
            </TabPanel>

            {/* Payment Methods Tab */}
            <TabPanel value={logic.activeTab} index={2}>
              <PaymentMethodsTab
                paymentMethods={logic.paymentMethods}
                paymentMethodsLoading={logic.paymentMethodsLoading}
                paymentMethodsError={logic.paymentMethodsError}
                isMobile={isMobile}
                onAddPaymentMethod={logic.handleAddPaymentMethodOpen}
                onEditPaymentMethod={logic.handleEditPaymentMethod}
                onDeletePaymentMethod={logic.handleDeletePaymentMethod}
              />
            </TabPanel>
          </GlassCard>
        </AnimatedElement>

        {/* Payment Viewer Dialog */}
        <Dialog
          open={logic.paymentDialogOpen}
          onClose={logic.handleClosePaymentDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Payment Details
              </Typography>
              <IconButton
                onClick={logic.handleClosePaymentDialog}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.1),
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {logic.selectedPayment && (
              <PaymentViewer
                payment={logic.selectedPayment}
                onDownloadReceipt={
                  logic.selectedPayment.receipt_number
                    ? () => logic.handleDownloadReceipt(logic.selectedPayment!.id)
                    : undefined
                }
                downloadingReceipt={logic.downloadReceiptMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Viewer Dialog */}
        <Dialog
          open={logic.invoiceDialogOpen}
          onClose={logic.handleCloseInvoiceDialog}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Invoice Details
              </Typography>
              <IconButton
                onClick={logic.handleCloseInvoiceDialog}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.1),
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {logic.selectedInvoice && (
              <InvoiceViewer
                invoice={logic.selectedInvoice}
                onDownloadPdf={() => logic.handleDownloadInvoice(logic.selectedInvoice!.id)}
                downloadingPdf={logic.downloadInvoiceMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Payment Dialog */}
        {logic.selectedInvoiceForPayment && (
          <InvoicePaymentDialog
            open={logic.invoicePaymentDialogOpen}
            invoice={logic.selectedInvoiceForPayment}
            onClose={logic.handleCloseInvoicePaymentDialog}
            onPaymentSuccess={logic.handlePaymentSuccess}
          />
        )}

        {/* Payment Method Edit Dialog */}
        <PaymentMethodEditDialog
          open={logic.editPaymentMethodOpen}
          paymentMethod={logic.selectedPaymentMethod}
          onClose={logic.handleCloseEditPaymentMethod}
          onSuccess={logic.handlePaymentMethodSuccess}
        />

        {/* Payment Method Delete Dialog */}
        <PaymentMethodDeleteDialog
          open={logic.deletePaymentMethodOpen}
          paymentMethod={logic.selectedPaymentMethod}
          onClose={logic.handleCloseDeletePaymentMethod}
          onSuccess={logic.handlePaymentMethodSuccess}
          isOnlyMethod={Array.isArray(logic.paymentMethods) && logic.paymentMethods.length === 1}
        />

        {/* Add Payment Method Dialog */}
        <AddPaymentMethodDialog
          open={logic.addPaymentMethodOpen}
          onClose={logic.handleAddPaymentMethodClose}
          onSuccess={logic.handlePaymentMethodSuccess}
        />
      </Box>
    </>
  );
};

export default FinancialPortal;
