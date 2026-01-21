// frontend/client-portal/src/components/actions/TaskActionCard.tsx

import React, { useState } from 'react';
import {
  Stack,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  PriorityHigh as HighPriorityIcon,
} from '@mui/icons-material';
import { ActionCard } from './ActionCard';
import { useEvents } from '../../hooks/useEvents';
import type { TaskActionItem } from '../../types/action-center.types';
import type { TaskUpdate } from '../../types/events.types';

interface TaskActionCardProps {
  action: TaskActionItem;
  onActionComplete?: () => void;
}

export const TaskActionCard: React.FC<TaskActionCardProps> = ({
  action,
  onActionComplete,
}) => {
  const { useUpdateEventTask } = useEvents();
  const updateTaskMutation = useUpdateEventTask();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState<TaskUpdate>({
    status: action.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
    completion_notes: '',
  });

  const handleOpenDialog = () => {
    setUpdateData({
      status: action.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
      completion_notes: '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setUpdateData({ status: 'IN_PROGRESS', completion_notes: '' });
  };

  const handleSubmit = async () => {
    try {
      await updateTaskMutation.mutateAsync({
        eventId: action.eventId,
        taskId: action.taskId,
        data: updateData,
      });
      handleCloseDialog();
      onActionComplete?.();
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const getPriorityColor = (priority: string): 'default' | 'error' | 'warning' | 'info' => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <>
      <ActionCard action={action}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          {/* Priority Chip */}
          <Chip
            label={action.priority}
            size="small"
            color={getPriorityColor(action.priority)}
            variant="outlined"
            icon={action.priority === 'URGENT' ? <HighPriorityIcon fontSize="small" /> : undefined}
            sx={{ fontSize: '0.7rem', height: 24 }}
          />

          {/* Status Chip */}
          <Chip
            label={action.status.replace('_', ' ')}
            size="small"
            color={action.status === 'IN_PROGRESS' ? 'warning' : 'default'}
            variant="filled"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />

          {/* Action Button */}
          {action.canComplete && (
            <Button
              variant="contained"
              size="small"
              startIcon={action.status === 'PENDING' ? <StartIcon /> : <CompleteIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog();
              }}
              disabled={updateTaskMutation.isPending}
              color={action.status === 'PENDING' ? 'primary' : 'success'}
              sx={{ ml: 'auto', fontSize: '0.75rem' }}
            >
              {action.status === 'PENDING' ? 'Start' : 'Complete'}
            </Button>
          )}
        </Stack>
      </ActionCard>

      {/* Task Update Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          Update Task: {action.title}
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
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={updateTaskMutation.isPending}
          >
            {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskActionCard;
