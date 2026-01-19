// frontend/admin-crm/src/components/shared/VariablePill.tsx
// Visual pill component for displaying template variables in the editor

import React from 'react';
import { Box } from '@mui/material';
import { NodeViewWrapper } from '@tiptap/react';

interface VariablePillProps {
  /** The raw variable name (e.g., 'client_first_name') */
  variableName: string;
  /** Human-readable label (e.g., 'First Name') */
  label: string;
  /** Whether the variable is selected in the editor */
  selected?: boolean;
  /** Delete handler when the X is clicked */
  onDelete?: () => void;
}

/**
 * VariablePill - Renders a template variable as a styled, deletable chip
 *
 * Displays variables in a user-friendly format:
 * - Shows human-readable label instead of raw variable name
 * - Styled as a pill/chip with consistent branding
 * - Includes delete button for easy removal
 * - Supports selection state for editor integration
 */
export const VariablePill: React.FC<VariablePillProps> = ({
  variableName,
  label,
  selected = false,
  onDelete,
}) => {
  return (
    <Box
      component="span"
      contentEditable={false}
      data-variable={variableName}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: selected ? 'primary.100' : 'primary.50',
        color: 'primary.700',
        borderRadius: '12px',
        px: 1,
        py: 0.25,
        fontSize: '0.875em',
        fontWeight: 500,
        fontFamily: 'inherit',
        lineHeight: 1.5,
        verticalAlign: 'baseline',
        border: '1px solid',
        borderColor: selected ? 'primary.400' : 'primary.200',
        cursor: 'default',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        '&:hover': {
          backgroundColor: 'primary.100',
          borderColor: 'primary.300',
        },
      }}
    >
      <span>{label}</span>
      {onDelete && (
        <Box
          component="span"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: 'primary.200',
            color: 'primary.600',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            ml: 0.25,
            '&:hover': {
              backgroundColor: 'primary.300',
              color: 'primary.800',
            },
          }}
        >
          x
        </Box>
      )}
    </Box>
  );
};

/**
 * VariablePillNodeView - TipTap NodeView wrapper for the VariablePill
 * Used when rendering variable mentions inside the TipTap editor
 */
interface VariablePillNodeViewProps {
  node: {
    attrs: {
      id: string;
      label: string;
    };
  };
  selected: boolean;
  deleteNode: () => void;
}

export const VariablePillNodeView: React.FC<VariablePillNodeViewProps> = ({
  node,
  selected,
  deleteNode,
}) => {
  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <VariablePill
        variableName={node.attrs.id}
        label={node.attrs.label}
        selected={selected}
        onDelete={deleteNode}
      />
    </NodeViewWrapper>
  );
};

export default VariablePill;
