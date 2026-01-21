// frontend/admin-crm/src/components/workflows/flowchart/index.ts

export { WorkflowFlowchart } from './WorkflowFlowchart';
export { StageNode } from './nodes/StageNode';
export { SwimlaneHeader } from './nodes/SwimlaneHeader';
export { AddStageNode } from './nodes/AddStageNode';
export { ProgressionEdge } from './edges/ProgressionEdge';
export { useFlowchartState } from './hooks/useFlowchartState';
export { calculateLayout, getFlowchartBounds, calculateReorderMapping } from './utils/layoutCalculator';

// Types
export type {
  FlowchartNodeType,
  FlowchartEdgeType,
  StageNodeData,
  SwimlaneHeaderData,
  AddStageNodeData,
  StageNode as StageNodeType,
  SwimlaneHeaderNode,
  AddStageNode as AddStageNodeType,
  FlowchartNode,
  ProgressionEdgeData,
  EventTriggerEdgeData,
  FlowchartEdge,
  LayoutConfig,
  SwimlaneConfig,
  FlowchartMode,
  WorkflowFlowchartProps,
} from './types';

export {
  DEFAULT_LAYOUT_CONFIG,
  SWIMLANE_CONFIGS,
  getSwimlaneConfig,
  AUTOMATION_TYPE_LABELS,
} from './types';
