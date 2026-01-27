// frontend/admin-crm/src/components/dashboard/TasksSummaryWidget.tsx

import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import {
  Assignment as TasksIcon,
  ArrowForward,
  RequestQuote,
  Description,
  Payment,
  Email,
  Warning,
  SupportAgent,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { tokens } from '../../design-system';
import type { TaskDomain } from '../../types/tasks.types';

const domainConfig: Record<TaskDomain, { label: string; icon: React.ElementType; color: 'info' | 'warning' | 'success' | 'secondary' | 'error' }> = {
  quotes: { label: 'Quotes', icon: RequestQuote, color: 'info' },
  contracts: { label: 'Contracts', icon: Description, color: 'warning' },
  payments: { label: 'Payments', icon: Payment, color: 'success' },
  communications: { label: 'Messages', icon: Email, color: 'secondary' },
  support: { label: 'Support', icon: SupportAgent, color: 'error' },
};

export const TasksSummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const { tasksByDomain, counts, isLoading } = useTasks();

  // Count urgent tasks (high priority)
  const urgentCount = Object.values(tasksByDomain)
    .flat()
    .filter((t) => t.priority === 'high').length;

  const handleViewAllTasks = () => {
    navigate('/tasks');
  };

  const handleViewDomain = (_domain: TaskDomain) => {
    navigate('/tasks');
  };

  if (isLoading) {
    return (
      <Box sx={{ borderRadius: tokens.spacing.radius.md, bgcolor: 'background.paper', p: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <TasksIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Pending Tasks
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Loading tasks...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ borderRadius: tokens.spacing.radius.md, bgcolor: 'background.paper', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <TasksIcon color={counts.total > 0 ? 'warning' : 'success'} sx={{ fontSize: 20 }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Pending Tasks
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {urgentCount > 0 && (
            <Chip
              icon={<Warning sx={{ fontSize: '14px !important' }} />}
              label={`${urgentCount} urgent`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          <Chip
            label={counts.total}
            color={counts.total > 0 ? 'warning' : 'success'}
            variant="outlined"
            sx={{ fontWeight: 700, minWidth: 32 }}
          />
        </Box>
      </Box>

      {/* Domain Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          mb: 3,
        }}
      >
        {(Object.keys(domainConfig) as TaskDomain[]).map((domain) => {
          const config = domainConfig[domain];
          const Icon = config.icon;
          const count = counts[domain];
          const hasUrgent = tasksByDomain[domain].some((t) => t.priority === 'high');

          return (
            <Box
              key={domain}
              onClick={() => handleViewDomain(domain)}
              sx={{
                borderRadius: tokens.spacing.radius.md,
                p: 2,
                cursor: 'pointer',
                border: 1,
                borderColor: count > 0 ? `${config.color}.light` : 'divider',
                bgcolor: count > 0 ? `${config.color}.50` : 'transparent',
                '&:hover': {
                  borderColor: `${config.color}.main`,
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Icon sx={{ fontSize: 20 }} color={count > 0 ? config.color : 'disabled'} />
                <Box flex={1}>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color={count > 0 ? 'text.primary' : 'text.secondary'}
                    sx={{ lineHeight: 1 }}
                  >
                    {count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {config.label}
                  </Typography>
                </Box>
                {hasUrgent && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                    }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* View All Button */}
      <Button
        variant="outlined"
        fullWidth
        endIcon={<ArrowForward />}
        onClick={handleViewAllTasks}
        sx={{
          borderRadius: tokens.spacing.radius.md,
          fontWeight: 600,
        }}
      >
        View All Tasks
      </Button>
    </Box>
  );
};
