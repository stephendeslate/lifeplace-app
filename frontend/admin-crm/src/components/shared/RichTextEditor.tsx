// frontend/admin-crm/src/components/shared/RichTextEditor.tsx

import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Divider,
  Tooltip,
  Stack,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Link,
  Code,
  Undo,
  Redo,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify
} from '@mui/icons-material';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  showVariableInsert?: boolean;
  onVariableInsert?: (variable: string) => void;
}

const FONT_SIZES = [
  { value: '1', label: 'Very Small (8px)' },
  { value: '2', label: 'Small (10px)' },
  { value: '3', label: 'Normal (13px)' },
  { value: '4', label: 'Medium (16px)' },
  { value: '5', label: 'Large (18px)' },
  { value: '6', label: 'Very Large (24px)' },
  { value: '7', label: 'Huge (32px)' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  disabled = false,
  minHeight = 200,
  showVariableInsert = false,
  onVariableInsert
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [currentFontSize, setCurrentFontSize] = useState('3');

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
    if (document.queryCommandState('justifyLeft')) formats.push('left');
    if (document.queryCommandState('justifyCenter')) formats.push('center');
    if (document.queryCommandState('justifyRight')) formats.push('right');
    if (document.queryCommandState('justifyFull')) formats.push('justify');
    
    setActiveFormats(formats);

    // Get current font size
    try {
      const fontSize = document.queryCommandValue('fontSize') || '3';
      setCurrentFontSize(fontSize);
    } catch (e) {
      // Fallback if queryCommandValue fails
      setCurrentFontSize('3');
    }
  };

  // Execute formatting commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleSelectionChange();
    handleInput();
  };

  // Handle font size change
  const handleFontSizeChange = (event: SelectChangeEvent<string>) => {
    const size = event.target.value;
    setCurrentFontSize(size);
    execCommand('fontSize', size);
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
        case 'e':
          e.preventDefault();
          execCommand('justifyCenter');
          break;
        case 'l':
          e.preventDefault();
          execCommand('justifyLeft');
          break;
        case 'r':
          e.preventDefault();
          execCommand('justifyRight');
          break;
        case 'j':
          e.preventDefault();
          execCommand('justifyFull');
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

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const variableText = `{{ ${variable} }}`;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'variable-placeholder';
      span.style.backgroundColor = '#e3f2fd';
      span.style.color = '#1976d2';
      span.style.padding = '2px 4px';
      span.style.borderRadius = '3px';
      span.style.fontFamily = 'monospace';
      span.style.fontSize = '0.875em';
      span.style.fontWeight = 'bold';
      span.textContent = variableText;
      
      range.deleteContents();
      range.insertNode(span);
      
      // Move cursor after the inserted variable
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  };

  // Expose insertVariable method for external use
  useEffect(() => {
    if (onVariableInsert && showVariableInsert) {
      // Store the insert function for external use
      (window as any)._richTextEditorInsertVariable = insertVariable;
    }
  }, [onVariableInsert, showVariableInsert]);

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
          
          {/* Font Size */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={currentFontSize}
              onChange={handleFontSizeChange}
              displayEmpty
              sx={{ 
                height: 32,
                '& .MuiSelect-select': {
                  py: 0.5,
                  fontSize: '0.875rem'
                }
              }}
            >
              {FONT_SIZES.map((size) => (
                <MenuItem key={size.value} value={size.value}>
                  {size.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
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
          
          {/* Text Alignment */}
          <FormatButton
            command="justifyLeft"
            icon={<FormatAlignLeft fontSize="small" />}
            tooltip="Align Left (Ctrl+L)"
            active={activeFormats.includes('left')}
          />
          <FormatButton
            command="justifyCenter"
            icon={<FormatAlignCenter fontSize="small" />}
            tooltip="Align Center (Ctrl+E)"
            active={activeFormats.includes('center')}
          />
          <FormatButton
            command="justifyRight"
            icon={<FormatAlignRight fontSize="small" />}
            tooltip="Align Right (Ctrl+R)"
            active={activeFormats.includes('right')}
          />
          <FormatButton
            command="justifyFull"
            icon={<FormatAlignJustify fontSize="small" />}
            tooltip="Justify (Ctrl+J)"
            active={activeFormats.includes('justify')}
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
          
          {/* Link and Code */}
          <FormatButton
            command="createLink"
            icon={<Link fontSize="small" />}
            tooltip="Insert Link"
            onClick={insertLink}
          />
          
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
          },
          '& .variable-placeholder': {
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.875em',
            fontWeight: 'bold'
          },
          // Font size styling
          '& font[size="1"]': { fontSize: '8px' },
          '& font[size="2"]': { fontSize: '10px' },
          '& font[size="3"]': { fontSize: '13px' },
          '& font[size="4"]': { fontSize: '16px' },
          '& font[size="5"]': { fontSize: '18px' },
          '& font[size="6"]': { fontSize: '24px' },
          '& font[size="7"]': { fontSize: '32px' },
        }}
        suppressContentEditableWarning
      />
    </Paper>
  );
};

export default RichTextEditor;