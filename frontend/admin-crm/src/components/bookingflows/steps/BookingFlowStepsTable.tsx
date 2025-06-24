// frontend/admin-crm/src/components/bookingflows/steps/BookingFlowStepsTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  TableSortLabel,
  Skeleton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Settings as ConfigIcon,
  Visibility as PreviewIcon,
  CheckCircle as EnabledIcon,
  RadioButtonUnchecked as DisabledIcon,
  Star as RequiredIcon,
  StarBorder as OptionalIcon,
  SkipNext as SkippableIcon,
} from '@mui/icons-material';
import type { BookingFlowStepTableProps, BookingFlowStep } from '../../../types/bookingflows.types';

// Updated interface to include configure action
interface UpdatedBookingFlowStepTableProps extends Omit<BookingFlowStepTableProps, 'onReorder'> {
  onConfigure: (step: BookingFlowStep) => void; // New prop for configuration
  onReorder?: (steps: BookingFlowStep[]) => void; // Make optional since reordering is separate
}

export const BookingFlowStepsTable: React.FC<UpdatedBookingFlowStepTableProps> = ({
  steps,
  isLoading,
  onEdit,
  onConfigure, // New configure handler
  onDelete,
  onReorder,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStep, setSelectedStep] = useState<BookingFlowStep | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, step: BookingFlowStep) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedStep(step);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedStep(null);
  };

  const handleEdit = () => {
    if (selectedStep) {
      onEdit(selectedStep);
    }
    handleMenuClose();
  };

  const handleConfigure = () => {
    if (selectedStep) {
      onConfigure(selectedStep);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedStep) {
      onDelete(selectedStep.id);
    }
    handleMenuClose();
  };

  const getStepTypeChip = (stepType: string, stepTypeDisplay: string) => {
    const colors = {
      introduction: 'primary',
      event_details: 'secondary',
      date_time: 'info',
      questionnaire: 'success',
      package_selection: 'warning',
      addon_selection: 'warning',
      availability_check: 'info',
      pricing_summary: 'secondary',
      contact_info: 'success',
      payment_info: 'error',
      review_booking: 'secondary',
      confirmation: 'success',
    } as const;

    return (
      <Chip
        label={stepTypeDisplay}
        size="small"
        color={colors[stepType as keyof typeof colors] || 'default'}
        variant="outlined"
      />
    );
  };

  const getStatusIcon = (step: BookingFlowStep) => {
    if (!step.is_enabled) {
      return (
        <Tooltip title="Step is disabled">
          <DisabledIcon color="disabled" fontSize="small" />
        </Tooltip>
      );
    }

    return (
      <Tooltip title="Step is enabled">
        <EnabledIcon color="success" fontSize="small" />
      </Tooltip>
    );
  };

  const getRequiredIcon = (isRequired: boolean) => {
    return isRequired ? (
      <Tooltip title="Required step">
        <RequiredIcon color="error" fontSize="small" />
      </Tooltip>
    ) : (
      <Tooltip title="Optional step">
        <OptionalIcon color="disabled" fontSize="small" />
      </Tooltip>
    );
  };

  const getBehaviorChips = (step: BookingFlowStep) => {
    const chips = [];

    if (step.is_required) {
      chips.push(
        <Chip
          key="required"
          label="Required"
          size="small"
          color="error"
          variant="outlined"
        />
      );
    }

    if (step.is_skippable) {
      chips.push(
        <Chip
          key="skippable"
          label="Skippable"
          size="small"
          color="info"
          variant="outlined"
          icon={<SkippableIcon />}
        />
      );
    }

    return chips;
  };

  const hasDisplayConditions = (step: BookingFlowStep) => {
    return step.display_conditions && Object.keys(step.display_conditions).length > 0;
  };

  const hasValidationRules = (step: BookingFlowStep) => {
    return step.validation_rules && Object.keys(step.validation_rules).length > 0;
  };

  const hasConfiguration = (step: BookingFlowStep) => {
    return step.configuration_data || (step.configuration && Object.keys(step.configuration).length > 0);
  };

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(3)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="30px" />
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="20%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (steps.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={6}
        textAlign="center"
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No steps configured
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add steps to this booking flow to guide clients through the booking process
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="30px"></TableCell>
              <TableCell width="40px">Status</TableCell>
              <TableCell>
                <TableSortLabel>
                  Step Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Order</TableCell>
              <TableCell>Behavior</TableCell>
              <TableCell>Configuration</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {steps
              .sort((a, b) => a.order - b.order)
              .map((step) => (
              <TableRow 
                key={step.id} 
                hover
                sx={{ 
                  opacity: step.is_enabled ? 1 : 0.6,
                }}
              >
                <TableCell>
                  <DragIcon color="action" fontSize="small" />
                </TableCell>
                
                <TableCell>
                  {getStatusIcon(step)}
                </TableCell>
                
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {step.name}
                    </Typography>
                    {step.description && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {step.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  {getStepTypeChip(step.step_type, step.step_type_display)}
                </TableCell>
                
                <TableCell align="center">
                  <Chip
                    label={step.order}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                </TableCell>
                
                <TableCell>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {getBehaviorChips(step)}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {hasDisplayConditions(step) && (
                      <Tooltip title="Has display conditions">
                        <Chip
                          label="Conditional"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                    
                    {hasValidationRules(step) && (
                      <Tooltip title="Has validation rules">
                        <Chip
                          label="Validated"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                    
                    {hasConfiguration(step) ? (
                      <Tooltip title="Configured">
                        <ConfigIcon fontSize="small" color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Not configured">
                        <ConfigIcon fontSize="small" color="action" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell align="right">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {/* Quick Configure Button */}
                    <Tooltip title="Configure Step">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ConfigIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfigure(step);
                        }}
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        Configure
                      </Button>
                    </Tooltip>
                    
                    {/* More Actions Menu */}
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, step)}
                      disabled={isDeleting}
                    >
                      {isDeleting && selectedStep?.id === step.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <MoreVertIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleConfigure}>
          <ListItemIcon>
            <ConfigIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Configure Step</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Properties</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          // Preview step - would be handled by parent
          handleMenuClose();
        }}>
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview Step</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Step</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};