// frontend/admin-crm/src/components/workflows/flowchart/nodes/AddStageNode.tsx

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { AddStageNodeData } from '../types';
import { getSwimlaneConfig } from '../types';

const AddStageNodeComponent: React.FC<NodeProps> = ({ data }) => {
  const { stageType, onClick, position } = data as AddStageNodeData;
  const swimlaneConfig = getSwimlaneConfig(stageType);

  const handleClick = () => {
    onClick(stageType, position);
  };

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: swimlaneConfig.color,
          width: 8,
          height: 8,
          opacity: 0.5,
        }}
      />

      <Tooltip title={`Add stage to ${swimlaneConfig.label}`} placement="top">
        <Box
          sx={{
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${swimlaneConfig.color}10`,
            border: '2px dashed',
            borderColor: `${swimlaneConfig.color}50`,
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: `${swimlaneConfig.color}20`,
              borderColor: swimlaneConfig.color,
              transform: 'scale(1.05)',
            },
          }}
        >
          <IconButton
            onClick={handleClick}
            sx={{
              color: swimlaneConfig.color,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Tooltip>
    </>
  );
};

export const AddStageNode = memo(AddStageNodeComponent);
