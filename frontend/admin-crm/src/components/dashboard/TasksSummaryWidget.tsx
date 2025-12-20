// frontend/admin-crm/src/components/dashboard/TasksSummaryWidget.tsx

import React from 'react';
import { Box, Typography, Button, Chip, Card, CardContent } from '@mui/material';
import {
  Assignment as TasksIcon,
  ArrowForward,
  RequestQuote,
  Description,
  Payment,
  Email,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';
import type { TaskDomain } from '../../types/tasks.types';

const domainConfig: Record<TaskDomain, { label: string; icon: React.ElementType; color: string }> = {
  quotes: { label: 'Quotes', icon: RequestQuote, color: tokens.color.info[500] },
  contracts: { label: 'Contracts', icon: Description, color: tokens.color.warning[500] },
  payments: { label: 'Payments', icon: Payment, color: tokens.color.success[500] },
  communications: { label: 'Messages', icon: Email, color: tokens.color.secondary[500] },
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
      <Card
        elevation={0}
        sx={{
          ...glassPresets.light,
          borderRadius: tokens.spacing.radius.xxl,
          border: `1px solid ${tokens.color.borders.glass}`,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Box
              sx={{
                ...glassPresets.medium,
                borderRadius: tokens.spacing.radius.full,
                p: 1.5,
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                border: `1px solid ${tokens.color.primary[500]}30`,
              }}
            >
              <TasksIcon sx={{ fontSize: 20, color: tokens.color.primary[600] }} />
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: tokens.color.neutral[800] }}>
              Pending Tasks
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: tokens.color.neutral[500] }}>
            Loading tasks...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        ...glassPresets.light,
        borderRadius: tokens.spacing.radius.xxl,
        border: `1px solid ${tokens.color.borders.glass}`,
        position: 'relative',
        overflow: 'visible',

        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            counts.total > 0
              ? `linear-gradient(135deg, ${tokens.color.warning[500]}04 0%, ${tokens.color.primary[500]}04 100%)`
              : `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.primary[500]}04 100%)`,
          borderRadius: tokens.spacing.radius.xxl,
          pointerEvents: 'none',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                ...glassPresets.medium,
                borderRadius: tokens.spacing.radius.full,
                p: 1.5,
                background:
                  counts.total > 0
                    ? `linear-gradient(135deg, ${tokens.color.warning[500]}15 0%, ${tokens.color.warning[600]}10 100%)`
                    : `linear-gradient(135deg, ${tokens.color.success[500]}15 0%, ${tokens.color.success[600]}10 100%)`,
                border: `1px solid ${counts.total > 0 ? tokens.color.warning[500] : tokens.color.success[500]}30`,
              }}
            >
              <TasksIcon
                sx={{ fontSize: 20, color: counts.total > 0 ? tokens.color.warning[600] : tokens.color.success[600] }}
              />
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: tokens.color.neutral[800] }}>
              Pending Tasks
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {urgentCount > 0 && (
              <Chip
                icon={<Warning sx={{ fontSize: '14px !important' }} />}
                label={`${urgentCount} urgent`}
                size="small"
                sx={{
                  ...glassPresets.light,
                  background: `linear-gradient(135deg, ${tokens.color.error[500]}20 0%, ${tokens.color.error[600]}15 100%)`,
                  color: tokens.color.error[700],
                  border: `1px solid ${tokens.color.error[500]}30`,
                  fontWeight: 600,
                }}
              />
            )}
            <Chip
              label={counts.total}
              sx={{
                ...glassPresets.light,
                background:
                  counts.total > 0
                    ? `linear-gradient(135deg, ${tokens.color.warning[500]}20 0%, ${tokens.color.warning[600]}15 100%)`
                    : `linear-gradient(135deg, ${tokens.color.success[500]}20 0%, ${tokens.color.success[600]}15 100%)`,
                color: counts.total > 0 ? tokens.color.warning[700] : tokens.color.success[700],
                border: `1px solid ${counts.total > 0 ? tokens.color.warning[500] : tokens.color.success[500]}30`,
                fontWeight: 700,
                minWidth: 32,
              }}
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
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.xl,
                  p: 2,
                  cursor: 'pointer',
                  border: `1px solid ${count > 0 ? config.color : tokens.color.neutral[300]}20`,
                  background: count > 0 ? `${config.color}08` : 'transparent',
                  transition: createTransition(['transform', 'box-shadow', 'border-color'], 'fast'),

                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: tokens.shadow.glass.light,
                    borderColor: `${config.color}40`,
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Icon sx={{ fontSize: 20, color: count > 0 ? config.color : tokens.color.neutral[400] }} />
                  <Box flex={1}>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      sx={{ color: count > 0 ? tokens.color.neutral[800] : tokens.color.neutral[500], lineHeight: 1 }}
                    >
                      {count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.color.neutral[500] }}>
                      {config.label}
                    </Typography>
                  </Box>
                  {hasUrgent && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: tokens.color.error[500],
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
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.full,
            border: `1px solid ${tokens.color.primary[500]}30`,
            color: tokens.color.primary[700],
            fontWeight: 600,
            transition: createTransition(['background', 'border-color', 'transform'], 'fast'),

            '&:hover': {
              ...glassPresets.medium,
              borderColor: `${tokens.color.primary[500]}50`,
              transform: 'translateY(-1px)',
            },
          }}
        >
          View All Tasks
        </Button>
      </CardContent>
    </Card>
  );
};
