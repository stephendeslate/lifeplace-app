// frontend/admin-crm/src/components/common/QuickActions.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Assignment as ContractIcon,
  Email as EmailIcon,
  Description as QuoteIcon,
  Note as NoteIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationIcon,
  Flag as FlagIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  variant?: 'contained' | 'outlined' | 'text';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  badge?: number | string;
  tooltip?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  category?: 'primary' | 'secondary' | 'tertiary';
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  orientation?: 'horizontal' | 'vertical';
  maxPrimaryActions?: number;
  showCategoryHeaders?: boolean;
  compactMode?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
  orientation = 'vertical',
  maxPrimaryActions = 3,
  showCategoryHeaders = false,
  compactMode = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Categorize actions
  const primaryActions = actions.filter(
    (a) => a.category === 'primary' || (!a.category && actions.indexOf(a) < maxPrimaryActions),
  );
  const secondaryActions = actions.filter((a) => a.category === 'secondary');
  const tertiaryActions = actions.filter((a) => a.category === 'tertiary');
  const overflowActions = actions.filter(
    (a) => !a.category && actions.indexOf(a) >= maxPrimaryActions,
  );

  const allSecondaryActions = [...secondaryActions, ...tertiaryActions, ...overflowActions];

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: QuickAction) => {
    if (action.requiresConfirmation) {
      // In a real implementation, you'd show a confirmation dialog
      if (
        window.confirm(
          action.confirmationMessage || `Are you sure you want to ${action.label.toLowerCase()}?`,
        )
      ) {
        action.onClick();
      }
    } else {
      action.onClick();
    }
    handleMenuClose();
  };

  const renderAction = (action: QuickAction, isMenuItem = false) => {
    const actionContent = (
      <>
        {!isMenuItem && action.badge ? (
          <Badge badgeContent={action.badge} color="error">
            {action.icon}
          </Badge>
        ) : (
          action.icon
        )}
        {!compactMode && (
          <Typography variant={isMenuItem ? 'body2' : 'button'} component="span">
            {action.label}
          </Typography>
        )}
      </>
    );

    if (isMenuItem) {
      return (
        <MenuItem
          key={action.id}
          onClick={() => handleActionClick(action)}
          disabled={action.disabled || action.loading}
        >
          <ListItemIcon>
            {action.loading ? <CircularProgress size={20} /> : action.icon}
          </ListItemIcon>
          <ListItemText>
            {action.label}
            {action.badge && (
              <Chip
                label={action.badge}
                size="small"
                color="error"
                sx={{ ml: 1, height: 16, fontSize: '0.7rem' }}
              />
            )}
          </ListItemText>
        </MenuItem>
      );
    }

    const commonProps = {
      key: action.id,
      disabled: action.disabled || action.loading,
      onClick: () => handleActionClick(action),
      color: action.color || 'primary',
      variant: action.variant || 'contained',
    };

    if (compactMode) {
      return (
        <Tooltip key={action.id} title={action.tooltip || action.label}>
          <span>
            <IconButton
              {...commonProps}
              size="small"
              sx={{
                bgcolor:
                  action.variant === 'contained'
                    ? `${action.color || 'primary'}.main`
                    : 'transparent',
                color:
                  action.variant === 'contained' ? 'white' : `${action.color || 'primary'}.main`,
                '&:hover': {
                  bgcolor: `${action.color || 'primary'}.${action.variant === 'contained' ? 'dark' : 'light'}`,
                },
              }}
            >
              {action.loading ? <CircularProgress size={16} /> : action.icon}
            </IconButton>
          </span>
        </Tooltip>
      );
    }

    return (
      <Button
        {...commonProps}
        startIcon={action.loading ? <CircularProgress size={16} /> : action.icon}
        fullWidth={orientation === 'vertical'}
        sx={{ justifyContent: orientation === 'vertical' ? 'flex-start' : 'center' }}
      >
        {actionContent}
      </Button>
    );
  };

  if (compactMode) {
    return (
      <Box display="flex" gap={0.5} flexWrap="wrap">
        {primaryActions.map((action) => renderAction(action))}
        {allSecondaryActions.length > 0 && (
          <>
            <Tooltip title="More actions">
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              {allSecondaryActions.map((action) => renderAction(action, true))}
            </Menu>
          </>
        )}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        <Stack
          direction={orientation === 'horizontal' ? 'row' : 'column'}
          spacing={1}
          flexWrap={orientation === 'horizontal' ? 'wrap' : 'nowrap'}
        >
          {/* Primary Actions */}
          {showCategoryHeaders && primaryActions.length > 0 && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
              Primary Actions
            </Typography>
          )}
          {primaryActions.map((action) => renderAction(action))}

          {/* Secondary Actions */}
          {secondaryActions.length > 0 && (
            <>
              {showCategoryHeaders && (
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
                  Secondary Actions
                </Typography>
              )}
              {secondaryActions.map((action) => renderAction(action))}
            </>
          )}

          {/* More Actions Menu */}
          {(tertiaryActions.length > 0 || overflowActions.length > 0) && (
            <>
              <Button
                variant="outlined"
                startIcon={<MoreVertIcon />}
                onClick={handleMenuClick}
                fullWidth={orientation === 'vertical'}
                sx={{ justifyContent: orientation === 'vertical' ? 'flex-start' : 'center' }}
              >
                More Actions
              </Button>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                {showCategoryHeaders &&
                  tertiaryActions.length > 0 && [
                    <Typography
                      key="tertiary-header"
                      variant="subtitle2"
                      sx={{ px: 2, py: 1, color: 'text.secondary' }}
                    >
                      Additional Actions
                    </Typography>,
                    <Divider key="tertiary-divider" />,
                  ]}
                {tertiaryActions.map((action) => renderAction(action, true))}

                {overflowActions.length > 0 && tertiaryActions.length > 0 && <Divider />}
                {overflowActions.map((action) => renderAction(action, true))}
              </Menu>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// Predefined action creators for common use cases
export const createEventActions = (
  eventId: number,
  onAction: (actionType: string, eventId: number) => void,
): QuickAction[] => [
  {
    id: 'send-contract',
    label: 'Send Contract',
    icon: <ContractIcon />,
    color: 'primary',
    category: 'primary',
    onClick: () => onAction('send-contract', eventId),
    tooltip: 'Send contract to client',
  },
  {
    id: 'generate-invoice',
    label: 'Generate Invoice',
    icon: <ReceiptIcon />,
    color: 'secondary',
    category: 'primary',
    onClick: () => onAction('generate-invoice', eventId),
    tooltip: 'Create and send invoice',
  },
  {
    id: 'send-message',
    label: 'Send Email',
    icon: <EmailIcon />,
    category: 'primary',
    onClick: () => onAction('send-message', eventId),
    tooltip: 'Send email to client',
  },
  {
    id: 'create-quote',
    label: 'Create Quote',
    icon: <QuoteIcon />,
    category: 'secondary',
    onClick: () => onAction('create-quote', eventId),
  },
  {
    id: 'add-note',
    label: 'Add Note',
    icon: <NoteIcon />,
    category: 'secondary',
    onClick: () => onAction('add-note', eventId),
  },
  {
    id: 'schedule-followup',
    label: 'Schedule Follow-up',
    icon: <ScheduleIcon />,
    category: 'tertiary',
    onClick: () => onAction('schedule-followup', eventId),
  },
  {
    id: 'flag-important',
    label: 'Flag Important',
    icon: <FlagIcon />,
    category: 'tertiary',
    onClick: () => onAction('flag-important', eventId),
  },
];

export const createClientActions = (
  clientId: number,
  onAction: (actionType: string, clientId: number) => void,
  clientPhone?: string,
): QuickAction[] => {
  const actions: QuickAction[] = [
    {
      id: 'create-event',
      label: 'Create Event',
      icon: <AddIcon />,
      color: 'primary',
      category: 'primary',
      onClick: () => onAction('create-event', clientId),
      tooltip: 'Create new event for this client',
    },
    {
      id: 'send-message',
      label: 'Send Email',
      icon: <EmailIcon />,
      category: 'primary',
      onClick: () => onAction('send-message', clientId),
      tooltip: 'Send email to client',
    },
  ];

  // Only add call client if phone number is available
  if (clientPhone) {
    actions.push({
      id: 'call-client',
      label: 'Call Client',
      icon: <PhoneIcon />,
      category: 'primary',
      onClick: () => onAction('call-client', clientId),
      tooltip: `Call ${clientPhone}`,
    });
  }

  actions.push(
    {
      id: 'create-invoice',
      label: 'Create Invoice',
      icon: <ReceiptIcon />,
      color: 'secondary',
      category: 'secondary',
      onClick: () => onAction('create-invoice', clientId),
      tooltip: 'Create invoice for this client',
    },
    {
      id: 'add-note',
      label: 'Add Note',
      icon: <NoteIcon />,
      category: 'tertiary',
      onClick: () => onAction('add-note', clientId),
    },
  );

  return actions;
};

export const createPaymentActions = (
  paymentId: number,
  status: string,
  onAction: (actionType: string, paymentId: number) => void,
): QuickAction[] => {
  const actions: QuickAction[] = [
    {
      id: 'send-reminder',
      label: 'Send Reminder',
      icon: <NotificationIcon />,
      color: 'warning',
      category: 'primary',
      onClick: () => onAction('send-reminder', paymentId),
      tooltip: 'Send payment reminder to client',
    },
  ];

  if (status === 'PENDING') {
    actions.push({
      id: 'process-payment',
      label: 'Process Payment',
      icon: <PaymentIcon />,
      color: 'primary',
      category: 'primary',
      onClick: () => onAction('process-payment', paymentId),
      tooltip: 'Process payment now',
    });
  }

  if (status === 'COMPLETED') {
    actions.push({
      id: 'send-receipt',
      label: 'Send Receipt',
      icon: <ReceiptIcon />,
      color: 'success',
      category: 'primary',
      onClick: () => onAction('send-receipt', paymentId),
      tooltip: 'Send payment receipt',
    });
  }

  actions.push(
    {
      id: 'create-refund',
      label: 'Create Refund',
      icon: <MoneyIcon />,
      color: 'error',
      category: 'secondary',
      onClick: () => onAction('create-refund', paymentId),
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to create a refund for this payment?',
    },
    {
      id: 'add-note',
      label: 'Add Note',
      icon: <NoteIcon />,
      category: 'tertiary',
      onClick: () => onAction('add-note', paymentId),
    },
  );

  return actions;
};
