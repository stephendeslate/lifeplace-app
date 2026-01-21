// frontend/admin-crm/src/components/workflows/DraggableWorkflowStagesTable.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DroppableProvided,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd';
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
  Tooltip,
  Alert,
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
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import type { WorkflowStage, StageType } from '../../types/workflows.types';
import { InlineEditableText } from '../common/InlineEditableText';

export interface DraggableWorkflowStagesTableProps {
  /** Stages to display (should be pre-filtered by stage type) */
  stages: WorkflowStage[];
  /** Template ID for reorder API calls */
  templateId: number;
  /** Stage type for this table (LEAD, PRODUCTION, POST_PRODUCTION) */
  stageType: StageType;
  /** Loading state */
  isLoading: boolean;
  /** Called when edit button clicked (opens full dialog) */
  onEdit: (stage: WorkflowStage) => void;
  /** Called when stage deleted */
  onDelete: (id: number) => void;
  /** Called when manual trigger requested */
  onTrigger?: (stage: WorkflowStage) => void;
  /** Called when stages are reordered */
  onReorder: (stageType: StageType, orderMapping: Record<string, number>) => Promise<void>;
  /** Called when inline edit saves (name or description) */
  onInlineUpdate: (id: number, data: Partial<WorkflowStage>) => Promise<void>;
  /** Deleting state */
  isDeleting: boolean;
  /** Updating state */
  isUpdating?: boolean;
  /** Reordering state */
  isReordering?: boolean;
}

export const DraggableWorkflowStagesTable: React.FC<DraggableWorkflowStagesTableProps> = ({
  stages,
  templateId,
  stageType,
  isLoading,
  onEdit,
  onDelete,
  onTrigger,
  onReorder,
  onInlineUpdate,
  isDeleting,
  isUpdating = false,
  isReordering = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [hasReorderChanges, setHasReorderChanges] = useState(false);

  // Sort stages by order
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.order - b.order);
  }, [stages]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, stage: WorkflowStage) => {
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
      onEdit(selectedStage);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedStage) {
      onDelete(selectedStage.id);
    }
    handleMenuClose();
  };

  const handleTrigger = () => {
    if (selectedStage && onTrigger) {
      onTrigger(selectedStage);
    }
    handleMenuClose();
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    // Create new order from drag result
    const reorderedStages = Array.from(sortedStages);
    const [removed] = reorderedStages.splice(result.source.index, 1);
    reorderedStages.splice(result.destination.index, 0, removed);

    // Build order mapping
    const orderMapping: Record<string, number> = {};
    reorderedStages.forEach((stage, index) => {
      orderMapping[stage.id.toString()] = index + 1;
    });

    setHasReorderChanges(true);

    try {
      await onReorder(stageType, orderMapping);
    } finally {
      setHasReorderChanges(false);
    }
  }, [sortedStages, stageType, onReorder]);

  const handleInlineSave = useCallback(async (stageId: number, field: 'name' | 'task_description', value: string) => {
    await onInlineUpdate(stageId, { [field]: value });
  }, [onInlineUpdate]);

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

  const getAutomationChip = (isAutomated: boolean, automationType?: string, stage?: WorkflowStage) => {
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
        title={label}
      />
    );
  };

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(3)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="5%" />
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
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
        py={4}
        textAlign="center"
      >
        <Typography variant="body1" color="text.secondary">
          No {stageType.toLowerCase().replace('_', ' ')} stages configured
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add stages to define the workflow process
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {hasReorderChanges && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Saving order changes...
        </Alert>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`stages-${stageType}-${templateId}`}>
          {(provided: DroppableProvided, snapshot) => (
            <TableContainer
              component={Paper}
              elevation={0}
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                transition: 'background-color 0.2s ease',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="40px" sx={{ pl: 1 }}></TableCell>
                    <TableCell width="60px">Order</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Stage Name</TableCell>
                    <TableCell>Automation</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>Description</TableCell>
                    <TableCell align="right" width="60px">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedStages.map((stage, index) => (
                    <Draggable
                      key={stage.id}
                      draggableId={stage.id.toString()}
                      index={index}
                      isDragDisabled={isReordering || isDeleting || isUpdating}
                    >
                      {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                        <TableRow
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          hover
                          sx={{
                            backgroundColor: dragSnapshot.isDragging
                              ? 'primary.50'
                              : 'background.paper',
                            boxShadow: dragSnapshot.isDragging ? 4 : 0,
                            transform: dragSnapshot.isDragging
                              ? `${dragProvided.draggableProps.style?.transform} rotate(1deg)`
                              : dragProvided.draggableProps.style?.transform,
                            transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
                            ...dragProvided.draggableProps.style,
                          }}
                        >
                          {/* Drag Handle */}
                          <TableCell
                            {...dragProvided.dragHandleProps}
                            sx={{
                              cursor: isReordering ? 'not-allowed' : 'grab',
                              pl: 1,
                              '&:active': { cursor: 'grabbing' },
                            }}
                          >
                            <Tooltip title="Drag to reorder">
                              <DragIcon
                                color={isReordering ? 'disabled' : 'action'}
                                fontSize="small"
                              />
                            </Tooltip>
                          </TableCell>

                          {/* Order */}
                          <TableCell align="center">
                            <Chip
                              label={stage.order}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          </TableCell>

                          {/* Stage Name - Inline Editable */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <InlineEditableText
                              value={stage.name}
                              onSave={(name) => handleInlineSave(stage.id, 'name', name)}
                              required
                              placeholder="Enter stage name"
                              variant="body2"
                              disabled={isUpdating || isDeleting}
                              data-testid={`stage-name-${stage.id}`}
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>

                          {/* Automation */}
                          <TableCell>
                            {getAutomationChip(stage.is_automated, stage.automation_type, stage)}
                          </TableCell>

                          {/* Description - Inline Editable */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <InlineEditableText
                              value={stage.task_description || ''}
                              onSave={(desc) => handleInlineSave(stage.id, 'task_description', desc)}
                              placeholder="No description"
                              multiline
                              variant="body2"
                              disabled={isUpdating || isDeleting}
                              data-testid={`stage-desc-${stage.id}`}
                              sx={{
                                color: stage.task_description ? 'text.primary' : 'text.secondary',
                                maxWidth: 300,
                              }}
                            />
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, stage)}
                              disabled={isDeleting || isUpdating}
                            >
                              {isDeleting && selectedStage?.id === stage.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <MoreVertIcon fontSize="small" />
                              )}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Droppable>
      </DragDropContext>

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

        {onTrigger && selectedStage?.is_automated && (
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

export default DraggableWorkflowStagesTable;
