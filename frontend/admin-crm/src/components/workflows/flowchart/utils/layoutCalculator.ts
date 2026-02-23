// frontend/admin-crm/src/components/workflows/flowchart/utils/layoutCalculator.ts

import type { WorkflowStage, StageType } from '../../../../types/workflows.types';
import type {
  FlowchartNode,
  FlowchartEdge,
  LayoutConfig,
  StageNodeData,
  SwimlaneHeaderData,
  AddStageNodeData,
} from '../types';
import { DEFAULT_LAYOUT_CONFIG, getSwimlaneConfig, SWIMLANE_CONFIGS } from '../types';

interface LayoutResult {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

interface LayoutCallbacks {
  onEdit: (stage: WorkflowStage) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number) => void;
  onAddStage: (stageType: StageType, position: number) => void;
}

/**
 * Calculate the flowchart layout from workflow stages
 * Organizes stages into horizontal swimlanes by stage type
 */
export function calculateLayout(
  stages: WorkflowStage[],
  callbacks: LayoutCallbacks,
  selectedStageId: number | null = null,
  mode: 'view' | 'edit' = 'view',
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): LayoutResult {
  const nodes: FlowchartNode[] = [];
  const edges: FlowchartEdge[] = [];

  // Group stages by type
  const stagesByType = stages.reduce(
    (acc, stage) => {
      if (!acc[stage.stage]) {
        acc[stage.stage] = [];
      }
      acc[stage.stage].push(stage);
      return acc;
    },
    {} as Record<StageType, WorkflowStage[]>,
  );

  // Sort stages within each type by order
  Object.keys(stagesByType).forEach((type) => {
    stagesByType[type as StageType].sort((a, b) => a.order - b.order);
  });

  let currentY = config.paddingY;

  // Create nodes for each swimlane
  SWIMLANE_CONFIGS.forEach((swimlaneConfig) => {
    const stageType = swimlaneConfig.stageType;
    const stagesInLane = stagesByType[stageType] || [];

    // Create swimlane header node
    const headerNode: FlowchartNode = {
      id: `header-${stageType}`,
      type: 'swimlaneHeader',
      position: { x: config.paddingX, y: currentY },
      data: {
        stageType,
        label: swimlaneConfig.label,
        color: swimlaneConfig.color,
        stageCount: stagesInLane.length,
      } as SwimlaneHeaderData,
      draggable: false,
      selectable: false,
    };
    nodes.push(headerNode);

    // Calculate starting X position for stage nodes (after header)
    let currentX = config.paddingX + config.swimlaneHeaderWidth + config.horizontalGap;

    // Create stage nodes
    stagesInLane.forEach((stage, index) => {
      const stageNode: FlowchartNode = {
        id: `stage-${stage.id}`,
        type: 'stage',
        position: { x: currentX, y: currentY },
        data: {
          stage,
          stageType,
          isSelected: selectedStageId === stage.id,
          onEdit: callbacks.onEdit,
          onDelete: callbacks.onDelete,
          onSelect: callbacks.onSelect,
        } as StageNodeData,
        draggable: mode === 'edit',
        selectable: true,
      };
      nodes.push(stageNode);

      // Create edge to next stage in same lane (if exists)
      if (index < stagesInLane.length - 1) {
        const nextStage = stagesInLane[index + 1];
        edges.push({
          id: `edge-${stage.id}-${nextStage.id}`,
          source: `stage-${stage.id}`,
          target: `stage-${nextStage.id}`,
          type: 'progression',
          data: {
            condition: stage.progression_condition || undefined,
          },
          animated: false,
        });
      }

      currentX += config.stageNodeWidth + config.horizontalGap;
    });

    // Add "Add Stage" button in edit mode
    if (mode === 'edit') {
      const addNode: FlowchartNode = {
        id: `add-${stageType}`,
        type: 'addStage',
        position: { x: currentX, y: currentY + (config.stageNodeHeight - 60) / 2 },
        data: {
          stageType,
          onClick: callbacks.onAddStage,
          position: stagesInLane.length + 1,
        } as AddStageNodeData,
        draggable: false,
        selectable: false,
      };
      nodes.push(addNode);
    }

    // Move to next swimlane
    currentY += config.stageNodeHeight + config.swimlaneGap;
  });

  // Create edges between swimlanes (progression from LEAD to PRODUCTION, etc.)
  const stageTypeOrder: StageType[] = ['LEAD', 'PRODUCTION', 'POST_PRODUCTION'];
  for (let i = 0; i < stageTypeOrder.length - 1; i++) {
    const currentType = stageTypeOrder[i];
    const nextType = stageTypeOrder[i + 1];
    const lastStageInCurrent = stagesByType[currentType]?.[stagesByType[currentType]?.length - 1];
    const firstStageInNext = stagesByType[nextType]?.[0];

    if (lastStageInCurrent && firstStageInNext) {
      edges.push({
        id: `edge-lane-${currentType}-${nextType}`,
        source: `stage-${lastStageInCurrent.id}`,
        target: `stage-${firstStageInNext.id}`,
        type: 'progression',
        data: {
          label: `To ${getSwimlaneConfig(nextType).label}`,
        },
        animated: true,
        style: { strokeDasharray: '5, 5' },
      });
    }
  }

  return { nodes, edges };
}

/**
 * Get the bounds of the flowchart for viewport fitting
 */
export function getFlowchartBounds(
  stages: WorkflowStage[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): { width: number; height: number } {
  // Group stages by type
  const stagesByType = stages.reduce(
    (acc, stage) => {
      if (!acc[stage.stage]) {
        acc[stage.stage] = [];
      }
      acc[stage.stage].push(stage);
      return acc;
    },
    {} as Record<StageType, WorkflowStage[]>,
  );

  // Find max stages in any lane
  const maxStagesInLane = Math.max(
    ...SWIMLANE_CONFIGS.map((c) => (stagesByType[c.stageType] || []).length),
    1,
  );

  // Calculate dimensions
  const width =
    config.paddingX * 2 +
    config.swimlaneHeaderWidth +
    config.horizontalGap +
    maxStagesInLane * (config.stageNodeWidth + config.horizontalGap) +
    60; // Extra space for add button

  const height =
    config.paddingY * 2 +
    SWIMLANE_CONFIGS.length * config.stageNodeHeight +
    (SWIMLANE_CONFIGS.length - 1) * config.swimlaneGap;

  return { width, height };
}

/**
 * Calculate new order mapping after a drag-and-drop reorder
 */
export function calculateReorderMapping(
  stages: WorkflowStage[],
  draggedStageId: number,
  newIndex: number,
  stageType: StageType,
): Record<string, number> {
  // Filter stages of the same type and sort by order
  const stagesInType = stages
    .filter((s) => s.stage === stageType)
    .sort((a, b) => a.order - b.order);

  // Find the dragged stage
  const draggedIndex = stagesInType.findIndex((s) => s.id === draggedStageId);
  if (draggedIndex === -1) return {};

  // Remove from old position and insert at new position
  const reordered = [...stagesInType];
  const [removed] = reordered.splice(draggedIndex, 1);
  reordered.splice(newIndex, 0, removed);

  // Create order mapping
  const orderMapping: Record<string, number> = {};
  reordered.forEach((stage, index) => {
    orderMapping[stage.id.toString()] = index + 1;
  });

  return orderMapping;
}
