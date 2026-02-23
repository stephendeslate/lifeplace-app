// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowCard.tsx

import React, { useState, useRef } from 'react';
import {
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  LinearProgress,
  Avatar,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as PreviewIcon,
  EventNote as FlowIcon,
  Event as EventIcon,
  Analytics as AnalyticsIcon,
  Science as TestIcon,
  Schedule as TimeIcon,
  People as GuestsIcon,
  Settings as SettingsIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { BookingFlow } from '../../../types/bookingflows.types';
import { getEventTypeDisplayName } from '../../../utils/bookingFlowUtils';

interface BookingFlowCardProps {
  flow: BookingFlow;
  onEdit: (flow: BookingFlow) => void;
  onPreview: (flow: BookingFlow) => void;
  onDuplicate: (flow: BookingFlow) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

export const BookingFlowCard: React.FC<BookingFlowCardProps> = ({
  flow,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  isDeleting = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Ref for the menu button to restore focus
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // Restore focus to the menu button after menu closes
    setTimeout(() => {
      menuButtonRef.current?.focus();
    }, 100);
  };

  const handleEdit = () => {
    onEdit(flow);
    handleMenuCloseWithoutFocus();
  };

  const handlePreview = () => {
    onPreview(flow);
    handleMenuCloseWithoutFocus();
  };

  const handleDuplicate = () => {
    onDuplicate(flow);
    handleMenuCloseWithoutFocus();
  };

  const handleDelete = () => {
    onDelete(flow.id);
    handleMenuCloseWithoutFocus();
  };

  const handleMenuCloseWithoutFocus = () => {
    setMenuAnchor(null);
    // Don't restore focus when navigating away or opening dialogs
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview(flow);
  };

  const handleAnalyticsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to analytics - would be handled by parent
  };

  const getStatusColor = () => {
    if (flow.is_test_mode) return 'warning';
    if (flow.is_active) return 'success';
    return 'default';
  };

  const getStatusLabel = () => {
    if (flow.is_test_mode) return 'Test Mode';
    if (flow.is_active) return 'Active';
    return 'Inactive';
  };

  const completionPercentage =
    flow.total_steps > 0 ? Math.round((flow.enabled_steps_count / flow.total_steps) * 100) : 0;

  // UPDATED: Enhanced configuration status checking
  const getConfigurationStatus = () => {
    const hasSteps = flow.total_steps > 0;
    const hasEnabledSteps = flow.enabled_steps_count > 0;
    const hasPaymentGateways =
      flow.allowed_payment_gateways && flow.allowed_payment_gateways.length > 0;

    // Count configuration issues
    let issues = 0;
    const warnings = [];

    if (!hasSteps) {
      issues++;
      warnings.push('No steps configured');
    }

    if (!hasEnabledSteps && hasSteps) {
      issues++;
      warnings.push('No steps enabled');
    }

    if (flow.require_immediate_payment && !hasPaymentGateways && !flow.default_payment_gateway) {
      issues++;
      warnings.push('Payment required but no payment gateways configured');
    }

    return {
      isComplete: issues === 0 && hasEnabledSteps,
      hasIssues: issues > 0,
      warnings,
      issueCount: issues,
    };
  };

  const configStatus = getConfigurationStatus();

  // UPDATED: Enhanced event type display with proper null handling using utilities
  const getEventTypeDisplay = () => {
    return getEventTypeDisplayName(flow);
  };

  // NEW: Payment configuration indicator
  const getPaymentConfigChip = () => {
    if (!flow.require_immediate_payment) {
      return null;
    }

    const hasGateways =
      (flow.allowed_payment_gateways && flow.allowed_payment_gateways.length > 0) ||
      flow.default_payment_gateway;

    return (
      <Chip
        icon={<PaymentIcon />}
        label={hasGateways ? 'Payment Ready' : 'Payment Required'}
        size="small"
        color={hasGateways ? 'success' : 'warning'}
        variant="outlined"
      />
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        cursor: 'pointer',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
      onClick={() => onEdit(flow)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(flow);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Edit booking flow: ${flow.name}`}
    >
      <Box
        sx={{
          borderRadius: 1,
          bgcolor: 'background.paper',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...(configStatus.hasIssues && {
            border: '2px solid',
            borderColor: 'warning.main',
          }),
        }}
      >
        {/* Header */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Badge
                badgeContent={configStatus.hasIssues ? configStatus.issueCount : 0}
                color="warning"
                variant="dot"
                invisible={!configStatus.hasIssues}
              >
                <Avatar
                  sx={{
                    bgcolor: configStatus.isComplete
                      ? 'success.main'
                      : configStatus.hasIssues
                        ? 'warning.main'
                        : 'primary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  {configStatus.isComplete ? (
                    <CheckCircleIcon fontSize="small" />
                  ) : configStatus.hasIssues ? (
                    <WarningIcon fontSize="small" />
                  ) : (
                    <FlowIcon fontSize="small" />
                  )}
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="h6" component="div" noWrap>
                  {flow.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {flow.id}
                </Typography>
              </Box>
            </Box>

            <IconButton
              ref={menuButtonRef}
              size="small"
              onClick={handleMenuOpen}
              disabled={isDeleting}
              aria-label={`More actions for ${flow.name}`}
              sx={{
                // Ensure button is visible to screen readers
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Description */}
          {flow.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: '2.5em',
              }}
            >
              {flow.description}
            </Typography>
          )}

          {/* UPDATED: Configuration warnings */}
          {configStatus.hasIssues && (
            <Box mb={2}>
              <Chip
                icon={<WarningIcon />}
                label={`${configStatus.issueCount} Configuration Issue${configStatus.issueCount > 1 ? 's' : ''}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="warning.main" display="block">
                {configStatus.warnings.join(', ')}
              </Typography>
            </Box>
          )}

          {/* Status and Event Type */}
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            <Chip
              label={getStatusLabel()}
              size="small"
              color={getStatusColor()}
              variant={flow.is_active ? 'filled' : 'outlined'}
              icon={flow.is_test_mode ? <TestIcon /> : undefined}
            />

            <Chip
              icon={<EventIcon />}
              label={getEventTypeDisplay()}
              size="small"
              color={flow.event_type ? 'primary' : 'default'}
              variant="outlined"
            />

            {flow.allow_guest_booking && (
              <Chip
                icon={<GuestsIcon />}
                label="Guest Booking"
                size="small"
                variant="outlined"
                color="info"
              />
            )}

            {/* NEW: Payment configuration chip */}
            {getPaymentConfigChip()}
          </Box>

          {/* Steps Progress */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Steps Configuration
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {flow.enabled_steps_count}/{flow.total_steps} enabled
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor:
                    completionPercentage === 100
                      ? 'success.main'
                      : configStatus.hasIssues
                        ? 'warning.main'
                        : 'primary.main',
                },
              }}
              aria-label={`Configuration progress: ${completionPercentage}%`}
            />
            <Typography variant="caption" color="text.secondary">
              {completionPercentage}% configured
            </Typography>
          </Box>

          {/* UPDATED: Enhanced booking settings with new fields */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Tooltip
                title={`Booking window: ${flow.min_advance_booking_days}-${flow.max_advance_booking_days} days`}
              >
                <Box display="flex" alignItems="center" gap={0.5}>
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {flow.min_advance_booking_days}-{flow.max_advance_booking_days} days
                  </Typography>
                </Box>
              </Tooltip>

              {/* NEW: Payment requirement indicator */}
              {flow.require_immediate_payment && (
                <Tooltip title="Requires immediate payment">
                  <PaymentIcon fontSize="small" color="primary" />
                </Tooltip>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary">
              Updated {new Date(flow.updated_at).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button
            size="small"
            startIcon={<PreviewIcon />}
            onClick={handlePreviewClick}
            aria-label={`Preview ${flow.name}`}
          >
            Preview
          </Button>

          <Button
            size="small"
            startIcon={<AnalyticsIcon />}
            onClick={handleAnalyticsClick}
            aria-label={`View analytics for ${flow.name}`}
          >
            Analytics
          </Button>

          {/* NEW: Configuration status indicator */}
          {configStatus.hasIssues && (
            <Tooltip title={`Configuration issues: ${configStatus.warnings.join(', ')}`}>
              <Button
                size="small"
                startIcon={<SettingsIcon />}
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(flow);
                }}
                aria-label={`Fix configuration issues for ${flow.name}`}
              >
                Fix Issues
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          // Enhanced accessibility
          MenuListProps={{
            'aria-labelledby': menuButtonRef.current?.id,
            role: 'menu',
          }}
        >
          <MenuItem onClick={handleEdit} role="menuitem">
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Flow</ListItemText>
          </MenuItem>

          <MenuItem onClick={handlePreview} role="menuitem">
            <ListItemIcon>
              <PreviewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Preview Flow</ListItemText>
          </MenuItem>

          <MenuItem onClick={handleDuplicate} role="menuitem">
            <ListItemIcon>
              <DuplicateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate Flow</ListItemText>
          </MenuItem>

          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }} role="menuitem">
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Flow</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};
