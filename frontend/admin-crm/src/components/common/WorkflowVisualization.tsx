// frontend/admin-crm/src/components/common/WorkflowVisualization.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Stack,
  Collapse,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon,
  PlayArrow as StartIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';

export interface WorkflowStage {
  id: number;
  name: string;
  description?: string;
  status: 'completed' | 'active' | 'pending' | 'blocked' | 'skipped';
  order: number;
  completedAt?: string;
  startedAt?: string;
  dueDate?: string;
  assignedTo?: {
    id: number;
    name: string;
    avatar?: string;
  };
  tasks?: WorkflowTask[];
  dependencies?: number[]; // IDs of stages that must be completed first
  estimatedDuration?: number; // in days
  actualDuration?: number; // in days
}

export interface WorkflowTask {
  id: number;
  name: string;
  status: 'completed' | 'active' | 'pending' | 'blocked';
  completedAt?: string;
  assignedTo?: {
    id: number;
    name: string;
    avatar?: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

interface WorkflowVisualizationProps {
  workflowName?: string;
  stages: WorkflowStage[];
  currentStage?: number;
  overallProgress?: number;
  layout?: 'horizontal' | 'vertical';
  showTasks?: boolean;
  showProgress?: boolean;
  onStageClick?: (stage: WorkflowStage) => void;
  onTaskClick?: (task: WorkflowTask, stage: WorkflowStage) => void;
}

const getStageColor = (
  status: string,
): 'success' | 'primary' | 'default' | 'error' | 'secondary' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'active':
      return 'primary';
    case 'blocked':
      return 'error';
    case 'skipped':
      return 'secondary';
    default:
      return 'default';
  }
};

const getStageIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CompletedIcon />;
    case 'active':
      return <StartIcon />;
    case 'blocked':
      return <ErrorIcon />;
    case 'pending':
      return <PendingIcon />;
    default:
      return <PendingIcon />;
  }
};

const getPriorityColor = (priority?: string): 'default' | 'primary' | 'warning' | 'error' => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    default:
      return 'default';
  }
};

const calculateDaysRemaining = (dueDate: string): { days: number; isOverdue: boolean } => {
  const due = new Date(dueDate);
  const today = new Date();
  const days = differenceInDays(due, today);
  return {
    days: Math.abs(days),
    isOverdue: days < 0,
  };
};

