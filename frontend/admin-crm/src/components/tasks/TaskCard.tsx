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
  SupportAgent,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../design-system';
import type { Task, TaskDomain } from '../../types/tasks.types';

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
  support: SupportAgent,
};

const domainColors: Record<TaskDomain, 'info' | 'warning' | 'success' | 'secondary' | 'error'> = {
  quotes: 'info',
  contracts: 'warning',
  payments: 'success',
  communications: 'secondary',
  support: 'error',
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
      case 'support':
        navigate(`/support/${task.entityId}`);
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
                  color="primary"
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
                  color="primary"
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
                  color="success"
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
                  color="warning"
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
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      case 'support':
        return (
          <Tooltip title="View Inquiry">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/support/${task.entityId}`);
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      onClick={handleViewEntity}
      sx={{
        borderRadius: tokens.spacing.radius.md,
        p: 3,
        border: 1,
        borderColor: 'divider',
        borderLeft: 4,
        borderLeftColor: `${domainColor}.main`,
        cursor: 'pointer',
        bgcolor: 'grey.50',
        '&:hover': {
          borderColor: `${domainColor}.light`,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        {/* Left Content */}
        <Box display="flex" gap={2} flex={1} minWidth={0}>
          {/* Icon */}
          <Box
            sx={{
              borderRadius: tokens.spacing.radius.md,
              p: 1.5,
              bgcolor: `${domainColor}.50`,
              flexShrink: 0,
            }}
          >
            <DomainIcon sx={{ fontSize: 20 }} color={domainColor} />
          </Box>

          {/* Content */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
              <Typography
                variant="subtitle1"
                fontWeight={600}
                color="text.primary"
                sx={{
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
                color={domainColor}
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              />
              {task.priority === 'high' && (
                <Chip
                  label="Urgent"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
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
                <Typography variant="caption" color="text.secondary">
                  {task.clientName}
                </Typography>
              )}
              {task.amount && (
                <Chip
                  label={`${task.domain === 'payments' ? '' : 'Value: '}${task.amount}`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                  }}
                />
              )}
              <Box display="flex" alignItems="center" gap={0.5}>
                <AccessTime sx={{ fontSize: 12 }} color="disabled" />
                <Typography variant="caption" color="text.secondary">
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
                color="primary"
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
