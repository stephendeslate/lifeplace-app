// frontend/admin-crm/src/components/shared/ConditionalBlockExtension.tsx
// TipTap extension for visual conditional content blocks

import { Node, mergeAttributes, type ChainedCommands } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { NodeViewProps } from '@tiptap/react';

// Condition operators
type ConditionOperator =
  | 'exists'
  | 'not_exists'
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater'
  | 'less';

interface ConditionConfig {
  variable: string;
  operator: ConditionOperator;
  value?: string;
}

// Human-readable label for condition
const getConditionLabel = (config: ConditionConfig): string => {
  const varLabel = config.variable.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  switch (config.operator) {
    case 'exists':
      return `If ${varLabel} exists`;
    case 'not_exists':
      return `If ${varLabel} does not exist`;
    case 'equals':
      return `If ${varLabel} = "${config.value}"`;
    case 'not_equals':
      return `If ${varLabel} != "${config.value}"`;
    case 'contains':
      return `If ${varLabel} contains "${config.value}"`;
    case 'greater':
      return `If ${varLabel} > ${config.value}`;
    case 'less':
      return `If ${varLabel} < ${config.value}`;
    default:
      return `If ${varLabel}`;
  }
};

// Generate Django template syntax
const generateDjangoCondition = (config: ConditionConfig): string => {
  switch (config.operator) {
    case 'exists':
      return `{% if ${config.variable} %}`;
    case 'not_exists':
      return `{% if not ${config.variable} %}`;
    case 'equals':
      return `{% if ${config.variable} == '${config.value}' %}`;
    case 'not_equals':
      return `{% if ${config.variable} != '${config.value}' %}`;
    case 'contains':
      return `{% if '${config.value}' in ${config.variable} %}`;
    case 'greater':
      return `{% if ${config.variable} > ${config.value} %}`;
    case 'less':
      return `{% if ${config.variable} < ${config.value} %}`;
    default:
      return `{% if ${config.variable} %}`;
  }
};

// Configuration dialog component
interface ConditionalConfigDialogProps {
  open: boolean;
  condition: ConditionConfig;
  onSave: (config: ConditionConfig) => void;
  onClose: () => void;
}

const ConditionalConfigDialog: React.FC<ConditionalConfigDialogProps> = ({
  open,
  condition,
  onSave,
  onClose,
}) => {
  const [config, setConfig] = useState<ConditionConfig>(condition);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const needsValue = ['equals', 'not_equals', 'contains', 'greater', 'less'].includes(
    config.operator,
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Condition</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Variable"
            value={config.variable}
            onChange={(e) => setConfig({ ...config, variable: e.target.value })}
            fullWidth
            placeholder="e.g., client_name, vip_status"
            helperText="Enter the variable name without {{ }}"
          />

          <FormControl fullWidth>
            <InputLabel>Condition</InputLabel>
            <Select
              value={config.operator}
              label="Condition"
              onChange={(e) =>
                setConfig({ ...config, operator: e.target.value as ConditionOperator })
              }
            >
              <MenuItem value="exists">Exists (has a value)</MenuItem>
              <MenuItem value="not_exists">Does not exist (empty)</MenuItem>
              <MenuItem value="equals">Equals</MenuItem>
              <MenuItem value="not_equals">Does not equal</MenuItem>
              <MenuItem value="contains">Contains</MenuItem>
              <MenuItem value="greater">Greater than</MenuItem>
              <MenuItem value="less">Less than</MenuItem>
            </Select>
          </FormControl>

          {needsValue && (
            <TextField
              label="Value"
              value={config.value || ''}
              onChange={(e) => setConfig({ ...config, value: e.target.value })}
              fullWidth
              placeholder="Enter comparison value"
            />
          )}

          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Preview:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
              {generateDjangoCondition(config)}
            </Typography>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={!config.variable}>
          Apply Condition
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Node view component for the conditional block
const ConditionalBlockComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const [isConfiguring, setIsConfiguring] = useState(false);

  const condition: ConditionConfig = {
    variable: node.attrs.variable || '',
    operator: node.attrs.operator || 'exists',
    value: node.attrs.value || '',
  };

  const handleSave = (newConfig: ConditionConfig) => {
    updateAttributes({
      variable: newConfig.variable,
      operator: newConfig.operator,
      value: newConfig.value,
      label: getConditionLabel(newConfig),
    });
  };

  const hasCondition = condition.variable.length > 0;

  return (
    <NodeViewWrapper>
      <Paper
        variant="outlined"
        sx={{
          borderColor: selected ? 'warning.main' : 'warning.200',
          borderStyle: 'dashed',
          borderWidth: 2,
          p: 2,
          my: 1,
          backgroundColor: 'warning.50',
          position: 'relative',
        }}
      >
        {/* Header with condition badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Chip
            icon={<FilterIcon sx={{ fontSize: 16 }} />}
            label={hasCondition ? node.attrs.label : 'Click to set condition'}
            size="small"
            color="warning"
            variant={hasCondition ? 'filled' : 'outlined'}
            onClick={() => setIsConfiguring(true)}
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'warning.200' },
            }}
          />

          <Box sx={{ flex: 1 }} />

          <IconButton size="small" onClick={() => setIsConfiguring(true)}>
            <EditIcon fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={deleteNode} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Editable content area */}
        <Box
          sx={{
            borderTop: '1px dashed',
            borderColor: 'warning.200',
            pt: 1.5,
            minHeight: 40,
          }}
        >
          <NodeViewContent className="conditional-content" />
        </Box>

        {/* Configuration dialog */}
        <ConditionalConfigDialog
          open={isConfiguring}
          condition={condition}
          onSave={handleSave}
          onClose={() => setIsConfiguring(false)}
        />
      </Paper>
    </NodeViewWrapper>
  );
};

/**
 * ConditionalBlock Extension
 *
 * Creates a visual conditional block that wraps content in
 * Django template conditionals ({% if %}...{% endif %}).
 *
 * Features:
 * - Visual dashed border to indicate conditional content
 * - Click to configure condition
 * - Multiple condition operators
 * - Editable content inside the block
 *
 * @example
 * // Add to extensions
 * const extensions = [
 *   StarterKit,
 *   ConditionalBlock,
 *   // ... other extensions
 * ];
 *
 * // Insert via command
 * editor.chain().insertContent({
 *   type: 'conditionalBlock',
 *   content: [{ type: 'paragraph' }],
 * }).run();
 */
export const ConditionalBlock = Node.create({
  name: 'conditionalBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variable: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-variable'),
        renderHTML: (attributes) => ({ 'data-variable': attributes.variable }),
      },
      operator: {
        default: 'exists',
        parseHTML: (element) => element.getAttribute('data-operator'),
        renderHTML: (attributes) => ({ 'data-operator': attributes.operator }),
      },
      value: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-value'),
        renderHTML: (attributes) => ({ 'data-value': attributes.value }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => ({ 'data-label': attributes.label }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-conditional]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Store condition data for later serialization
    // The actual {% if %} and {% endif %} tags are added during export
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-conditional': 'true',
        class: 'conditional-block',
      }),
      0, // Content placeholder
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalBlockComponent);
  },

  addCommands() {
    return {
      insertConditionalBlock:
        () =>
        ({ chain }: { chain: () => ChainedCommands }) => {
          return chain()
            .insertContent({
              type: 'conditionalBlock',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Conditional content here...',
                    },
                  ],
                },
              ],
            })
            .run();
        },
    } as Partial<Record<string, (...args: unknown[]) => unknown>>;
  },
});

export default ConditionalBlock;
