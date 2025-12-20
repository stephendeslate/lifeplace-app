// frontend/admin-crm/src/components/tasks/TaskCard.tsx

import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Stack } from '@mui/material';
import {
  Send,
  Edit,
  Visibility,
  Refresh,
  Payment,
  RequestQuote,
  Description,
  Email,
  AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Task, TaskDomain } from '../../types/tasks.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface TaskCardProps {
  task: Task;
  onSendQuote?: (id: number) => void;
  onSendContractReminder?: (id: number) => void;
  onRecordPayment?: (id: number) => void;
  onRetryCommunication?: (id: string) => void;
}

const domainIcons: Record<TaskDomain, React.ElementType> = {
  quotes: RequestQuote,
  contracts: Description,
  payments: Payment,
  communications: Email,
};

const domainColors: Record<TaskDomain, string> = {
  quotes: tokens.color.info[500],
  contracts: tokens.color.warning[500],
  payments: tokens.color.success[500],
  communications: tokens.color.secondary[500],
};

const priorityColors = {
  high: tokens.color.error[500],
  medium: tokens.color.warning[500],
  low: tokens.color.success[500],
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'Just now';
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onSendQuote,
  onSendContractReminder,
  onRecordPayment,
  onRetryCommunication,
}) => {
  const navigate = useNavigate();
  const DomainIcon = domainIcons[task.domain];
  const domainColor = domainColors[task.domain];
  const priorityColor = priorityColors[task.priority];

  const handleViewEvent = () => {
    if (task.eventId) {
      navigate(`/events/${task.eventId}`);
    }
  };

  const handleViewEntity = () => {
    switch (task.domain) {
      case 'quotes':
        if (task.eventId) navigate(`/events/${task.eventId}`);
        break;
      case 'contracts':
        navigate(`/contracts/${task.entityId}`);
        break;
      case 'payments':
        navigate(`/payments/${task.entityId}`);
        break;
      case 'communications':
        navigate('/records');
        break;
    }
  };

  const renderActions = () => {
    switch (task.domain) {
      case 'quotes':
        return (
          <>
            {task.status === 'DRAFT' && onSendQuote && (
              <Tooltip title="Send Quote">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendQuote(task.entityId as number);
                  }}
                  sx={{
                    color: tokens.color.primary[600],
                    '&:hover': { backgroundColor: `${tokens.color.primary[500]}15` },
                  }}
                >
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit Quote">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.eventId) navigate(`/events/${task.eventId}`);
                }}
                sx={{
                  color: tokens.color.neutral[600],
                  '&:hover': { backgroundColor: `${tokens.color.neutral[500]}15` },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      case 'contracts':
        return (
          <>
            {onSendContractReminder && (
              <Tooltip title="Send Reminder">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendContractReminder(task.entityId as number);
                  }}
                  sx={{
                    color: tokens.color.primary[600],
                    '&:hover': { backgroundColor: `${tokens.color.primary[500]}15` },
                  }}
                >
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="View Contract">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/contracts/${task.entityId}`);
                }}
                sx={{
                  color: tokens.color.neutral[600],
                  '&:hover': { backgroundColor: `${tokens.color.neutral[500]}15` },
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      case 'payments':
        return (
          <>
            {onRecordPayment && (
              <Tooltip title="Record Payment">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordPayment(task.entityId as number);
                  }}
                  sx={{
                    color: tokens.color.success[600],
                    '&:hover': { backgroundColor: `${tokens.color.success[500]}15` },
                  }}
                >
                  <Payment fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="View Payment">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/payments/${task.entityId}`);
                }}
                sx={{
                  color: tokens.color.neutral[600],
                  '&:hover': { backgroundColor: `${tokens.color.neutral[500]}15` },
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      case 'communications':
        return (
          <>
            {task.status === 'FAILED' && onRetryCommunication && (
              <Tooltip title="Retry Send">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryCommunication(task.entityId as string);
                  }}
                  sx={{
                    color: tokens.color.warning[600],
                    '&:hover': { backgroundColor: `${tokens.color.warning[500]}15` },
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/records');
                }}
                sx={{
                  color: tokens.color.neutral[600],
                  '&:hover': { backgroundColor: `${tokens.color.neutral[500]}15` },
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      onClick={handleViewEntity}
      sx={{
        ...glassPresets.light,
        borderRadius: tokens.spacing.radius.xl,
        p: 3,
        border: `1px solid ${domainColor}20`,
        borderLeft: `4px solid ${domainColor}`,
        cursor: 'pointer',
        transition: createTransition(['transform', 'box-shadow', 'border-color'], 'fast'),

        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: tokens.shadow.glass.medium,
          borderColor: `${domainColor}40`,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        {/* Left Content */}
        <Box display="flex" gap={2} flex={1} minWidth={0}>
          {/* Icon */}
          <Box
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.lg,
              p: 1.5,
              background: `${domainColor}10`,
              flexShrink: 0,
            }}
          >
            <DomainIcon sx={{ fontSize: 20, color: domainColor }} />
          </Box>

          {/* Content */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  color: tokens.color.neutral[800],
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.title}
              </Typography>
              <Chip
                label={task.type}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: `${domainColor}15`,
                  color: domainColor,
                  border: `1px solid ${domainColor}30`,
                }}
              />
              {task.priority === 'high' && (
                <Chip
                  label="Urgent"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: `${priorityColor}15`,
                    color: priorityColor,
                    border: `1px solid ${priorityColor}30`,
                  }}
                />
              )}
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: tokens.color.neutral[600],
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.description}
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              {task.clientName && (
                <Typography variant="caption" sx={{ color: tokens.color.neutral[500] }}>
                  {task.clientName}
                </Typography>
              )}
              {task.amount && (
                <Chip
                  label={`${task.domain === 'payments' ? '' : 'Value: '}${task.amount}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: tokens.color.success[50],
                    color: tokens.color.success[700],
                  }}
                />
              )}
              <Box display="flex" alignItems="center" gap={0.5}>
                <AccessTime sx={{ fontSize: 12, color: tokens.color.neutral[400] }} />
                <Typography variant="caption" sx={{ color: tokens.color.neutral[500] }}>
                  {formatTimeAgo(task.createdAt)}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={0.5} flexShrink={0}>
          {renderActions()}
          {task.eventId && (
            <Tooltip title="View Event">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewEvent();
                }}
                sx={{
                  color: tokens.color.primary[600],
                  '&:hover': { backgroundColor: `${tokens.color.primary[500]}15` },
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
