// frontend/admin-crm/src/utils/mockData.ts

import type { WorkflowProgress } from '../types/events.types';

export const createMockWorkflowProgress = (
  currentStage: number = 2,
  totalStages: number = 5
): WorkflowProgress => {
  const stageNames = [
    'Initial Consultation',
    'Proposal & Quote',
    'Contract & Planning',
    'Event Preparation',
    'Event Execution',
  ];

  const currentStageName = stageNames[currentStage - 1] || 'Unknown Stage';
  const percentage = Math.round((currentStage / totalStages) * 100);

  const tasksByStage = {
    1: 'Schedule initial consultation call',
    2: 'Prepare detailed quote and proposal',
    3: 'Finalize contract and event planning',
    4: 'Coordinate vendors and logistics',
    5: 'Execute event and follow up',
  };

  const currentTaskName = tasksByStage[currentStage as keyof typeof tasksByStage] || 'No active task';

  return {
    current_stage: currentStage,
    total_stages: totalStages,
    current_stage_name: currentStageName,
    current_task_name: currentTaskName,
    percentage,
    stage_names: stageNames.slice(0, totalStages),
  };
};

export const mockWorkflowProgressStates = {
  justStarted: createMockWorkflowProgress(1, 5),
  inProgress: createMockWorkflowProgress(3, 5),
  nearComplete: createMockWorkflowProgress(4, 5),
  completed: createMockWorkflowProgress(5, 5),
  shortWorkflow: createMockWorkflowProgress(2, 3),
};