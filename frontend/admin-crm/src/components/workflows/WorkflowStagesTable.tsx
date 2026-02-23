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
  Quiz as QuestionnaireIcon,
  Notifications as NotificationIcon,
  Handyman as ManualIcon,
  PlayArrow as TriggerIcon,
} from '@mui/icons-material';
import type { WorkflowStage, WorkflowStageTableProps } from '../../types/workflows.types';

export const WorkflowStagesTable: React.FC<WorkflowStageTableProps> = ({
  stages,
  isLoading,
  onEdit,
  onDelete,
  onTrigger,
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

  const handleTrigger = () => {
    if (selectedStage && onTrigger) {
      onTrigger(selectedStage as unknown as WorkflowStage);
    }
    handleMenuClose();
  };

  const getAutomationIcon = (automationType: string) => {
    const icons = {
      EMAIL: <EmailIcon fontSize="small" />,
      TASK: <TaskIcon fontSize="small" />,
      QUOTE: <QuoteIcon fontSize="small" />,
      CONTRACT: <ContractIcon fontSize="small" />,
      QUESTIONNAIRE: <QuestionnaireIcon fontSize="small" />,
      REMINDER: <ScheduleIcon fontSize="small" />,
      NOTIFICATION: <NotificationIcon fontSize="small" />,
    };

    return icons[automationType as keyof typeof icons] || <TaskIcon fontSize="small" />;
  };

  const getAutomationChip = (
    isAutomated: boolean,
    automationType?: string,
    stage?: WorkflowStage,
  ) => {
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

    let label = automationType || 'Automated';

    // Add template info for EMAIL, CONTRACT, and QUESTIONNAIRE automation
    if (automationType === 'EMAIL' && stage?.email_template_name) {
      label = `Email: ${stage.email_template_name}`;
    } else if (automationType === 'CONTRACT' && stage?.contract_template_name) {
      label = `Contract: ${stage.contract_template_name}`;
    } else if (automationType === 'QUESTIONNAIRE' && stage?.questionnaire_template_name) {
      label = `Questionnaire: ${stage.questionnaire_template_name}`;
    }

    const colors = {
      EMAIL: 'primary',
      TASK: 'secondary',
      QUOTE: 'warning',
      CONTRACT: 'success',
      QUESTIONNAIRE: 'info',
      REMINDER: 'info',
      NOTIFICATION: 'default',
    } as const;

    return (
      <Chip
        icon={getAutomationIcon(automationType || '')}
        label={label}
        size="small"
        color={colors[automationType as keyof typeof colors] || 'secondary'}
        variant="outlined"
        sx={{ maxWidth: 250 }}
        title={label} // Tooltip for long text
      />
    );
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

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="60px">Order</TableCell>
              <TableCell>Stage Name</TableCell>
              <TableCell>Automation</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStages.map((stage) => (
              <TableRow
                key={stage.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(stage)}
              >
                <TableCell align="center">
                  <Chip label={stage.order} size="small" variant="outlined" color="default" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {stage.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {getAutomationChip(stage.is_automated, stage.automation_type, stage)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
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
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Stage</ListItemText>
        </MenuItem>

        {onTrigger && (selectedStage as unknown as WorkflowStage)?.is_automated && (
          <MenuItem onClick={handleTrigger}>
            <ListItemIcon>
              <TriggerIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Trigger Now</ListItemText>
          </MenuItem>
        )}

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
