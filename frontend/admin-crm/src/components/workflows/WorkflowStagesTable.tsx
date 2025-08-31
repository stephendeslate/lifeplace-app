// frontend/admin-crm/src/components/workflows/WorkflowStagesTable.tsx

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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Task as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Notifications as NotificationIcon,
  Handyman as ManualIcon,
} from '@mui/icons-material';
import type { WorkflowStage, WorkflowStageTableProps } from '../../types/workflows.types';

export const WorkflowStagesTable: React.FC<WorkflowStageTableProps> = ({
  stages,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStage, setSelectedStage] = useState<Record<string, unknown> | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, stage: Record<string, unknown>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedStage(stage);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedStage(null);
  };

  const handleEdit = () => {
    if (selectedStage) {
      onEdit(selectedStage as unknown as WorkflowStage);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedStage) {
      onDelete((selectedStage as unknown as WorkflowStage).id);
    }
    handleMenuClose();
  };

  const getStageChip = (stage: string, stageDisplay: string) => {
    const colors = {
      LEAD: 'primary',
      PRODUCTION: 'warning',
      POST_PRODUCTION: 'success',
    } as const;

    return (
      <Chip
        label={stageDisplay}
        size="small"
        color={colors[stage as keyof typeof colors] || 'default'}
        variant="outlined"
      />
    );
  };

  const getAutomationIcon = (automationType: string) => {
    const icons = {
      EMAIL: <EmailIcon fontSize="small" />,
      TASK: <TaskIcon fontSize="small" />,
      QUOTE: <QuoteIcon fontSize="small" />,
      CONTRACT: <ContractIcon fontSize="small" />,
      REMINDER: <ScheduleIcon fontSize="small" />,
      NOTIFICATION: <NotificationIcon fontSize="small" />,
    };

    return icons[automationType as keyof typeof icons] || <TaskIcon fontSize="small" />;
  };

  const getAutomationChip = (isAutomated: boolean, automationType?: string) => {
    if (!isAutomated) {
      return (
        <Chip
          icon={<ManualIcon />}
          label="Manual"
          size="small"
          variant="outlined"
          color="default"
        />
      );
    }

    return (
      <Chip
        icon={getAutomationIcon(automationType || '')}
        label={automationType || 'Automated'}
        size="small"
        color="secondary"
        variant="outlined"
      />
    );
  };

  const getTriggerTimeDisplay = (triggerTime: string) => {
    const triggerMap: Record<string, string> = {
      'ON_CREATION': 'Immediately',
      'AFTER_1_HOUR': 'After 1 Hour',
      'AFTER_3_HOURS': 'After 3 Hours',
      'AFTER_6_HOURS': 'After 6 Hours',
      'AFTER_12_HOURS': 'After 12 Hours',
      'AFTER_1_DAY': 'After 1 Day',
      'AFTER_2_DAYS': 'After 2 Days',
      'AFTER_3_DAYS': 'After 3 Days',
      'AFTER_1_WEEK': 'After 1 Week',
      'AFTER_2_WEEKS': 'After 2 Weeks',
    };

    return triggerMap[triggerTime] || triggerTime;
  };

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(3)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
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

  if (stages.length === 0) {
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
          No stages configured
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add stages to define the workflow process
        </Typography>
      </Box>
    );
  }

  // Group stages by type
  const stagesByType = stages.reduce((acc, stage) => {
    if (!acc[stage.stage]) {
      acc[stage.stage] = [];
    }
    acc[stage.stage].push(stage);
    return acc;
  }, {} as Record<string, typeof stages>);

  // Sort stages within each type by order
  Object.keys(stagesByType).forEach(type => {
    stagesByType[type].sort((a, b) => a.order - b.order);
  });

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="30px"></TableCell>
              <TableCell>
                <TableSortLabel>
                  Stage Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Automation</TableCell>
              <TableCell>Trigger</TableCell>
              <TableCell align="center">Order</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(stagesByType).map(([stageType, stageList]) => (
              <React.Fragment key={stageType}>
                {/* Stage Type Header */}
                <TableRow>
                  <TableCell colSpan={8} sx={{ bgcolor: 'grey.50', fontWeight: 'bold' }}>
                    <Typography variant="subtitle2" color="primary">
                      {stageType.replace('_', ' ')} STAGES
                    </Typography>
                  </TableCell>
                </TableRow>
                
                {/* Stages in this type */}
                {stageList.map((stage) => (
                  <TableRow 
                    key={stage.id} 
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onEdit(stage)}
                  >
                    <TableCell>
                      {stage.order}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {stage.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStageChip(stage.stage, stage.stage_display)}
                    </TableCell>
                    <TableCell>
                      {getAutomationChip(stage.is_automated, stage.automation_type)}
                    </TableCell>
                    <TableCell>
                      {stage.is_automated && stage.trigger_time ? (
                        <Typography variant="caption" color="text.secondary">
                          {getTriggerTimeDisplay(stage.trigger_time)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={stage.order}
                        size="small"
                        variant="outlined"
                        color="default"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {stage.task_description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, stage as unknown as Record<string, unknown>)}
                        disabled={isDeleting}
                      >
                        {isDeleting && selectedStage?.id === stage.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <MoreVertIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
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
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Stage</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Stage</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};