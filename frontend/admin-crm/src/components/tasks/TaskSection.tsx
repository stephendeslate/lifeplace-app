// frontend/admin-crm/src/components/tasks/TaskSection.tsx

import React, { useState } from 'react';
import { Box, Typography, Chip, Collapse, IconButton, Stack } from '@mui/material';
import {
  ExpandMore,
  RequestQuote,
  Description,
  Payment,
  Email,
  CheckCircle,
  SupportAgent,
} from '@mui/icons-material';
import { TaskCard } from './TaskCard';
import { ModernEmptyState } from '../common/ModernEmptyState';
import { tokens } from '../../design-system';
import type { Task, TaskDomain } from '../../types/tasks.types';

interface TaskSectionProps {
  domain: TaskDomain;
  tasks: Task[];
  defaultExpanded?: boolean;
  onSendQuote?: (id: number) => void;
  onSendContractReminder?: (id: number) => void;
  onRecordPayment?: (id: number) => void;
  onRetryCommunication?: (id: string) => void;
}

const domainConfig: Record<TaskDomain, { label: string; icon: React.ElementType; color: 'info' | 'warning' | 'success' | 'secondary' | 'error'; emptyTitle: string; emptyDescription: string }> = {
  quotes: {
    label: 'Quotes',
    icon: RequestQuote,
    color: 'info',
    emptyTitle: 'No Pending Quotes',
    emptyDescription: 'All quotes have been sent and processed. New quotes requiring attention will appear here.',
  },
  contracts: {
    label: 'Contracts',
    icon: Description,
    color: 'warning',
    emptyTitle: 'No Pending Contracts',
    emptyDescription: 'All contracts have been signed. Contracts awaiting signatures will appear here.',
  },
  payments: {
    label: 'Payments',
    icon: Payment,
    color: 'success',
    emptyTitle: 'No Pending Payments',
    emptyDescription: 'All payments are up to date. Pending or failed payments will appear here.',
  },
  communications: {
    label: 'Communications',
    icon: Email,
    color: 'secondary',
    emptyTitle: 'No Pending Communications',
    emptyDescription: 'All messages have been delivered. Failed or pending messages will appear here.',
  },
  support: {
    label: 'Support',
    icon: SupportAgent,
    color: 'error',
    emptyTitle: 'No Open Support Inquiries',
    emptyDescription: 'All support inquiries have been resolved. New inquiries will appear here.',
  },
};

export const TaskSection: React.FC<TaskSectionProps> = ({
  domain,
  tasks,
  defaultExpanded = true,
  onSendQuote,
  onSendContractReminder,
  onRecordPayment,
  onRetryCommunication,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = domainConfig[domain];
  const Icon = config.icon;

  const urgentCount = tasks.filter(t => t.priority === 'high').length;

  return (
    <Box
      sx={{
        borderRadius: tokens.spacing.radius.md,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              borderRadius: tokens.spacing.radius.md,
              p: 1.5,
              bgcolor: `${config.color}.50`,
            }}
          >
            <Icon sx={{ fontSize: 20 }} color={config.color} />
          </Box>
          <Typography
            variant="h6"
            fontWeight={600}
            color="text.primary"
          >
            {config.label}
          </Typography>
          <Chip
            label={tasks.length}
            size="small"
            color={tasks.length > 0 ? config.color : 'default'}
            variant="outlined"
            sx={{
              height: 24,
              minWidth: 32,
              fontWeight: 700,
            }}
          />
          {urgentCount > 0 && (
            <Chip
              label={`${urgentCount} urgent`}
              size="small"
              color="error"
              variant="outlined"
              sx={{
                height: 24,
                fontWeight: 600,
              }}
            />
          )}
        </Box>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <ExpandMore />
        </IconButton>
      </Box>

      {/* Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 3, pt: 0 }}>
          {tasks.length > 0 ? (
            <Stack spacing={2}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onSendQuote={onSendQuote}
                  onSendContractReminder={onSendContractReminder}
                  onRecordPayment={onRecordPayment}
                  onRetryCommunication={onRetryCommunication}
                />
              ))}
            </Stack>
          ) : (
            <ModernEmptyState
              icon={CheckCircle}
              title={config.emptyTitle}
              description={config.emptyDescription}
              size="small"
            />
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
