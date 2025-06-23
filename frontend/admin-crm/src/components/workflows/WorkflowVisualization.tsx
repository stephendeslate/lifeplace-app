// frontend/admin-crm/src/components/workflows/WorkflowVisualization.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Avatar,
  Alert,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Email as EmailIcon,
  Task as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Handyman as ManualIcon,
  EventNote as EventIcon,
} from '@mui/icons-material';
import type { WorkflowVisualizationProps } from '../../types/workflows.types';

export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  template,
  // @ts-ignore
  compact = false,
}) => {
  const getAutomationIcon = (automationType: string) => {
    const icons = {
      EMAIL: <EmailIcon />,
      TASK: <TaskIcon />,
      QUOTE: <QuoteIcon />,
      CONTRACT: <ContractIcon />,
      REMINDER: <ScheduleIcon />,
      NOTIFICATION: <NotificationIcon />,
    };

    return icons[automationType as keyof typeof icons] || <TaskIcon />;
  };

  const getStageColor = (stage: string) => {
    const colors = {
      LEAD: '#1976d2',
      PRODUCTION: '#ed6c02',
      POST_PRODUCTION: '#2e7d32',
    };

    return colors[stage as keyof typeof colors] || '#757575';
  };

  const getTriggerTimeDisplay = (triggerTime: string) => {
    const triggerMap: Record<string, string> = {
      'ON_CREATION': 'Immediately',
      'AFTER_1_HOUR': 'After 1 Hour',
      'AFTER_3_HOURS': 'After 3 Hours',
      'AFTER_6_HOURS': 'After 6 Hours',
      'AFTER_12_HOURS': 'After 12 Hours',
      'AFTER_1_DAY': 'After 1 Day',
      'AFTER_2_DAYS': 'After 2 Days',
      'AFTER_3_DAYS': 'After 3 Days',
      'AFTER_1_WEEK': 'After 1 Week',
      'AFTER_2_WEEKS': 'After 2 Weeks',
    };

    return triggerMap[triggerTime] || triggerTime;
  };

  if (!template.stages || template.stages.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <WorkflowIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Workflow Stages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add stages to this template to define the workflow process
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Group stages by type and sort by order
  const stagesByType = template.stages.reduce((acc, stage) => {
    if (!acc[stage.stage]) {
      acc[stage.stage] = [];
    }
    acc[stage.stage].push(stage);
    return acc;
  }, {} as Record<string, typeof template.stages>);

  // Sort stages within each type by order
  Object.keys(stagesByType).forEach(type => {
    stagesByType[type].sort((a, b) => a.order - b.order);
  });

  const stageOrder = ['LEAD', 'PRODUCTION', 'POST_PRODUCTION'];

  return (
    <Box>
      {/* Template Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <WorkflowIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {template.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                {template.event_type_name ? (
                  <Chip
                    icon={<EventIcon />}
                    label={`For: ${template.event_type_name}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    label="Any Event Type"
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                )}
                <Chip
                  label={template.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={template.is_active ? 'success' : 'default'}
                  variant={template.is_active ? 'filled' : 'outlined'}
                />
              </Box>
            </Box>
          </Box>

          {template.description && (
            <Typography variant="body1" color="text.secondary">
              {template.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Workflow Stages */}
      <Stack spacing={3}>
        {stageOrder.map((stageType) => {
          const stages = stagesByType[stageType];
          if (!stages || stages.length === 0) return null;

          return (
            <Card key={stageType}>
              <CardContent>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: getStageColor(stageType),
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {stageType.replace('_', ' ')} STAGES
                  <Chip 
                    label={`${stages.length} stage${stages.length !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                </Typography>

                <Stepper orientation="vertical">
                  {stages.map((stage) => (
                    <Step key={stage.id} active completed={false}>
                      <StepLabel>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {stage.name}
                          </Typography>
                          {stage.is_automated ? (
                            <Chip
                              icon={getAutomationIcon(stage.automation_type)}
                              label={stage.automation_type}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              icon={<ManualIcon />}
                              label="Manual"
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                        </Box>
                      </StepLabel>
                      <StepContent>
                        <Paper variant="outlined" sx={{ p: 2, ml: -2, mt: 1 }}>
                          <Stack spacing={2}>
                            {stage.task_description && (
                              <Typography variant="body2" color="text.secondary">
                                {stage.task_description}
                              </Typography>
                            )}

                            {stage.is_automated && (
                              <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                  Automation Details:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Chip
                                    label={`Trigger: ${getTriggerTimeDisplay(stage.trigger_time)}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                  {stage.email_template_name && (
                                    <Chip
                                      label={`Template: ${stage.email_template_name}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              </Box>
                            )}

                            {stage.progression_condition && (
                              <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                  Progression:
                                </Typography>
                                <Chip
                                  label={stage.progression_condition.replace('_', ' ')}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              </Box>
                            )}

                            {stage.required_tasks_completed && (
                              <Alert severity="info" sx={{ mt: 1 }}>
                                All tasks must be completed before progressing
                              </Alert>
                            )}
                          </Stack>
                        </Paper>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Summary */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflow Summary
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label={`${template.stages.length} Total Stages`}
              variant="outlined"
            />
            <Chip 
              label={`${template.stages.filter(s => s.is_automated).length} Automated`}
              color="secondary"
              variant="outlined"
            />
            <Chip 
              label={`${template.stages.filter(s => !s.is_automated).length} Manual`}
              variant="outlined"
            />
            <Chip 
              label={`${template.stages.filter(s => s.progression_condition).length} Auto-Progress`}
              color="info"
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};