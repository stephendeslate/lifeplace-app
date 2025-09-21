import React, { useState, useEffect } from 'react';
import {
  Box,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { usePayments, usePaymentSettings } from '../../hooks/usePayments';
import { useCurrentCurrency } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { tokens } from '../../design-system';
import { ModernCard } from '../../components/common';
import type { Event, PaymentPlan, PaymentInstallment } from '../../types';

interface EventPaymentPlansProps {
  event: Event;
}

interface PaymentPlanFormData {
  total_amount: number;
  down_payment_amount: number;
  number_of_installments: number;
  frequency: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
  down_payment_due_date: string;
  grace_period_days: number;
}

const InstallmentStatusChip: React.FC<{ installment: PaymentInstallment }> = ({ installment }) => {
  const getStatusConfig = () => {
    switch (installment.status) {
      case 'PAID':
        return { color: 'success' as const, icon: <CheckCircleIcon />, label: 'Paid' };
      case 'OVERDUE':
        return { color: 'error' as const, icon: <WarningIcon />, label: 'Overdue' };
      case 'PENDING':
        return { color: 'warning' as const, icon: <PendingIcon />, label: 'Pending' };
      default:
        return { color: 'default' as const, icon: <ScheduleIcon />, label: 'Scheduled' };
    }
  };

  const { color, icon, label } = getStatusConfig();

  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      size="small"
      variant="outlined"
    />
  );
};

const PaymentPlanCard: React.FC<{
  paymentPlan: PaymentPlan;
  onEdit: (plan: PaymentPlan) => void;
  onDelete: (plan: PaymentPlan) => void;
  onSendReminder: (plan: PaymentPlan) => void;
}> = ({ paymentPlan, onEdit, onDelete, onSendReminder }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { currentCurrency: currency } = useCurrentCurrency();

  const completionPercentage = (paymentPlan.paid_amount / paymentPlan.total_amount) * 100;
  const isOverdue = paymentPlan.is_overdue;

  return (
    <ModernCard>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Payment Plan #{paymentPlan.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {paymentPlan.number_of_installments} installments • {paymentPlan.frequency.replace('_', ' ')}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={paymentPlan.status}
              color={paymentPlan.status === 'ACTIVE' ? 'success' : 'default'}
              size="small"
            />
            {isOverdue && (
              <Chip
                icon={<WarningIcon />}
                label="Overdue"
                color="error"
                size="small"
                variant="outlined"
              />
            )}
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Payment Progress */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Payment Progress
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(paymentPlan.paid_amount, currency)} / {formatCurrency(paymentPlan.total_amount, currency)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: tokens.colors.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: completionPercentage === 100 ? tokens.colors.green[500] : tokens.colors.blue[500],
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            {completionPercentage.toFixed(1)}% complete
          </Typography>
        </Box>

        {/* Key Details */}
        <Stack direction="row" spacing={3} mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Remaining Balance
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(paymentPlan.remaining_balance, currency)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Next Payment
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {paymentPlan.next_payment_date ? format(new Date(paymentPlan.next_payment_date), 'MMM d, yyyy') : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Final Payment
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {format(new Date(paymentPlan.final_payment_date), 'MMM d, yyyy')}
            </Typography>
          </Box>
        </Stack>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => { onEdit(paymentPlan); setAnchorEl(null); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit Plan</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onSendReminder(paymentPlan); setAnchorEl(null); }}>
            <ListItemIcon><SendIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Send Reminder</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Download Schedule</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onDelete(paymentPlan); setAnchorEl(null); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete Plan</ListItemText>
          </MenuItem>
        </Menu>
      </CardContent>
    </ModernCard>
  );
};