const TaskItem: React.FC<{
  task: WorkflowTask;
  stage: WorkflowStage;
  onTaskClick?: (task: WorkflowTask, stage: WorkflowStage) => void;
}> = ({ task, stage, onTaskClick }) => {
  const handleClick = () => {
    if (onTaskClick) {
      onTaskClick(task, stage);
    }
  };

  const daysInfo = task.dueDate ? calculateDaysRemaining(task.dueDate) : null;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      p={1}
      sx={{
        cursor: onTaskClick ? 'pointer' : 'default',
        borderRadius: 1,
        '&:hover': onTaskClick ? { bgcolor: 'action.hover' } : {},
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: task.status === 'completed' ? 'success.50' : 'background.paper',
      }}
      onClick={handleClick}
    >
      <Box display="flex" alignItems="center" gap={1.5} flex={1}>
        <Box sx={{ color: getStageColor(task.status) + '.main' }}>{getStageIcon(task.status)}</Box>
        <Box flex={1}>
          <Typography variant="body2" fontWeight="medium">
            {task.name}
          </Typography>
          {task.dueDate && daysInfo && (
            <Typography
              variant="caption"
              color={daysInfo.isOverdue ? 'error.main' : 'text.secondary'}
            >
              {daysInfo.isOverdue
                ? `${daysInfo.days} days overdue`
                : `Due in ${daysInfo.days} days`}
            </Typography>
          )}
        </Box>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center">
        {task.priority && (
          <Chip
            label={task.priority.toUpperCase()}
            size="small"
            color={getPriorityColor(task.priority)}
            variant="outlined"
          />
        )}
        {task.assignedTo && (
          <Tooltip title={task.assignedTo.name}>
            <Avatar src={task.assignedTo.avatar} sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
              {task.assignedTo.name.charAt(0)}
            </Avatar>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

const StageCard: React.FC<{
  stage: WorkflowStage;
  isActive?: boolean;
  showTasks?: boolean;
  onStageClick?: (stage: WorkflowStage) => void;
  onTaskClick?: (task: WorkflowTask, stage: WorkflowStage) => void;
}> = ({ stage, isActive = false, showTasks = false, onStageClick, onTaskClick }) => {
  const [expanded, setExpanded] = useState(isActive || stage.status === 'active');

  const handleStageClick = () => {
    if (onStageClick) {
      onStageClick(stage);
    }
    if (showTasks && stage.tasks && stage.tasks.length > 0) {
      setExpanded(!expanded);
    }
  };

  const completedTasks = stage.tasks?.filter((t) => t.status === 'completed').length || 0;
  const totalTasks = stage.tasks?.length || 0;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const daysInfo = stage.dueDate ? calculateDaysRemaining(stage.dueDate) : null;

  return (
    <Card
      variant={isActive ? 'elevation' : 'outlined'}
      sx={{
        cursor: onStageClick ? 'pointer' : 'default',
        borderColor: stage.status === 'active' ? 'primary.main' : 'divider',
        borderWidth: stage.status === 'active' ? 2 : 1,
      }}
    >
      <CardContent onClick={handleStageClick}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ color: getStageColor(stage.status) + '.main' }}>
              {getStageIcon(stage.status)}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                {stage.name}
              </Typography>
              {stage.description && (
                <Typography variant="body2" color="text.secondary">
                  {stage.description}
                </Typography>
              )}
            </Box>
          </Box>

          <Stack alignItems="flex-end" spacing={0.5}>
            <Chip
              label={stage.status.replace('_', ' ').toUpperCase()}
              size="small"
              color={getStageColor(stage.status)}
              variant={stage.status === 'completed' ? 'filled' : 'outlined'}
            />
            {showTasks && stage.tasks && stage.tasks.length > 0 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Stack>
        </Box>

        {/* Stage Metadata */}
        <Stack spacing={1}>
          {stage.assignedTo && (
            <Box display="flex" alignItems="center" gap={1}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Assigned to {stage.assignedTo.name}
              </Typography>
            </Box>
          )}

          {stage.completedAt && (
            <Box display="flex" alignItems="center" gap={1}>
              <CompletedIcon fontSize="small" color="success" />
              <Typography variant="body2" color="text.secondary">
                Completed {format(new Date(stage.completedAt), 'MMM d, yyyy')}
              </Typography>
            </Box>
          )}

          {stage.dueDate && !stage.completedAt && daysInfo && (
            <Box display="flex" alignItems="center" gap={1}>
              <EventIcon fontSize="small" color={daysInfo.isOverdue ? 'error' : 'action'} />
              <Typography
                variant="body2"
                color={daysInfo.isOverdue ? 'error.main' : 'text.secondary'}
              >
                {daysInfo.isOverdue
                  ? `${daysInfo.days} days overdue`
                  : `Due in ${daysInfo.days} days`}
              </Typography>
            </Box>
          )}

          {/* Task Progress */}
          {totalTasks > 0 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Tasks Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {completedTasks}/{totalTasks}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={taskProgress}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          )}
        </Stack>

        {/* Tasks List */}
        {showTasks && stage.tasks && stage.tasks.length > 0 && (
          <Collapse in={expanded}>
            <Box mt={2} pt={1} borderTop="1px solid" borderColor="divider">
              <Typography variant="subtitle2" gutterBottom>
                Tasks ({stage.tasks.length})
              </Typography>
              <Stack spacing={1}>
                {stage.tasks.map((task) => (
                  <TaskItem key={task.id} task={task} stage={stage} onTaskClick={onTaskClick} />
                ))}
              </Stack>
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};

export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  workflowName,
  stages,
  overallProgress,
  layout = 'vertical',
  showTasks = true,
  showProgress = true,
  onStageClick,
  onTaskClick,
}) => {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const activeStage = sortedStages.find((s) => s.status === 'active');
  const completedStages = sortedStages.filter((s) => s.status === 'completed').length;
  const calculatedProgress = overallProgress || (completedStages / sortedStages.length) * 100;

  if (stages.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={3}>
            <WorkflowIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Workflow Assigned
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Assign a workflow template to track progress through stages.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <WorkflowIcon color="primary" />
            <Box>
              <Typography variant="h6">{workflowName || 'Workflow Progress'}</Typography>
              {activeStage && (
                <Typography variant="body2" color="text.secondary">
                  Current: {activeStage.name}
                </Typography>
              )}
            </Box>
          </Box>

          {showProgress && (
            <Box textAlign="right">
              <Typography variant="h6" color="primary" fontWeight="bold">
                {Math.round(calculatedProgress)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {completedStages}/{sortedStages.length} stages
              </Typography>
            </Box>
          )}
        </Box>

        {/* Overall Progress Bar */}
        {showProgress && (
          <Box mb={3}>
            <LinearProgress
              variant="determinate"
              value={calculatedProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}

        {/* Stages */}
        {layout === 'vertical' ? (
          <Stepper orientation="vertical" nonLinear activeStep={-1}>
            {sortedStages.map((stage) => (
              <Step key={stage.id} completed={stage.status === 'completed'}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box sx={{ color: getStageColor(stage.status) + '.main' }}>
                      {getStageIcon(stage.status)}
                    </Box>
                  )}
                >
                  {stage.name}
                  {stage.status === 'active' && (
                    <Chip label="Current" size="small" color="primary" sx={{ ml: 1 }} />
                  )}
                </StepLabel>
                <StepContent>
                  <Box ml={-3} mt={1}>
                    <StageCard
                      stage={stage}
                      isActive={stage.status === 'active'}
                      showTasks={showTasks}
                      onStageClick={onStageClick}
                      onTaskClick={onTaskClick}
                    />
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        ) : (
          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
            gap={2}
          >
            {sortedStages.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage}
                isActive={stage.status === 'active'}
                showTasks={showTasks}
                onStageClick={onStageClick}
                onTaskClick={onTaskClick}
              />
            ))}
          </Box>
        )}

        {/* Alerts */}
        {sortedStages.some((s) => s.status === 'blocked') && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Some workflow stages are blocked and require attention.
            </Typography>
          </Alert>
        )}

        {activeStage?.dueDate && calculateDaysRemaining(activeStage.dueDate).isOverdue && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              The current stage "{activeStage.name}" is overdue by{' '}
              {calculateDaysRemaining(activeStage.dueDate).days} days.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
