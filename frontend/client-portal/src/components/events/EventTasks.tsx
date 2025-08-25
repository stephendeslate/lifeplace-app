// frontend/client-portal/src/components/events/EventTasks.tsx

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  HourglassEmpty as InProgressIcon,
  Cancel as CancelledIcon,
  PriorityHigh as HighPriorityIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import type { EventTask, TaskStatus, TaskPriority } from '../../types/events.types';

interface EventTasksProps {
  tasks: EventTask[];
  loading?: boolean;
  showEmpty?: boolean;
  maxItems?: number;
}

const EventTasks: React.FC<EventTasksProps> = ({ 
  tasks, 
  loading = false, 
  showEmpty = true,
  maxItems 
}) => {
  const getTaskIcon = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CompletedIcon color="success" />;
      case 'IN_PROGRESS':
        return <InProgressIcon color="warning" />;
      case 'CANCELLED':
        return <CancelledIcon color="error" />;
      default:
        return <PendingIcon color="action" />;
    }
  };

  const getPriorityColor = (priority: TaskPriority): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTaskStatusColor = (status: TaskStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const isTaskOverdue = (task: EventTask): boolean => {
    if (!task.due_date || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return false;
    }
    return isBefore(new Date(task.due_date), new Date());
  };

  const isTaskDueSoon = (task: EventTask): boolean => {
    if (!task.due_date || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return false;
    }
    const threeDaysFromNow = addDays(new Date(), 3);
    return isBefore(new Date(task.due_date), threeDaysFromNow) && isAfter(new Date(task.due_date), new Date());
  };

  if (loading) {
    return (
      <Box>
        <List>
          {[1, 2, 3].map((item) => (
            <ListItem key={item} divider>
              <ListItemIcon>
                <Skeleton variant="circular" width={24} height={24} />
              </ListItemIcon>
              <ListItemText
                primary={<Skeleton variant="text" width="70%" />}
                secondary={<Skeleton variant="text" width="50%" />}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  if (!tasks || tasks.length === 0) {
    return showEmpty ? (
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <AssignmentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No tasks available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upcoming tasks and action items will appear here.
        </Typography>
      </Paper>
    ) : null;
  }

  const displayTasks = maxItems ? tasks.slice(0, maxItems) : tasks;

  return (
    <Box role="region" aria-label="Event tasks">
      <List sx={{ width: '100%' }}>
        {displayTasks.map((task) => (
          <ListItem
            key={task.id}
            divider
            sx={{
              py: 2,
              backgroundColor: isTaskOverdue(task) ? 'error.light' : 
                             isTaskDueSoon(task) ? 'warning.light' : 
                             'transparent',
              opacity: task.status === 'CANCELLED' ? 0.6 : 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 48 }}>
              {getTaskIcon(task.status)}
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography 
                    variant="body1" 
                    component="h4"
                    sx={{ 
                      fontWeight: 500,
                      textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {task.title}
                  </Typography>
                  
                  {task.priority !== 'LOW' && (
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                      variant="outlined"
                      icon={task.priority === 'URGENT' ? <HighPriorityIcon fontSize="small" /> : undefined}
                    />
                  )}
                  
                  <Chip
                    label={task.status.replace('_', ' ')}
                    size="small"
                    color={getTaskStatusColor(task.status)}
                    variant="filled"
                  />
                </Stack>
              }
              secondary={
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                  {task.due_date && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography 
                        variant="caption" 
                        color={isTaskOverdue(task) ? 'error' : 'text.secondary'}
                        sx={{ fontWeight: isTaskOverdue(task) ? 600 : 400 }}
                      >
                        Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                      </Typography>
                    </Stack>
                  )}
                  
                  {isTaskOverdue(task) && (
                    <Chip 
                      label="OVERDUE" 
                      size="small" 
                      color="error"
                      variant="filled"
                      sx={{ height: 20, fontSize: '0.6875rem' }}
                    />
                  )}
                  
                  {isTaskDueSoon(task) && !isTaskOverdue(task) && (
                    <Chip 
                      label="DUE SOON" 
                      size="small" 
                      color="warning"
                      variant="filled"
                      sx={{ height: 20, fontSize: '0.6875rem' }}
                    />
                  )}
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>
      
      {maxItems && tasks.length > maxItems && (
        <Box sx={{ mt: 2, px: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Showing {maxItems} of {tasks.length} tasks
          </Typography>
        </Box>
      )}
      
      <Box sx={{ mt: 2, px: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {displayTasks.length} task{displayTasks.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default EventTasks;