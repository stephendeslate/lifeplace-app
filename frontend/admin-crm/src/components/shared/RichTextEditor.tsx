// frontend/admin-crm/src/components/shared/RichTextEditor.tsx

import { useRef, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  RichTextEditor as MUITiptapEditor,
  MenuControlsContainer,
  MenuSelectHeading,
  MenuDivider,
  MenuButtonBold,
  MenuButtonItalic,
  MenuButtonUnderline,
  MenuButtonStrikethrough,
  MenuButtonOrderedList,
  MenuButtonBulletedList,
  MenuButtonBlockquote,
  MenuButtonCode,
  MenuButtonCodeBlock,
  MenuButtonEditLink,
  MenuButtonUndo,
  MenuButtonRedo,
  MenuButtonAlignLeft,
  MenuButtonAlignCenter,
  MenuButtonAlignRight,
  MenuButtonAlignJustify,
  MenuButtonIndent,
  MenuButtonUnindent,
  MenuButtonHorizontalRule,
  LinkBubbleMenu,
  LinkBubbleMenuHandler,
  type RichTextEditorRef,
} from 'mui-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  VariableMention,
  setVariableSchemas,
  setContextType,
} from './VariableMentionExtension';
import { SlashCommands } from './SlashCommandExtension';
import { ConditionalBlock } from './ConditionalBlockExtension';
import { getVariableLabel } from '../../hooks/useTemplateVariables';
import type { VariableSchemas, ContextType } from '../../types/templates.types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  showVariableInsert?: boolean;
  onVariableInsert?: (variable: string) => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  /** Variable schemas for autocomplete - enables variable pills when provided */
  variableSchemas?: VariableSchemas;
  /** Current context type for filtering available variables */
  contextType?: ContextType;
}

