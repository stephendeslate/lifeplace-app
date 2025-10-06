// frontend/client-portal/src/components/events/EventTasks.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Stack,
  Skeleton,
  Chip,
  Button,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  HourglassEmpty as InProgressIcon,
  Cancel as CancelledIcon,
  PriorityHigh as HighPriorityIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';
import { isAfter, isBefore, addDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { useEvents } from '../../hooks/useEvents';
import type { EventTask, TaskStatus, TaskPriority, TaskUpdate } from '../../types/events.types';

interface EventTasksProps {
  eventId: number;
  loading?: boolean;
  showEmpty?: boolean;
  maxItems?: number;
}

const EventTasks: React.FC<EventTasksProps> = ({
  eventId,
  loading: externalLoading = false,
  showEmpty = true,
  maxItems
}) => {
  const PHILIPPINE_TIMEZONE = 'Asia/Manila';
  const { useEventTasks, useUpdateEventTask } = useEvents();
  const { data: tasks, isLoading, error, refetch } = useEventTasks(eventId);
  const updateTaskMutation = useUpdateEventTask();
  
  // Task update dialog state
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EventTask | null>(null);
  const [updateData, setUpdateData] = useState<TaskUpdate>({
    status: 'IN_PROGRESS',
    completion_notes: '',
  });

  const loading = externalLoading || isLoading;

  // Handle task update
  const handleTaskUpdate = (task: EventTask) => {
    setSelectedTask(task);
    setUpdateData({
      status: task.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
      completion_notes: '',
    });
    setUpdateDialogOpen(true);
  };

  const handleTaskUpdateSubmit = async () => {
    if (!selectedTask) return;

    try {
      await updateTaskMutation.mutateAsync({
        eventId,
        taskId: selectedTask.id,
        data: updateData,
      });
      setUpdateDialogOpen(false);
      setSelectedTask(null);
      refetch(); // Refresh tasks list
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const handleUpdateDialogClose = () => {
    setUpdateDialogOpen(false);
    setSelectedTask(null);
    setUpdateData({ status: 'IN_PROGRESS', completion_notes: '' });
  };

  const getTaskIcon = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CompletedIcon color="success" />;
      case 'IN_PROGRESS':
        return <InProgressIcon color="warning" />;
      case 'CANCELLED':
        return <CancelledIcon color="error" />;
      case 'BLOCKED':
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
      case 'BLOCKED':
        return 'error';
      default:
        return 'default';
    }
  };

  const isTaskOverdue = (task: EventTask): boolean => {
    if (!task.due_date || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return false;
    }
    const dueDate = toZonedTime(task.due_date, PHILIPPINE_TIMEZONE);
    const now = toZonedTime(new Date(), PHILIPPINE_TIMEZONE);
    return isBefore(dueDate, now);
  };

  const isTaskDueSoon = (task: EventTask): boolean => {
    if (!task.due_date || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return false;
    }
    const dueDate = toZonedTime(task.due_date, PHILIPPINE_TIMEZONE);
    const now = toZonedTime(new Date(), PHILIPPINE_TIMEZONE);
    const threeDaysFromNow = addDays(now, 3);
    return isBefore(dueDate, threeDaysFromNow) && isAfter(dueDate, now);
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

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load event tasks. Please try again later.
      </Alert>
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
                        Due: {formatInTimeZone(task.due_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
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
            
            {/* Action buttons for client-updatable tasks */}
            {task.can_update && (
              <ListItemSecondaryAction>
                <Tooltip title={
                  task.status === 'PENDING' 
                    ? 'Start working on this task' 
                    : 'Mark task as complete'
                }>
                  <IconButton
                    onClick={() => handleTaskUpdate(task)}
                    disabled={updateTaskMutation.isPending}
                    size="small"
                    color={task.status === 'PENDING' ? 'primary' : 'success'}
                  >
                    {task.status === 'PENDING' ? <StartIcon /> : <EditIcon />}
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            )}
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

      {/* Task Update Dialog */}
      <Dialog
        open={updateDialogOpen}
        onClose={handleUpdateDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Task: {selectedTask?.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Status"
              select
              value={updateData.status || ''}
              onChange={(e) => setUpdateData(prev => ({ 
                ...prev, 
                status: e.target.value as TaskUpdate['status'] 
              }))}
              fullWidth
            >
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
            </TextField>

            <TextField
              label="Notes"
              multiline
              rows={3}
              value={updateData.completion_notes || ''}
              onChange={(e) => setUpdateData(prev => ({ 
                ...prev, 
                completion_notes: e.target.value 
              }))}
              placeholder={
                updateData.status === 'COMPLETED' 
                  ? 'Add completion notes...' 
                  : 'Add progress notes...'
              }
              helperText={
                updateData.status === 'COMPLETED' 
                  ? 'Briefly describe what was completed' 
                  : 'Optional: Add any notes about your progress'
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUpdateDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleTaskUpdateSubmit}
            variant="contained"
            disabled={updateTaskMutation.isPending}
          >
            {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventTasks;