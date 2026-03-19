// frontend/admin-crm/src/components/workflows/flowchart/hooks/useFlowchartState.ts

import { useState, useCallback, useMemo } from 'react';
import {
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import type { WorkflowStage, StageType } from '../../../../types/workflows';
import type { FlowchartNode, FlowchartEdge, FlowchartMode } from '../types';
import { calculateLayout, calculateReorderMapping } from '../utils/layoutCalculator';

interface UseFlowchartStateOptions {
  stages: WorkflowStage[];
  mode?: FlowchartMode;
  onStageEdit?: (stage: WorkflowStage) => void;
  onStageDelete?: (id: number) => void;
  onStageAdd?: (stageType: StageType, position: number) => void;
  onStagesReorder?: (stageType: StageType, orderMapping: Record<string, number>) => void;
}

export function useFlowchartState({
  stages,
  mode = 'view',
  onStageEdit,
  onStageDelete,
  onStageAdd,
  onStagesReorder,
}: UseFlowchartStateOptions) {
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  // Callbacks for node interactions
  const handleEdit = useCallback(
    (stage: WorkflowStage) => {
      onStageEdit?.(stage);
    },
    [onStageEdit],
  );

  const handleDelete = useCallback(
    (id: number) => {
      onStageDelete?.(id);
    },
    [onStageDelete],
  );

  const handleSelect = useCallback((id: number) => {
    setSelectedStageId((prev) => (prev === id ? null : id));
  }, []);

  const handleAddStage = useCallback(
    (stageType: StageType, position: number) => {
      onStageAdd?.(stageType, position);
    },
    [onStageAdd],
  );

  // Calculate initial layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = calculateLayout(
      stages,
      {
        onEdit: handleEdit,
        onDelete: handleDelete,
        onSelect: handleSelect,
        onAddStage: handleAddStage,
      },
      selectedStageId,
      mode,
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [stages, selectedStageId, mode, handleEdit, handleDelete, handleSelect, handleAddStage]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowchartNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowchartEdge>(initialEdges);

  // Update nodes when stages change
  const updateLayout = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = calculateLayout(
      stages,
      {
        onEdit: handleEdit,
        onDelete: handleDelete,
        onSelect: handleSelect,
        onAddStage: handleAddStage,
      },
      selectedStageId,
      mode,
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [
    stages,
    selectedStageId,
    mode,
    handleEdit,
    handleDelete,
    handleSelect,
    handleAddStage,
    setNodes,
    setEdges,
  ]);

  // Handle node drag end for reordering
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: FlowchartNode) => {
      if (mode !== 'edit' || !node.id.startsWith('stage-')) return;

      const stageId = parseInt(node.id.replace('stage-', ''), 10);
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;

      // Find the new position based on X coordinate
      const stagesInType = stages
        .filter((s) => s.stage === stage.stage)
        .sort((a, b) => a.order - b.order);

      // Calculate which position the node was dropped at
      const nodeX = node.position.x;
      let newIndex = 0;
      for (let i = 0; i < stagesInType.length; i++) {
        if (stagesInType[i].id === stageId) continue;
        // Estimate original position of each stage
        const originalX = 220 + i * 320; // Rough calculation
        if (nodeX > originalX) {
          newIndex = i + 1;
        }
      }

      // Only reorder if position changed
      const currentIndex = stagesInType.findIndex((s) => s.id === stageId);
      if (currentIndex !== newIndex) {
        const orderMapping = calculateReorderMapping(stages, stageId, newIndex, stage.stage);
        onStagesReorder?.(stage.stage, orderMapping);
      } else {
        // Reset to original layout
        updateLayout();
      }
    },
    [mode, stages, onStagesReorder, updateLayout],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedStageId(null);
  }, []);

  return {
    nodes,
    edges,
    onNodesChange: onNodesChange as OnNodesChange<FlowchartNode>,
    onEdgesChange: onEdgesChange as OnEdgesChange<FlowchartEdge>,
    selectedStageId,
    setSelectedStageId,
    clearSelection,
    handleNodeDragStop,
    updateLayout,
  };
}