export interface RichTextEditorHandle {
  insertVariable: (variable: string) => void;
  focus: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = "Start typing...",
  disabled = false,
  minHeight = 150,
  showVariableInsert: _showVariableInsert = false,
  onVariableInsert: _onVariableInsert,
  error = false,
  helperText,
  label,
  variableSchemas,
  contextType,
}, ref) => {
  const editorRef = useRef<RichTextEditorRef>(null);

  // Update variable schemas when they change (for autocomplete)
  useEffect(() => {
    setVariableSchemas(variableSchemas);
  }, [variableSchemas]);

  // Update context type when it changes (for filtering variables)
  useEffect(() => {
    setContextType(contextType);
  }, [contextType]);

  // Create extensions with placeholder, variable mention, and slash commands
  const extensions = useMemo(() => [
    StarterKit.configure({
      history: {
        depth: 20,
      },
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
    }),
    LinkBubbleMenuHandler,
    Placeholder.configure({
      placeholder,
    }),
    VariableMention,
    SlashCommands,
    ConditionalBlock,
  ], [placeholder]);

  // Insert variable at cursor position using the VariableMention extension
  const insertVariable = (variable: string) => {
    const editor = editorRef.current?.editor;
    if (editor) {
      // Insert as a mention node for proper pill rendering
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'variableMention',
            attrs: {
              id: variable,
              label: getVariableLabel(variable),
            },
          },
          {
            type: 'text',
            text: ' ',
          },
        ])
        .run();
    }
  };

  const focus = () => {
    editorRef.current?.editor?.commands.focus();
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    insertVariable,
    focus,
  }));

  // Handle content changes
  const handleChange = (content: string) => {
    onChange(content);
  };

  // Sync content when value prop changes (controlled component behavior)
  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (editor && !editor.isDestroyed && editor.getHTML() !== value) {
      if (!editor.isFocused) {
        editor.commands.setContent(value, false);
      }
    }
  }, [value]);

  const renderControls = () => (
    <MenuControlsContainer>
      <MenuButtonUndo />
      <MenuButtonRedo />
      <MenuDivider />
      <MenuSelectHeading />
      <MenuDivider />
      <MenuButtonBold />
      <MenuButtonItalic />
      <MenuButtonUnderline />
      <MenuButtonStrikethrough />
      <MenuButtonCode />
      <MenuDivider />
      <MenuButtonAlignLeft />
      <MenuButtonAlignCenter />
      <MenuButtonAlignRight />
      <MenuButtonAlignJustify />
      <MenuDivider />
      <MenuButtonBulletedList />
      <MenuButtonOrderedList />
      <MenuButtonIndent />
      <MenuButtonUnindent />
      <MenuDivider />
      <MenuButtonBlockquote />
      <MenuButtonCodeBlock />
      <MenuButtonEditLink />
      <MenuButtonHorizontalRule />
    </MenuControlsContainer>
  );

  return (
    <Box>
      {label && (
        <Box mb={1}>
          <Typography 
            variant="caption"
            component="label"
            sx={{ 
              color: error ? 'error.main' : 'text.secondary',
              fontWeight: 400,
            }}
          >
            {label}
          </Typography>
        </Box>
      )}
      
      <Box
        sx={{
          border: '1px solid',
          borderColor: error ? 'error.main' : 'rgba(0, 0, 0, 0.23)',
          borderRadius: 1,
          overflow: 'hidden',
          '&:hover': {
            borderColor: error ? 'error.main' : 'rgba(0, 0, 0, 0.87)',
          },
          '&:focus-within': {
            borderColor: error ? 'error.main' : 'primary.main',
            borderWidth: 2,
            margin: '-1px', // Compensate for thicker border
          },
          ...(disabled && {
            opacity: 0.6,
            pointerEvents: 'none',
          }),
          // Compact toolbar styling
          '& .MuiTiptap-MenuControlsContainer-root, & [class*="MenuControlsContainer"]': {
            padding: '4px 8px',
            gap: '2px',
            flexWrap: 'wrap',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          },
          // Smaller toolbar buttons
          '& .MuiTiptap-MenuButton-root, & [class*="MenuButton"]': {
            padding: '4px',
            minWidth: '28px',
            minHeight: '28px',
          },
          '& .MuiTiptap-MenuButton-root svg, & [class*="MenuButton"] svg': {
            fontSize: '18px',
          },
          // Compact heading select
          '& .MuiTiptap-MenuSelectHeading-root, & [class*="MenuSelectHeading"]': {
            minHeight: '28px',
            '& .MuiSelect-select': {
              padding: '4px 8px',
              fontSize: '0.8125rem',
            },
          },
          // Hide the MUI outlined input wrapper styling
          '& .MuiOutlinedInput-root': {
            border: 'none',
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
          },
          // Control the actual editor content area
          '& .ProseMirror': {
            minHeight: minHeight,
            padding: '12px 14px',
            outline: 'none',
            fontSize: '1rem',
            fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
            lineHeight: 1.5,
            overflow: 'auto',
            '& p': {
              margin: '0 0 8px 0',
              '&:last-child': {
                marginBottom: 0,
              },
              // Placeholder styling
              '&.is-editor-empty:first-of-type::before': {
                content: `"${placeholder}"`,
                float: 'left',
                color: 'rgba(0, 0, 0, 0.6)',
                pointerEvents: 'none',
                height: 0,
                fontStyle: 'italic',
              },
            },
            '& ul, & ol': {
              marginLeft: '20px',
              marginBottom: '8px',
            },
            '& li': {
              marginBottom: '4px',
            },
            '& a': {
              color: 'primary.main',
              textDecoration: 'underline',
            },
            '& pre': {
              backgroundColor: 'grey.100',
              padding: '8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
            },
            '& code': {
              backgroundColor: 'grey.100',
              padding: '2px 4px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            },
            '& blockquote': {
              borderLeft: '4px solid #ccc',
              margin: '0 0 8px 0',
              paddingLeft: '16px',
              fontStyle: 'italic',
            },
            '& hr': {
              border: 'none',
              borderTop: '1px solid #ccc',
              margin: '16px 0',
            },
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              marginTop: '16px',
              marginBottom: '8px',
              fontWeight: 'bold',
              '&:first-of-type': {
                marginTop: 0,
              },
            },
            '& h1': { fontSize: '2rem' },
            '& h2': { fontSize: '1.5rem' },
            '& h3': { fontSize: '1.25rem' },
            '& h4': { fontSize: '1.125rem' },
            '& h5': { fontSize: '1rem' },
            '& h6': { fontSize: '0.875rem' },
            // Variable pill styling - modern pill appearance
            '& .variable-pill, & span[data-type="variable"]': {
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#e3f2fd',
              color: '#1565c0',
              padding: '1px 8px',
              borderRadius: '12px',
              fontSize: '0.875em',
              fontWeight: 500,
              border: '1px solid #90caf9',
              cursor: 'default',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              verticalAlign: 'baseline',
              lineHeight: 1.5,
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: '#bbdefb',
                borderColor: '#64b5f6',
              },
              '&.ProseMirror-selectednode': {
                backgroundColor: '#90caf9',
                borderColor: '#42a5f5',
                outline: 'none',
              },
            },
            // Legacy variable placeholder styling (for backwards compatibility)
            '& span[style*="background-color: #e3f2fd"]:not([data-type])': {
              backgroundColor: '#e3f2fd !important',
              color: '#1976d2 !important',
              padding: '2px 4px !important',
              borderRadius: '3px !important',
              fontFamily: 'monospace !important',
              fontSize: '0.875em !important',
              fontWeight: 'bold !important',
            },
          },
        }}
      >
        <MUITiptapEditor
          ref={editorRef}
          extensions={extensions}
          content={value}
          onUpdate={({ editor }) => {
            handleChange(editor.getHTML());
          }}
          renderControls={renderControls}
          editable={!disabled}
        >
          {() => (
            <LinkBubbleMenu />
          )}
        </MUITiptapEditor>
      </Box>
      
      {helperText && (
        <Box mt={0.5}>
          <Typography 
            variant="caption"
            sx={{ 
              color: error ? 'error.main' : 'text.secondary',
              fontWeight: 400,
            }}
          >
            {helperText}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;