const InstallmentTable: React.FC<{ installments: PaymentInstallment[] }> = ({ installments }) => {
  const { currentCurrency: currency } = useCurrentCurrency();

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Paid Amount</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {installments.map((installment) => (
            <TableRow key={installment.id}>
              <TableCell>{installment.installment_number}</TableCell>
              <TableCell>
                {format(new Date(installment.due_date), 'MMM d, yyyy')}
                {installment.days_overdue_count > 0 && (
                  <Typography variant="caption" color="error.main" display="block">
                    {installment.days_overdue_count} days overdue
                  </Typography>
                )}
              </TableCell>
              <TableCell>{formatCurrency(installment.amount, currency)}</TableCell>
              <TableCell>
                <InstallmentStatusChip installment={installment} />
              </TableCell>
              <TableCell>
                {formatCurrency(installment.paid_amount, currency)}
                {installment.late_fee_amount > 0 && (
                  <Typography variant="caption" color="warning.main" display="block">
                    +{formatCurrency(installment.late_fee_amount, currency)} late fee
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {installment.status === 'PENDING' && (
                  <Button
                    size="small"
                    startIcon={<PaymentIcon />}
                    variant="outlined"
                  >
                    Record Payment
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PaymentPlanFormDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentPlanFormData) => void;
  initialData?: Partial<PaymentPlanFormData>;
}> = ({ open, onClose, onSubmit, initialData }) => {
  const { currencyConfig } = useCurrentCurrency();
  const { data: paymentSettings } = usePaymentSettings();
  const [formData, setFormData] = useState<PaymentPlanFormData>({
    total_amount: initialData?.total_amount || 0,
    down_payment_amount: initialData?.down_payment_amount || 0,
    number_of_installments: initialData?.number_of_installments || paymentSettings?.default_installments || 3,
    frequency: initialData?.frequency || paymentSettings?.default_installment_frequency || 'MONTHLY',
    down_payment_due_date: initialData?.down_payment_due_date || format(new Date(), 'yyyy-MM-dd'),
    grace_period_days: initialData?.grace_period_days || paymentSettings?.grace_period_days || 3,
  });

  // Update form defaults when payment settings load
  useEffect(() => {
    if (paymentSettings && !initialData) {
      setFormData(prev => ({
        ...prev,
        number_of_installments: prev.number_of_installments === 3 ? paymentSettings.default_installments : prev.number_of_installments,
        frequency: prev.frequency === 'MONTHLY' ? paymentSettings.default_installment_frequency : prev.frequency,
        grace_period_days: prev.grace_period_days === 3 ? paymentSettings.grace_period_days : prev.grace_period_days,
      }));
    }
  }, [paymentSettings, initialData]);

  // Handle total amount change and auto-calculate down payment
  const handleTotalAmountChange = (newTotalAmount: number) => {
    const depositPercentage = paymentSettings?.default_deposit_percentage || 25;
    const calculatedDownPayment = (newTotalAmount * depositPercentage) / 100;

    setFormData(prev => ({
      ...prev,
      total_amount: newTotalAmount,
      down_payment_amount: calculatedDownPayment
    }));
  };

  const handleSubmit = () => {
    // Basic validation
    if (formData.total_amount <= 0) {
      alert('Total amount must be greater than 0');
      return;
    }
    if (formData.down_payment_amount >= formData.total_amount) {
      alert('Down payment amount must be less than total amount');
      return;
    }
    if (formData.number_of_installments <= 0) {
      alert('Number of installments must be greater than 0');
      return;
    }

    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Edit Payment Plan' : 'Create Payment Plan'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Total Amount */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Total Amount"
              type="number"
              value={formData.total_amount}
              onChange={(e) => handleTotalAmountChange(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
              }}
              required
            />
          </Grid>

          {/* Down Payment Amount */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Down Payment Amount"
              type="number"
              value={formData.down_payment_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, down_payment_amount: Number(e.target.value) }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
              }}
              helperText={`Auto-calculated: ${paymentSettings?.default_deposit_percentage || 25}% of total amount`}
              required
            />
          </Grid>

          {/* Number of Installments */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Number of Installments"
              type="number"
              value={formData.number_of_installments}
              onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: Number(e.target.value) }))}
              inputProps={{ min: 1, max: 24 }}
              required
            />
          </Grid>

          {/* Payment Frequency */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Payment Frequency</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' }))}
                label="Payment Frequency"
              >
                <MenuItem value="WEEKLY">Weekly</MenuItem>
                <MenuItem value="BI_WEEKLY">Bi-Weekly</MenuItem>
                <MenuItem value="MONTHLY">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Down Payment Due Date */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Down Payment Due Date"
              type="date"
              value={formData.down_payment_due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, down_payment_due_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          {/* Grace Period Days */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Grace Period (Days)"
              type="number"
              value={formData.grace_period_days}
              onChange={(e) => setFormData(prev => ({ ...prev, grace_period_days: Number(e.target.value) }))}
              inputProps={{ min: 0, max: 30 }}
              helperText="Number of days before marking payments as overdue"
            />
          </Grid>

          {/* Payment Plan Summary */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Payment Plan Summary:
              </Typography>
              <Typography variant="body2">
                • Down Payment: ${formData.down_payment_amount.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                • Remaining Balance: ${(formData.total_amount - formData.down_payment_amount).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                • Installment Amount: ${((formData.total_amount - formData.down_payment_amount) / formData.number_of_installments).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                • Payment Frequency: {formData.frequency.replace('_', ' ').toLowerCase()}
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {initialData ? 'Update' : 'Create'} Plan
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EventPaymentPlans: React.FC<EventPaymentPlansProps> = ({ event }) => {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [_selectedInstallments, _setSelectedInstallments] = useState<PaymentInstallment[]>([]);

  const {
    data: paymentPlans,
    isLoading: isLoadingPlans,
    error: plansError,
    createPaymentPlan,
    updatePaymentPlan,
    deletePaymentPlan,
  } = usePayments({
    eventId: event.id,
  });

  const {
    data: installments,
    isLoading: _isLoadingInstallments,
  } = usePayments({
    eventId: event.id,
    includeInstallments: true,
  });

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setFormDialogOpen(true);
  };

  const handleEditPlan = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setFormDialogOpen(true);
  };

  const handleDeletePlan = async (plan: PaymentPlan) => {
    if (window.confirm('Are you sure you want to delete this payment plan?')) {
      await deletePaymentPlan.mutateAsync(plan.id);
    }
  };

  const handleSendReminder = async (plan: PaymentPlan) => {
    // Implementation for sending payment reminders
    console.log('Sending reminder for plan:', plan.id);
  };

  const handleFormSubmit = async (data: PaymentPlanFormData) => {
    if (editingPlan) {
      await updatePaymentPlan.mutateAsync({
        id: editingPlan.id,
        data: {
          ...data,
          event: event.id,
        },
      });
    } else {
      await createPaymentPlan.mutateAsync({
        ...data,
        event: event.id,
      });
    }
  };

  if (isLoadingPlans) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (plansError) {
    return (
      <Alert severity="error">
        Failed to load payment plans: {plansError.message}
      </Alert>
    );
  }

  const hasPaymentPlans = paymentPlans && paymentPlans.length > 0;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Payment Plans for {event.name}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePlan}
        >
          Create Payment Plan
        </Button>
      </Box>

      {/* Payment Plans */}
      {!hasPaymentPlans ? (
        <ModernCard>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <PaymentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Payment Plans
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              This event doesn't have any payment plans yet. Create one to set up installment payments for your client.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePlan}
            >
              Create Payment Plan
            </Button>
          </CardContent>
        </ModernCard>
      ) : (
        <Stack spacing={3}>
          {paymentPlans?.map((plan) => (
            <PaymentPlanCard
              key={plan.id}
              paymentPlan={plan}
              onEdit={handleEditPlan}
              onDelete={handleDeletePlan}
              onSendReminder={handleSendReminder}
            />
          ))}
        </Stack>
      )}

      {/* Installments Table */}
      {hasPaymentPlans && installments && installments.length > 0 && (
        <ModernCard sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment Schedule
            </Typography>
            <InstallmentTable installments={installments} />
          </CardContent>
        </ModernCard>
      )}

      {/* Form Dialog */}
      <PaymentPlanFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingPlan ? {
          total_amount: editingPlan.total_amount,
          down_payment_amount: editingPlan.down_payment_amount,
          number_of_installments: editingPlan.number_of_installments,
          frequency: editingPlan.frequency as 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY',
          down_payment_due_date: editingPlan.down_payment_due_date,
          grace_period_days: editingPlan.grace_period_days,
        } : undefined}
      />
    </Box>
  );
};