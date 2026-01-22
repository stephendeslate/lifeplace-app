// frontend/admin-crm/src/components/shared/SlashCommandMenu.tsx
// Dropdown menu for slash commands in the template editor

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Divider,
} from '@mui/material';
import type { Editor } from '@tiptap/core';

// Re-export utilities from separate file for backwards compatibility
export { getDefaultSlashCommands, filterSlashCommands } from './slashCommandUtils';
export type { SlashCommandItem } from './slashCommandUtils';

// Import the type for internal use
import type { SlashCommandItem } from './slashCommandUtils';

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  editor: Editor;
}

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SlashCommandMenuProps
>(({ items, command, editor: _editor }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prevIndex) =>
          prevIndex === 0 ? items.length - 1 : prevIndex - 1
        );
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prevIndex) =>
          prevIndex === items.length - 1 ? 0 : prevIndex + 1
        );
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2,
          maxWidth: 300,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No commands found
        </Typography>
      </Paper>
    );
  }

  // Group items by category
  const categories = {
    insert: items.filter((i) => i.category === 'insert'),
    format: items.filter((i) => i.category === 'format'),
    block: items.filter((i) => i.category === 'block'),
    other: items.filter((i) => !i.category),
  };

  let currentIndex = 0;

  const renderCategory = (
    title: string,
    categoryItems: SlashCommandItem[],
    showDivider: boolean
  ) => {
    if (categoryItems.length === 0) return null;

    const startIndex = currentIndex;
    currentIndex += categoryItems.length;

    return (
      <React.Fragment key={title}>
        {showDivider && <Divider sx={{ my: 0.5 }} />}
        <Box sx={{ px: 1.5, py: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
          >
            {title}
          </Typography>
        </Box>
        {categoryItems.map((item, idx) => {
          const itemIndex = startIndex + idx;
          return (
            <ListItem key={item.title} disablePadding>
              <ListItemButton
                selected={itemIndex === selectedIndex}
                onClick={() => selectItem(itemIndex)}
                sx={{
                  py: 0.75,
                  px: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.50',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500}>
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <Paper
      elevation={8}
      sx={{
        maxWidth: 300,
        maxHeight: 400,
        overflow: 'auto',
        borderRadius: 2,
      }}
    >
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          Commands
        </Typography>
      </Box>
      <List dense sx={{ py: 0.5 }}>
        {renderCategory('Insert', categories.insert, false)}
        {renderCategory('Format', categories.format, categories.insert.length > 0)}
        {renderCategory('Blocks', categories.block, categories.format.length > 0 || categories.insert.length > 0)}
        {categories.other.length > 0 && renderCategory('Other', categories.other, true)}
      </List>
    </Paper>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';

export default SlashCommandMenu;
