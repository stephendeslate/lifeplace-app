// frontend/admin-crm/src/components/workflows/flowchart/edges/ProgressionEdge.tsx

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { Chip } from '@mui/material';
import type { ProgressionEdgeData } from '../types';

export const ProgressionEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as ProgressionEdgeData | undefined;
  const label =
    edgeData?.label || (edgeData?.condition ? edgeData.condition.replace(/_/g, ' ') : null);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 2,
          stroke: '#94a3b8', // slate-400
          ...style,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <Chip
            label={label}
            size="small"
            sx={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              fontSize: '0.7rem',
              height: 20,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default ProgressionEdge;
