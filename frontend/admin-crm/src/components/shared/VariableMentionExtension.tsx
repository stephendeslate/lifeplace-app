// frontend/admin-crm/src/components/shared/VariableMentionExtension.tsx
// TipTap extension for template variable mentions with autocomplete

import { ReactRenderer } from '@tiptap/react';
import Mention from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import {
  VariableSuggestionDropdown,
  getVariableLabel,
  type VariableSuggestionDropdownRef,
} from './VariableSuggestionDropdown';
import type {
  VariableForInsertion,
  VariableSchemas,
  ContextType,
} from '../../types/templates.types';
import { getVariablesForContext } from '../../hooks/useTemplateVariables';

// Store for variable schemas - will be set by the editor
let variableSchemas: VariableSchemas | undefined;
let currentContextType: ContextType | undefined;

/**
 * Set the variable schemas for the mention extension
 * Call this before using the extension to populate autocomplete
 */
export const setVariableSchemas = (schemas: VariableSchemas | undefined) => {
  variableSchemas = schemas;
};

/**
 * Set the current context type for filtering variables
 */
export const setContextType = (contextType: ContextType | undefined) => {
  currentContextType = contextType;
};

/**
 * Get filtered variables based on query and context
 */
const getFilteredVariables = (query: string): VariableForInsertion[] => {
  if (!variableSchemas) return [];

  // Get all variables or filtered by context
  let variables: VariableForInsertion[] = [];

  if (currentContextType) {
    variables = getVariablesForContext(variableSchemas, currentContextType);
  } else {
    // Get all variables from all groups
    for (const [groupKey, groupData] of Object.entries(variableSchemas.variable_groups)) {
      for (const [varName, varDef] of Object.entries(groupData.variables)) {
        variables.push({
          name: varName,
          description: varDef.description,
          required: varDef.required,
          group: groupKey,
          groupLabel: groupData.label,
          groupIcon: groupData.icon,
        });
      }
    }
  }

  // Filter by query
  const lowerQuery = query.toLowerCase();
  return variables
    .filter(
      (v) =>
        v.name.toLowerCase().includes(lowerQuery) ||
        getVariableLabel(v.name).toLowerCase().includes(lowerQuery) ||
        v.description.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 10); // Limit to 10 results
};

/**
 * Suggestion configuration for the Mention extension
 */
const suggestion: Partial<SuggestionOptions<VariableForInsertion>> = {
  char: '{{',
  allowSpaces: false,
  pluginKey: new PluginKey('variableMention'),

  items: ({ query }) => getFilteredVariables(query),

  render: () => {
    let component: ReactRenderer<VariableSuggestionDropdownRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props: SuggestionProps<VariableForInsertion>) => {
        component = new ReactRenderer(VariableSuggestionDropdown, {
          props: {
            items: props.items,
            command: props.command,
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

      onUpdate: (props: SuggestionProps<VariableForInsertion>) => {
        component?.updateProps({
          items: props.items,
          command: props.command,
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
    // Delete the trigger characters and insert the mention
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: 'variableMention',
          attrs: {
            id: props.name,
            label: getVariableLabel(props.name),
          },
        },
        {
          type: 'text',
          text: ' ',
        },
      ])
      .run();
  },
};

/**
 * VariableMention Extension
 *
 * Extends TipTap's Mention extension to create template variable pills.
 * - Triggers on '{{' to open autocomplete
 * - Renders variables as styled, deletable pills
 * - Outputs {{ variable_name }} syntax in HTML
 *
 * @example
 * // In your editor extensions array:
 * const extensions = [
 *   StarterKit,
 *   VariableMention,
 *   // ... other extensions
 * ];
 *
 * // Before using, set the variable schemas:
 * setVariableSchemas(schemas);
 * setContextType('EVENT');
 */
export const VariableMention = Mention.extend({
  name: 'variableMention',

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'variable-pill',
        'data-type': 'variable',
      },
      suggestion,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({
          'data-id': attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
      },
      // Also parse legacy inline-styled variables
      {
        tag: 'span[style*="background-color: #e3f2fd"]',
        getAttrs: (element) => {
          const text = (element as HTMLElement).textContent?.trim() || '';
          const match = text.match(/\{\{\s*(\w+)\s*\}\}/);
          if (match) {
            return {
              id: match[1],
              label: getVariableLabel(match[1]),
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Output {{ variable_name }} syntax for Django template compatibility
    // The label is only for editor display - saved HTML must use Django syntax
    const variableText = `{{ ${node.attrs.id} }}`;

    return [
      'span',
      {
        ...HTMLAttributes,
        'data-type': 'variable',
        'data-id': node.attrs.id,
        'data-label': node.attrs.label,
        class: 'variable-pill',
        style:
          'display: inline-flex; align-items: center; background-color: #e3f2fd; color: #1565c0; border-radius: 12px; padding: 1px 8px; font-size: 0.875em; font-weight: 500; border: 1px solid #90caf9;',
      },
      variableText, // Always output {{ variable_name }} for backend
    ];
  },
});

export default VariableMention;
