// frontend/admin-crm/src/components/workflows/flowchart/nodes/StageNode.tsx

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Task as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Quiz as QuestionnaireIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Handyman as ManualIcon,
  FlashOn as TriggerIcon,
} from '@mui/icons-material';
import type { StageNodeData } from '../types';
import { getSwimlaneConfig } from '../types';
import { getTriggerTimeLabel } from '../../../../types/workflows.types';

const getAutomationIcon = (automationType: string) => {
  const icons: Record<string, React.ReactNode> = {
    EMAIL: <EmailIcon fontSize="small" />,
    TASK: <TaskIcon fontSize="small" />,
    QUOTE: <QuoteIcon fontSize="small" />,
    CONTRACT: <ContractIcon fontSize="small" />,
    QUESTIONNAIRE: <QuestionnaireIcon fontSize="small" />,
    REMINDER: <ScheduleIcon fontSize="small" />,
    NOTIFICATION: <NotificationIcon fontSize="small" />,
  };
  return icons[automationType] || <TaskIcon fontSize="small" />;
};

const StageNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const { stage, stageType, isSelected, onEdit, onDelete, onSelect } = data as StageNodeData;
  const swimlaneConfig = getSwimlaneConfig(stageType);

  const hasEventTriggers =
    stage.trigger_on_event_created ||
    stage.trigger_on_quote_sent ||
    stage.trigger_on_quote_accepted ||
    stage.trigger_on_contract_signed ||
    stage.trigger_on_payment_received;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(stage);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(stage.id);
  };

  const handleNodeClick = () => {
    onSelect(stage.id);
  };

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: swimlaneConfig.color,
          width: 10,
          height: 10,
        }}
      />

      <Box
        onClick={handleNodeClick}
        sx={{
          width: 280,
          minHeight: 120,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          border: '2px solid',
          borderColor: selected || isSelected ? swimlaneConfig.color : 'divider',
          boxShadow: selected || isSelected ? `0 0 0 2px ${swimlaneConfig.color}40` : 1,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 2,
            borderColor: swimlaneConfig.color,
          },
        }}
      >
        {/* Header with color accent */}
        <Box
          sx={{
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: `linear-gradient(90deg, ${swimlaneConfig.color}10 0%, transparent 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} flex={1} minWidth={0}>
            {stage.is_automated ? (
              <Tooltip title={stage.automation_type}>
                <Box
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    backgroundColor: swimlaneConfig.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getAutomationIcon(stage.automation_type)}
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Manual Stage">
                <Box
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    backgroundColor: 'grey.400',
                    color: 'white',
                    display: 'flex',
                  }}
                >
                  <ManualIcon fontSize="small" />
                </Box>
              </Tooltip>
            )}
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              noWrap
              sx={{ flex: 1 }}
            >
              {stage.name}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box display="flex" gap={0.5}>
            <IconButton size="small" onClick={handleEditClick}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleDeleteClick} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            {/* Timing chip */}
            {stage.is_automated && stage.trigger_time && (
              <Chip
                label={getTriggerTimeLabel(stage.trigger_time)}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            )}

            {/* Task description */}
            {stage.task_description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {stage.task_description}
              </Typography>
            )}

            {/* Template references */}
            {stage.email_template_name && (
              <Chip
                icon={<EmailIcon />}
                label={stage.email_template_name}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            )}

            {/* Event triggers indicator */}
            {hasEventTriggers && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <TriggerIcon fontSize="small" color="info" />
                <Typography variant="caption" color="info.main">
                  Event triggers active
                </Typography>
              </Box>
            )}

            {/* Progression condition */}
            {stage.progression_condition && (
              <Chip
                label={`Auto: ${stage.progression_condition.replace('_', ' ')}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
          </Stack>
        </Box>
      </Box>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: swimlaneConfig.color,
          width: 10,
          height: 10,
        }}
      />
    </>
  );
};

export const StageNode = memo(StageNodeComponent);
