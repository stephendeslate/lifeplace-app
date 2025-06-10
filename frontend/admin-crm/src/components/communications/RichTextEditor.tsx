// frontend/admin-crm/src/components/communications/RichTextEditor.tsx

import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Divider,
  Tooltip,
  Stack
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Link,
  Code,
  Undo,
  Redo
} from '@mui/icons-material';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  disabled = false,
  minHeight = 200
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  // @ts-ignore
  const [isActive, setIsActive] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  // Handle selection changes to update active formats
  const handleSelectionChange = () => {
    const formats: string[] = [];
    
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    if (document.queryCommandState('insertOrderedList')) formats.push('ol');
    if (document.queryCommandState('insertUnorderedList')) formats.push('ul');
    
    setActiveFormats(formats);
  };

  // Execute formatting commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleSelectionChange();
    handleInput();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            execCommand('redo');
          } else {
            e.preventDefault();
            execCommand('undo');
          }
          break;
        case 'y':
          e.preventDefault();
          execCommand('redo');
          break;
      }
    }
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  // Format button component
  const FormatButton: React.FC<{
    command: string;
    icon: React.ReactNode;
    tooltip: string;
    active?: boolean;
    value?: string;
    onClick?: () => void;
  }> = ({ command, icon, tooltip, active = false, value, onClick }) => (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={onClick || (() => execCommand(command, value))}
        size="small"
        sx={{ 
          borderRadius: 1,
          backgroundColor: active ? 'primary.main' : 'transparent',
          color: active ? 'primary.contrastText' : 'inherit',
          '&:hover': {
            backgroundColor: active ? 'primary.dark' : 'action.hover',
          }
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box
        sx={{
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50'
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          {/* Undo/Redo */}
          <FormatButton
            command="undo"
            icon={<Undo fontSize="small" />}
            tooltip="Undo (Ctrl+Z)"
          />
          <FormatButton
            command="redo"
            icon={<Redo fontSize="small" />}
            tooltip="Redo (Ctrl+Y)"
          />
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Text Formatting */}
          <FormatButton
            command="bold"
            icon={<FormatBold fontSize="small" />}
            tooltip="Bold (Ctrl+B)"
            active={activeFormats.includes('bold')}
          />
          <FormatButton
            command="italic"
            icon={<FormatItalic fontSize="small" />}
            tooltip="Italic (Ctrl+I)"
            active={activeFormats.includes('italic')}
          />
          <FormatButton
            command="underline"
            icon={<FormatUnderlined fontSize="small" />}
            tooltip="Underline (Ctrl+U)"
            active={activeFormats.includes('underline')}
          />
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Lists */}
          <FormatButton
            command="insertUnorderedList"
            icon={<FormatListBulleted fontSize="small" />}
            tooltip="Bullet List"
            active={activeFormats.includes('ul')}
          />
          <FormatButton
            command="insertOrderedList"
            icon={<FormatListNumbered fontSize="small" />}
            tooltip="Numbered List"
            active={activeFormats.includes('ol')}
          />
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Link */}
          <FormatButton
            command="createLink"
            icon={<Link fontSize="small" />}
            tooltip="Insert Link"
            onClick={insertLink}
          />
          
          {/* Code */}
          <FormatButton
            command="formatBlock"
            icon={<Code fontSize="small" />}
            tooltip="Code Block"
            value="pre"
          />
        </Stack>
      </Box>

      {/* Editor Content */}
      <Box
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onKeyDown={handleKeyDown}
        sx={{
          minHeight,
          p: 2,
          outline: 'none',
          cursor: disabled ? 'default' : 'text',
          opacity: disabled ? 0.6 : 1,
          '&:empty::before': {
            content: `"${placeholder}"`,
            color: 'text.secondary',
            fontStyle: 'italic'
          },
          '& p': {
            margin: '0 0 8px 0',
            '&:last-child': {
              marginBottom: 0
            }
          },
          '& ul, & ol': {
            marginLeft: '20px',
            marginBottom: '8px'
          },
          '& li': {
            marginBottom: '4px'
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'underline'
          },
          '& pre': {
            backgroundColor: 'grey.100',
            padding: '8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            overflow: 'auto'
          },
          '& strong': {
            fontWeight: 'bold'
          },
          '& em': {
            fontStyle: 'italic'
          },
          '& u': {
            textDecoration: 'underline'
          }
        }}
        suppressContentEditableWarning
      />
    </Paper>
  );
};

export default RichTextEditor;