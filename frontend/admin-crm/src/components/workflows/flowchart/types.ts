// frontend/admin-crm/src/components/workflows/flowchart/types.ts

import type { Node, Edge } from '@xyflow/react';
import type { WorkflowStage, StageType, AutomationType } from '../../../types/workflows.types';

// Node types
export type FlowchartNodeType = 'stage' | 'swimlaneHeader' | 'addStage';

// Data structure for stage nodes
export interface StageNodeData {
  stage: WorkflowStage;
  stageType: StageType;
  isSelected: boolean;
  onEdit: (stage: WorkflowStage) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number) => void;
}

// Data structure for swimlane header nodes
export interface SwimlaneHeaderData {
  stageType: StageType;
  label: string;
  color: string;
  stageCount: number;
}

// Data structure for add stage nodes
export interface AddStageNodeData {
  stageType: StageType;
  onClick: (stageType: StageType, position: number) => void;
  position: number;
}

// Custom node types
export type StageNode = Node<StageNodeData, 'stage'>;
export type SwimlaneHeaderNode = Node<SwimlaneHeaderData, 'swimlaneHeader'>;
export type AddStageNode = Node<AddStageNodeData, 'addStage'>;

export type FlowchartNode = StageNode | SwimlaneHeaderNode | AddStageNode;

// Edge types
export type FlowchartEdgeType = 'progression' | 'eventTrigger';

// Data structure for progression edges
export interface ProgressionEdgeData {
  condition?: string;
  label?: string;
}

// Data structure for event trigger edges
export interface EventTriggerEdgeData {
  triggerType: string;
}

export type FlowchartEdge = Edge<ProgressionEdgeData | EventTriggerEdgeData>;

// Layout configuration
export interface LayoutConfig {
  swimlaneHeaderWidth: number;
  swimlaneHeaderHeight: number;
  stageNodeWidth: number;
  stageNodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  swimlaneGap: number;
  paddingX: number;
  paddingY: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  swimlaneHeaderWidth: 180,
  swimlaneHeaderHeight: 60,
  stageNodeWidth: 280,
  stageNodeHeight: 140,
  horizontalGap: 40,
  verticalGap: 20,
  swimlaneGap: 80,
  paddingX: 20,
  paddingY: 20,
};

// Swimlane configuration
export interface SwimlaneConfig {
  stageType: StageType;
  label: string;
  color: string;
  bgColor: string;
}

export const SWIMLANE_CONFIGS: SwimlaneConfig[] = [
  {
    stageType: 'LEAD',
    label: 'Lead Stage',
    color: '#2563eb', // blue-600
    bgColor: '#eff6ff', // blue-50
  },
  {
    stageType: 'PRODUCTION',
    label: 'Production Stage',
    color: '#d97706', // amber-600
    bgColor: '#fffbeb', // amber-50
  },
  {
    stageType: 'POST_PRODUCTION',
    label: 'Post-Production',
    color: '#059669', // emerald-600
    bgColor: '#ecfdf5', // emerald-50
  },
];

// Helper to get swimlane config
export const getSwimlaneConfig = (stageType: StageType): SwimlaneConfig => {
  return SWIMLANE_CONFIGS.find(c => c.stageType === stageType) || SWIMLANE_CONFIGS[0];
};

// Automation type icons/labels
export const AUTOMATION_TYPE_LABELS: Record<AutomationType, { label: string; icon: string }> = {
  EMAIL: { label: 'Email', icon: 'email' },
  TASK: { label: 'Task', icon: 'task' },
  QUOTE: { label: 'Quote', icon: 'request_quote' },
  CONTRACT: { label: 'Contract', icon: 'description' },
  QUESTIONNAIRE: { label: 'Questionnaire', icon: 'quiz' },
  REMINDER: { label: 'Reminder', icon: 'schedule' },
  NOTIFICATION: { label: 'Notification', icon: 'notifications' },
};

// Flowchart mode
export type FlowchartMode = 'view' | 'edit';

// Flowchart props
export interface WorkflowFlowchartProps {
  stages: WorkflowStage[];
  templateId: number;
  mode?: FlowchartMode;
  selectedStageId?: number | null;
  onStageSelect?: (stageId: number | null) => void;
  onStageEdit?: (stage: WorkflowStage) => void;
  onStageDelete?: (id: number) => void;
  onStageAdd?: (stageType: StageType, position: number) => void;
  onStagesReorder?: (stageType: StageType, orderMapping: Record<string, number>) => void;
}
