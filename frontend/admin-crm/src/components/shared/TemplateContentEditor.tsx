// frontend/admin-crm/src/components/shared/TemplateContentEditor.tsx
// Unified content editor for templates - supports visual, HTML, and text modes

import React, { useRef, useImperativeHandle, forwardRef, useId } from 'react';
import {
  Box,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Code as CodeIcon,
  Edit as EditIcon,
  TextFields as TextIcon,
} from '@mui/icons-material';
import RichTextEditor, { type RichTextEditorHandle } from './RichTextEditor';
import type {
  TemplateContentEditorProps,
  TemplateContentEditorHandle,
  TemplateEditorMode,
} from '../../types/templates.types';
import { tokens } from '../../design-system';
import { glassInputStyles } from '../../design-system/utils/glassmorphism';

/**
 * TemplateContentEditor - A unified content editor for template editing
 *
 * Supports three modes:
 * - 'visual': Rich text editor (WYSIWYG) using TipTap
 * - 'html': Monospace textarea for HTML editing
 * - 'text': Plain textarea for SMS/text content
 *
 * @example
 * // Communications EMAIL - with mode toggle
 * <TemplateContentEditor
 *   value={content}
 *   onChange={setContent}
 *   mode={editorMode}
 *   onModeChange={setEditorMode}
 *   showModeToggle={true}
 *   availableModes={['visual', 'html']}
 * />
 *
 * @example
 * // Contracts - HTML only, no toggle
 * <TemplateContentEditor
 *   value={content}
 *   onChange={setContent}
 *   mode="html"
 *   showModeToggle={false}
 *   rows={12}
 * />
 *
 * @example
 * // SMS - text mode with character count
 * <TemplateContentEditor
 *   value={content}
 *   onChange={setContent}
 *   mode="text"
 *   showCharacterCount={true}
 *   maxCharacters={160}
 * />
 */
export const TemplateContentEditor = forwardRef<
  TemplateContentEditorHandle,
  TemplateContentEditorProps
>(({
  value,
  onChange,
  mode,
  onModeChange,
  showModeToggle = false,
  availableModes = ['visual', 'html'],
  placeholder = 'Enter content...',
  rows = 10,
  minHeight = 200,
  error = false,
  helperText,
  label,
  disabled = false,
  showCharacterCount = false,
  maxCharacters,
}, ref) => {
  const richTextEditorRef = useRef<RichTextEditorHandle>(null);
  const textareaId = useId();

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const variableText = `{{ ${variable} }}`;

    if (mode === 'visual' && richTextEditorRef.current) {
      richTextEditorRef.current.insertVariable(variable);
    } else {
      // For HTML/text mode, insert at textarea cursor position
      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = value;
        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = before + variableText + after;
        onChange(newText);

        // Set cursor position after inserted variable
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + variableText.length;
        }, 0);
      } else {
        // Fallback: append to end
        onChange(value + variableText);
      }
    }
  };

  const focus = () => {
    if (mode === 'visual' && richTextEditorRef.current) {
      richTextEditorRef.current.focus();
    } else {
      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
      textarea?.focus();
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    insertVariable,
    focus,
  }));

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: TemplateEditorMode | null) => {
    if (newMode && onModeChange) {
      onModeChange(newMode);
    }
  };

  const getModeIcon = (m: TemplateEditorMode) => {
    switch (m) {
      case 'visual':
        return <EditIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      case 'html':
        return <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      case 'text':
        return <TextIcon sx={{ fontSize: 16, mr: 0.5 }} />;
    }
  };

  const getModeLabel = (m: TemplateEditorMode) => {
    switch (m) {
      case 'visual':
        return 'Visual';
      case 'html':
        return 'HTML';
      case 'text':
        return 'Text';
    }
  };

  const getPlaceholder = () => {
    if (placeholder !== 'Enter content...') return placeholder;

    switch (mode) {
      case 'visual':
        return 'Start typing your content... Use variables for dynamic content.';
      case 'html':
        return '<div>Your HTML content here...</div>';
      case 'text':
        return 'Hi {{ first_name }}! Your message here...';
    }
  };

  const characterCount = value.length;
  const isOverLimit = maxCharacters !== undefined && characterCount > maxCharacters;

  return (
    <Box>
      {/* Header with label and mode toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        {label && (
          <Typography
            variant="body2"
            color={error ? 'error.main' : 'text.secondary'}
            fontWeight={500}
          >
            {label}
            {mode !== 'visual' && (
              <span> ({mode === 'html' ? 'HTML Source' : 'Plain Text'})</span>
            )}
          </Typography>
        )}

        {showModeToggle && availableModes.length > 1 && (
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{
              borderRadius: tokens.spacing.radius.full,
              border: `1px solid ${tokens.color.borders.glass}`,
              overflow: 'hidden',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 0,
                px: 2,
                py: 0.5,
                fontWeight: 500,
              },
            }}
          >
            {availableModes.map((m) => (
              <ToggleButton key={m} value={m} disabled={disabled}>
                {getModeIcon(m)}
                {getModeLabel(m)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Editor content */}
      {mode === 'visual' ? (
        <RichTextEditor
          ref={richTextEditorRef}
          value={value}
          onChange={onChange}
          placeholder={getPlaceholder()}
          minHeight={minHeight}
          disabled={disabled}
          error={error}
          helperText={helperText}
        />
      ) : (
        <Box>
          <TextField
            id={textareaId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            multiline
            rows={rows}
            fullWidth
            disabled={disabled}
            error={error}
            placeholder={getPlaceholder()}
            sx={{
              ...glassInputStyles,
              '& .MuiInputBase-input': {
                fontFamily: mode === 'html' ? 'monospace' : 'inherit',
                fontSize: mode === 'html' ? '0.875rem' : '1rem',
              },
            }}
          />

          {/* Character count for text mode */}
          {showCharacterCount && (
            <Box mt={1} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {helperText}
              </Typography>
              <Typography
                variant="caption"
                color={isOverLimit ? 'warning.main' : 'text.secondary'}
              >
                {characterCount}{maxCharacters && `/${maxCharacters}`}
                {isOverLimit && ' (will be sent as multiple messages)'}
              </Typography>
            </Box>
          )}

          {/* Helper text for non-text modes */}
          {!showCharacterCount && helperText && (
            <Typography
              variant="caption"
              color={error ? 'error.main' : 'text.secondary'}
              sx={{ mt: 0.5, display: 'block' }}
            >
              {helperText}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
});

TemplateContentEditor.displayName = 'TemplateContentEditor';

export default TemplateContentEditor;
