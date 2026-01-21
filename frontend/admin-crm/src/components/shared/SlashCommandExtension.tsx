// frontend/admin-crm/src/components/shared/SlashCommandExtension.tsx
// TipTap extension for slash commands

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
  SlashCommandMenu,
  getDefaultSlashCommands,
  filterSlashCommands,
  type SlashCommandItem,
  type SlashCommandMenuRef,
} from './SlashCommandMenu';

// Configuration type
interface SlashCommandsOptions {
  suggestion: Partial<SuggestionOptions<SlashCommandItem>>;
}

/**
 * SlashCommands Extension
 *
 * Adds Notion-style slash commands to TipTap editor.
 * Type '/' to open a command palette with formatting options.
 *
 * Commands include:
 * - Insert Variable: Opens variable picker
 * - Headings: H1, H2, H3
 * - Lists: Bullet and numbered
 * - Blocks: Quote, divider, code block
 *
 * @example
 * const extensions = [
 *   StarterKit,
 *   SlashCommands,
 *   // ... other extensions
 * ];
 */
export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: false,

        items: ({ query }) => {
          const commands = getDefaultSlashCommands();
          return filterSlashCommands(commands, query);
        },

        render: () => {
          let component: ReactRenderer<SlashCommandMenuRef> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props: {
                  items: props.items,
                  command: props.command,
                  editor: props.editor,
                },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                animation: 'shift-away',
                duration: [200, 150],
              });
            },

            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              component?.updateProps({
                items: props.items,
                command: props.command,
                editor: props.editor,
              });

              if (!props.clientRect || !popup?.[0]) return;

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },

        command: ({ editor, range, props }) => {
          // Delete the slash command trigger
          editor.chain().focus().deleteRange(range).run();

          // Execute the command
          props.command(editor);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommands'),
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommands;
