// frontend/admin-crm/src/components/shared/RichTextEditor.tsx

import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
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
  type RichTextEditorRef,
} from 'mui-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

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
}, ref) => {
  const editorRef = useRef<RichTextEditorRef>(null);

  // Create extensions with placeholder
  const extensions = [
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
    Placeholder.configure({
      placeholder,
    }),
  ];

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const editor = editorRef.current?.editor;
    if (editor) {
      const variableText = `{{ ${variable} }}`;
      
      editor
        .chain()
        .focus()
        .insertContent(`<span style="background-color: #e3f2fd; color: #1976d2; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.875em; font-weight: bold;">${variableText}</span>&nbsp;`)
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
          // Force the editor container to respect our height
          '& .MuiRichTextEditor-root': {
            height: 'auto',
          },
          // Control the toolbar height
          '& .MuiRichTextEditor-toolbar': {
            minHeight: 'auto',
            padding: '8px',
          },
          // Style the editor field wrapper
          '& .MuiOutlinedInput-root': {
            minHeight: minHeight + 48, // Add space for toolbar
            maxHeight: minHeight + 48,
            alignItems: 'flex-start',
            padding: 0,
            ...(error && {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'error.main',
              },
            }),
            ...(disabled && {
              opacity: 0.6,
              pointerEvents: 'none',
            }),
          },
          // Control the actual editor content area
          '& .ProseMirror': {
            minHeight: minHeight - 48, // Subtract toolbar height
            maxHeight: minHeight - 48,
            padding: '12px 14px',
            outline: 'none',
            fontSize: '1rem',
            fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
            lineHeight: 1.5,
            overflow: 'auto', // Allow scrolling if content exceeds height
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
            // Variable placeholder styling
            '& span[style*="background-color: #e3f2fd"]': {
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
        />
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