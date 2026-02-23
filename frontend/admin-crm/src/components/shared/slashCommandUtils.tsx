// frontend/admin-crm/src/components/shared/slashCommandUtils.tsx
// Utility functions for slash commands - extracted for fast refresh compatibility

import React from 'react';
import {
  DataObject as VariableIcon,
  Title as HeadingIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as OrderedListIcon,
  FormatQuote as QuoteIcon,
  HorizontalRule as DividerIcon,
  Code as CodeIcon,
  FilterList as ConditionalIcon,
} from '@mui/icons-material';
import type { Editor } from '@tiptap/core';

// Command item definition
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  category?: 'insert' | 'format' | 'block';
}

/**
 * Get default slash command items
 */
export const getDefaultSlashCommands = (): SlashCommandItem[] => [
  {
    title: 'Insert Variable',
    description: 'Add a dynamic variable',
    icon: <VariableIcon sx={{ fontSize: 20 }} />,
    category: 'insert',
    command: (editor) => {
      editor.chain().focus().insertContent('{{').run();
    },
  },
  {
    title: 'Conditional Block',
    description: 'Show content based on a condition',
    icon: <ConditionalIcon sx={{ fontSize: 20 }} />,
    category: 'insert',
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'conditionalBlock',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Conditional content here...' }],
            },
          ],
        })
        .run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <HeadingIcon sx={{ fontSize: 20 }} />,
    category: 'format',
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <HeadingIcon sx={{ fontSize: 18 }} />,
    category: 'format',
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <HeadingIcon sx={{ fontSize: 16 }} />,
    category: 'format',
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a bulleted list',
    icon: <BulletListIcon sx={{ fontSize: 20 }} />,
    category: 'block',
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <OrderedListIcon sx={{ fontSize: 20 }} />,
    category: 'block',
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Add a blockquote',
    icon: <QuoteIcon sx={{ fontSize: 20 }} />,
    category: 'block',
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal line',
    icon: <DividerIcon sx={{ fontSize: 20 }} />,
    category: 'block',
    command: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Add a code block',
    icon: <CodeIcon sx={{ fontSize: 20 }} />,
    category: 'block',
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
];

/**
 * Filter commands based on search query
 */
export const filterSlashCommands = (
  items: SlashCommandItem[],
  query: string,
): SlashCommandItem[] => {
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery),
  );
};
