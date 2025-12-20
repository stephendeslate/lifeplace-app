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
} from '@mui/icons-material';
import { TaskCard } from './TaskCard';
import { ModernEmptyState } from '../common/ModernEmptyState';
import type { Task, TaskDomain } from '../../types/tasks.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface TaskSectionProps {
  domain: TaskDomain;
  tasks: Task[];
  defaultExpanded?: boolean;
  onSendQuote?: (id: number) => void;
  onSendContractReminder?: (id: number) => void;
  onRecordPayment?: (id: number) => void;
  onRetryCommunication?: (id: string) => void;
}

const domainConfig: Record<TaskDomain, { label: string; icon: React.ElementType; color: string; emptyTitle: string; emptyDescription: string }> = {
  quotes: {
    label: 'Quotes',
    icon: RequestQuote,
    color: tokens.color.info[500],
    emptyTitle: 'No Pending Quotes',
    emptyDescription: 'All quotes have been sent and processed. New quotes requiring attention will appear here.',
  },
  contracts: {
    label: 'Contracts',
    icon: Description,
    color: tokens.color.warning[500],
    emptyTitle: 'No Pending Contracts',
    emptyDescription: 'All contracts have been signed. Contracts awaiting signatures will appear here.',
  },
  payments: {
    label: 'Payments',
    icon: Payment,
    color: tokens.color.success[500],
    emptyTitle: 'No Pending Payments',
    emptyDescription: 'All payments are up to date. Pending or failed payments will appear here.',
  },
  communications: {
    label: 'Communications',
    icon: Email,
    color: tokens.color.secondary[500],
    emptyTitle: 'No Pending Communications',
    emptyDescription: 'All messages have been delivered. Failed or pending messages will appear here.',
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
        ...glassPresets.light,
        borderRadius: tokens.spacing.radius.xxl,
        border: `1px solid ${tokens.color.borders.glass}`,
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
          transition: createTransition(['background'], 'fast'),

          '&:hover': {
            backgroundColor: `${config.color}05`,
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              ...glassPresets.medium,
              borderRadius: tokens.spacing.radius.lg,
              p: 1.5,
              background: `${config.color}15`,
              border: `1px solid ${config.color}30`,
            }}
          >
            <Icon sx={{ fontSize: 20, color: config.color }} />
          </Box>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{ color: tokens.color.neutral[800] }}
          >
            {config.label}
          </Typography>
          <Chip
            label={tasks.length}
            size="small"
            sx={{
              height: 24,
              minWidth: 32,
              fontWeight: 700,
              backgroundColor: tasks.length > 0 ? `${config.color}15` : tokens.color.neutral[100],
              color: tasks.length > 0 ? config.color : tokens.color.neutral[500],
              border: `1px solid ${tasks.length > 0 ? config.color : tokens.color.neutral[300]}30`,
            }}
          />
          {urgentCount > 0 && (
            <Chip
              label={`${urgentCount} urgent`}
              size="small"
              sx={{
                height: 24,
                fontWeight: 600,
                backgroundColor: `${tokens.color.error[500]}15`,
                color: tokens.color.error[600],
                border: `1px solid ${tokens.color.error[500]}30`,
              }}
            />
          )}
        </Box>
        <IconButton
          size="small"
          sx={{
            color: tokens.color.neutral[500],
            transition: createTransition(['transform'], 'fast'),
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
              illustration="minimal"
            />
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
