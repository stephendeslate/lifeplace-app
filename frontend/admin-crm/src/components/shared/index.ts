// frontend/admin-crm/src/components/shared/index.ts

// Rich text editor
export { default as RichTextEditor } from './RichTextEditor';
export type { RichTextEditorHandle } from './RichTextEditor';

// Template editing components
export { TemplateVariableInserter } from './TemplateVariableInserter';
export { TemplateContentEditor } from './TemplateContentEditor';

// Re-export types from templates.types.ts for convenience
export type {
  TemplateContentEditorHandle,
  TemplateContentEditorProps,
  TemplateVariableInserterProps,
  TemplateEditorMode,
  TemplateStarter,
  VariableSchemas,
  TemplateDomain,
} from '../../types/templates.types';