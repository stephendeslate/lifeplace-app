// frontend/admin-crm/src/components/workflows/flowchart/WorkflowFlowchart.tsx

import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, Chip, Alert, Stack } from '@mui/material';
import { AccountTree as WorkflowIcon } from '@mui/icons-material';
import { StageNode } from './nodes/StageNode';
import { SwimlaneHeader } from './nodes/SwimlaneHeader';
import { AddStageNode } from './nodes/AddStageNode';
import { ProgressionEdge } from './edges/ProgressionEdge';
import { useFlowchartState } from './hooks/useFlowchartState';
import type { WorkflowFlowchartProps } from './types';
import { getFlowchartBounds } from './utils/layoutCalculator';

// Define custom node types
const nodeTypes: NodeTypes = {
  stage: StageNode,
  swimlaneHeader: SwimlaneHeader,
  addStage: AddStageNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  progression: ProgressionEdge,
};

// Inner component that uses useReactFlow hook
const FlowchartInner: React.FC<WorkflowFlowchartProps> = ({
  stages,
  _templateId,
  mode = 'view',
  selectedStageId: externalSelectedStageId,
  onStageSelect,
  onStageEdit,
  onStageDelete,
  onStageAdd,
  onStagesReorder,
}) => {
  const { fitView } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedStageId,
    setSelectedStageId,
    handleNodeDragStop,
    updateLayout,
  } = useFlowchartState({
    stages,
    mode,
    onStageEdit,
    onStageDelete,
    onStageAdd,
    onStagesReorder,
  });

  // Sync external selection with internal state
  useEffect(() => {
    if (externalSelectedStageId !== undefined) {
      setSelectedStageId(externalSelectedStageId);
    }
  }, [externalSelectedStageId, setSelectedStageId]);

  // Notify parent of selection changes
  useEffect(() => {
    onStageSelect?.(selectedStageId);
  }, [selectedStageId, onStageSelect]);

  // Update layout when stages change
  useEffect(() => {
    updateLayout();
  }, [stages, updateLayout]);

  // Fit view when layout changes
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 100);
  }, [stages.length, fitView]);

  const handlePaneClick = useCallback(() => {
    setSelectedStageId(null);
  }, [setSelectedStageId]);

  // Calculate bounds for minimap
  const _bounds = getFlowchartBounds(stages);

  if (stages.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          minHeight: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          borderRadius: 2,
          p: 4,
        }}
      >
        <WorkflowIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Workflow Stages
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {mode === 'edit'
            ? 'Add stages to visualize your workflow. Use the "Add Stage" button above.'
            : 'This workflow template has no stages defined yet.'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 500,
        backgroundColor: 'grey.50',
        borderRadius: 2,
        overflow: 'hidden',
        '.react-flow__attribution': {
          display: 'none',
        },
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'progression',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Controls */}
        <Controls
          position="bottom-right"
          showInteractive={false}
        />

        {/* Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e2e8f0"
        />

        {/* Mini Map */}
        <MiniMap
          position="bottom-left"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            if (node.type === 'stage') return '#3b82f6';
            if (node.type === 'swimlaneHeader') return '#94a3b8';
            return '#e2e8f0';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          pannable
          zoomable
        />

        {/* Info Panel */}
        <Panel position="top-left">
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${stages.length} stages`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${stages.filter((s) => s.is_automated).length} automated`}
              size="small"
              color="secondary"
              variant="outlined"
            />
            {mode === 'edit' && (
              <Chip
                label="Edit Mode"
                size="small"
                color="primary"
              />
            )}
          </Stack>
        </Panel>

        {/* Mode info */}
        {mode === 'edit' && (
          <Panel position="top-right">
            <Alert severity="info" sx={{ py: 0.5, px: 1.5 }}>
              <Typography variant="caption">
                Drag stages to reorder within their swimlane
              </Typography>
            </Alert>
          </Panel>
        )}
      </ReactFlow>
    </Box>
  );
};

// Main component wrapper
export const WorkflowFlowchart: React.FC<WorkflowFlowchartProps> = (props) => {
  return (
    <FlowchartInner {...props} />
  );
};

export default WorkflowFlowchart;
