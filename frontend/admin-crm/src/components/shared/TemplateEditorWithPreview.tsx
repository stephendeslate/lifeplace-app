// frontend/admin-crm/src/components/shared/TemplateEditorWithPreview.tsx
// Split-pane editor with live preview for template editing

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  TextField,
  Stack,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import DOMPurify from 'dompurify';
import TemplateContentEditor from './TemplateContentEditor';
import type {
  TemplateEditorMode,
  TemplateContentEditorHandle,
  VariableSchemas,
  ContextType,
} from '../../types/templates.types';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface TemplateEditorWithPreviewProps {
  /** Current content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Current editor mode */
  mode: TemplateEditorMode;
  /** Callback when mode changes */
  onModeChange?: (mode: TemplateEditorMode) => void;
  /** Available modes */
  availableModes?: TemplateEditorMode[];
  /** Preview data for variable substitution */
  previewData: Record<string, string>;
  /** Callback when preview data changes */
  onPreviewDataChange: (data: Record<string, string>) => void;
  /** Preview render function - should return rendered HTML */
  renderPreview: (content: string, data: Record<string, string>) => Promise<string>;
  /** Variable schemas for autocomplete */
  variableSchemas?: VariableSchemas;
  /** Current context type */
  contextType?: ContextType;
  /** Subject template (for email templates) */
  subjectValue?: string;
  /** Subject change callback */
  onSubjectChange?: (value: string) => void;
  /** Whether to show subject field */
  showSubject?: boolean;
  /** Label for the editor */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height for editor */
  minHeight?: number;
  /** Whether editor is disabled */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Helper text */
  helperText?: string;
}

/**
 * TemplateEditorWithPreview - Split-pane template editor with live preview
 *
 * Features:
 * - Side-by-side layout: Editor on left, preview on right
 * - Live preview updates with debouncing
 * - Collapsible preview variables section
 * - Responsive design for smaller screens
 */
export const TemplateEditorWithPreview: React.FC<TemplateEditorWithPreviewProps> = ({
  value,
  onChange,
  mode,
  onModeChange,
  availableModes = ['visual', 'html'],
  previewData,
  onPreviewDataChange,
  renderPreview,
  variableSchemas,
  contextType,
  subjectValue,
  onSubjectChange,
  showSubject = false,
  label = 'Template Content',
  placeholder,
  minHeight = 300,
  disabled = false,
  error = false,
  helperText,
}) => {
  const editorRef = useRef<TemplateContentEditorHandle>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);

  // Debounce content for preview updates
  const debouncedValue = useDebounce(value, 800);
  const debouncedSubject = useDebounce(subjectValue || '', 800);

  // Extract variables from content
  const extractedVariables = useMemo(() => {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    // Extract from body
    while ((match = regex.exec(value)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    // Extract from subject
    if (subjectValue) {
      const subjectRegex = /\{\{\s*(\w+)\s*\}\}/g;
      while ((match = subjectRegex.exec(subjectValue)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
    }

    return variables;
  }, [value, subjectValue]);

  // Update preview when content or data changes
  useEffect(() => {
    const updatePreview = async () => {
      if (!debouncedValue) {
        setPreviewContent('');
        return;
      }

      setIsLoading(true);
      setPreviewError(null);

      try {
        const rendered = await renderPreview(debouncedValue, previewData);
        setPreviewContent(rendered);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Preview failed');
        setPreviewContent('');
      } finally {
        setIsLoading(false);
      }
    };

    updatePreview();
  }, [debouncedValue, debouncedSubject, previewData, renderPreview]);

  // Handle preview data change
  const handlePreviewDataChange = (variable: string, value: string) => {
    onPreviewDataChange({
      ...previewData,
      [variable]: value,
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        minHeight: minHeight + 100,
      }}
    >
      {/* Left Panel: Editor */}
      <Box
        sx={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <EditIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="subtitle2" color="text.secondary">
            Edit Template
          </Typography>
        </Box>

        {/* Subject field for emails */}
        {showSubject && onSubjectChange && (
          <TextField
            label="Subject"
            value={subjectValue}
            onChange={(e) => onSubjectChange(e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
            sx={{ mb: 2 }}
          />
        )}

        {/* Main editor */}
        <TemplateContentEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          mode={mode}
          onModeChange={onModeChange}
          showModeToggle={true}
          availableModes={availableModes}
          variableSchemas={variableSchemas}
          contextType={contextType}
          label={label}
          placeholder={placeholder}
          minHeight={minHeight}
          disabled={disabled}
          error={error}
          helperText={helperText}
        />
      </Box>

      {/* Divider */}
      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
      <Divider sx={{ display: { xs: 'block', md: 'none' } }} />

      {/* Right Panel: Preview */}
      <Box
        sx={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              Live Preview
            </Typography>
            {isLoading && <CircularProgress size={14} sx={{ ml: 1 }} />}
          </Box>

          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Refresh preview">
              <IconButton
                size="small"
                onClick={() => {
                  // Force re-render by updating preview data timestamp
                  onPreviewDataChange({ ...previewData, _timestamp: Date.now().toString() });
                }}
                disabled={isLoading}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={showVariables ? 'Hide variables' : 'Edit preview variables'}>
              <IconButton size="small" onClick={() => setShowVariables(!showVariables)}>
                {showVariables ? (
                  <CollapseIcon fontSize="small" />
                ) : (
                  <ExpandIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Preview Variables Editor */}
        <Collapse in={showVariables}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Edit sample values for preview
            </Typography>
            {extractedVariables.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No variables found in template
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {extractedVariables.map((variable) => (
                  <TextField
                    key={variable}
                    label={variable.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    value={previewData[variable] || ''}
                    onChange={(e) => handlePreviewDataChange(variable, e.target.value)}
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <Chip
                          label={variable}
                          size="small"
                          sx={{ mr: 1, height: 20, fontSize: '0.625rem', fontFamily: 'monospace' }}
                        />
                      ),
                    }}
                  />
                ))}
              </Stack>
            )}
          </Paper>
        </Collapse>

        {/* Preview Content */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            minHeight: minHeight,
            backgroundColor: 'grey.50',
          }}
        >
          {previewError ? (
            <Typography color="error" variant="body2">
              {previewError}
            </Typography>
          ) : previewContent ? (
            <Box
              sx={{
                '& p': { margin: '0 0 8px 0' },
                '& ul, & ol': { marginLeft: '20px', marginBottom: '8px' },
                '& a': { color: 'primary.main' },
                '& h1': { fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' },
                '& h2': { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' },
                '& h3': { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' },
                '& blockquote': {
                  borderLeft: '4px solid #ccc',
                  paddingLeft: '16px',
                  margin: '0 0 8px 0',
                  fontStyle: 'italic',
                },
                '& .variable-pill, & span[data-type="variable"]': {
                  backgroundColor: '#e3f2fd',
                  color: '#1565c0',
                  padding: '1px 8px',
                  borderRadius: '12px',
                  fontSize: '0.875em',
                  fontWeight: 500,
                },
              }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(previewContent),
              }}
            />
          ) : (
            <Typography color="text.secondary" variant="body2" fontStyle="italic">
              Start typing to see preview...
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default TemplateEditorWithPreview;
