// frontend/admin-crm/src/types/templates.types.ts
// Shared types for template editing across Communications and Contracts domains

/**
 * Context types that determine which variables are available for a template.
 * Each context type has specific required objects at send time.
 */
export type ContextType =
  | "CLIENT"
  | "EVENT"
  | "BOOKING"
  | "QUOTE"
  | "CONTRACT"
  | "ADMIN"
  | "NOTIFICATION"
  | "MANUAL";

/**
 * Context type metadata from the API
 */
export interface ContextTypeInfo {
  label: string;
  required_objects: string[];
  description: string;
}

/**
 * Variable definition with required/optional indicator
 */
export interface VariableDefinition {
  description: string;
  required: boolean;
}

/**
 * Variable group containing related variables
 */
export interface VariableGroup {
  label: string;
  icon: string;
  available_in: ContextType[];
  variables: Record<string, VariableDefinition>;
}

/**
 * Response from variable_schemas endpoint (new format)
 */
export interface VariableSchemas {
  context_types: Record<ContextType, ContextTypeInfo>;
  variable_groups: Record<string, VariableGroup>;
}

/**
 * Legacy variable schema format (for backwards compatibility during transition)
 * @deprecated Use VariableSchemas instead
 */
export interface LegacyVariableSchema {
  [variableName: string]: string;
}

/**
 * Template starter definition for quick-start templates
 */
export interface TemplateStarter {
  name: string;
  description: string;
  content?: string;
}

/**
 * Props for shared TemplateVariableInserter component
 */
export interface TemplateVariableInserterProps {
  /** Grouped variable schemas with descriptions */
  variableSchemas?: VariableSchemas;
  /** Currently selected context type (filters available variables) */
  contextType?: ContextType;
  /** Callback when a variable is selected for insertion */
  onVariableInsert: (variable: string) => void;
  /** Optional callback to load a template starter */
  onTemplateLoad?: (templateKey: string) => void;
  /** Optional template starters to display */
  templateStarters?: Record<string, TemplateStarter>;
  /** Whether to show formatting tips section (default: false) */
  showFormattingTips?: boolean;
  /** Optional group colors for variable chips */
  groupColors?: Record<
    string,
    "primary" | "secondary" | "info" | "success" | "warning" | "error"
  >;
}

/**
 * Editor mode for template content editing
 */
export type TemplateEditorMode = "visual" | "html" | "text";

/**
 * Props for shared TemplateContentEditor component
 */
export interface TemplateContentEditorProps {
  /** Current content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Current editor mode */
  mode: TemplateEditorMode;
  /** Optional callback when mode changes */
  onModeChange?: (mode: TemplateEditorMode) => void;
  /** Whether to show mode toggle buttons (default: false) */
  showModeToggle?: boolean;
  /** Modes available in the toggle (default: ['visual', 'html']) */
  availableModes?: TemplateEditorMode[];
  /** Hide HTML mode behind Advanced toggle for non-technical users (default: true) */
  hideAdvancedModes?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Number of rows for textarea modes (default: 10) */
  rows?: number;
  /** Minimum height for visual mode (default: 200) */
  minHeight?: number;
  /** Whether field has error */
  error?: boolean;
  /** Helper text to display */
  helperText?: string;
  /** Optional label */
  label?: string;
  /** Whether editor is disabled */
  disabled?: boolean;
  /** Whether to show character count (useful for SMS) */
  showCharacterCount?: boolean;
  /** Maximum character count (for SMS) */
  maxCharacters?: number;
  /** Variable schemas for autocomplete in visual mode */
  variableSchemas?: VariableSchemas;
  /** Current context type for filtering available variables */
  contextType?: ContextType;
}

/**
 * Handle exposed by TemplateContentEditor via ref
 */
export interface TemplateContentEditorHandle {
  /** Insert a variable at the current cursor position */
  insertVariable: (variable: string) => void;
  /** Focus the editor */
  focus: () => void;
}

/**
 * Template domain type for the useTemplateVariables hook
 */
export type TemplateDomain = "communications" | "contracts";

/**
 * Helper type for flattened variable with group info
 */
export interface VariableForInsertion {
  name: string;
  description: string;
  required: boolean;
  group: string;
  groupLabel: string;
  groupIcon: string;
}

/**
 * Context type display labels
 */
export const CONTEXT_TYPE_LABELS: Record<ContextType, string> = {
  CLIENT: "Client",
  EVENT: "Event",
  BOOKING: "Booking",
  QUOTE: "Quote",
  CONTRACT: "Contract",
  ADMIN: "Admin",
  NOTIFICATION: "Notification",
  MANUAL: "Manual",
};

/**
 * Context type descriptions for UI display
 */
export const CONTEXT_TYPE_DESCRIPTIONS: Record<ContextType, string> = {
  CLIENT: "For client-focused communications (welcome emails, invitations)",
  EVENT: "For event-related communications (reminders, updates)",
  BOOKING: "For booking flow communications (confirmations, payment reminders)",
  QUOTE: "For quote-related communications (quote sent, follow-ups)",
  CONTRACT: "For contract communications (signature requests)",
  ADMIN: "For admin user communications (invitations, role changes)",
  NOTIFICATION: "For system notifications (alerts, digests)",
  MANUAL: "For ad-hoc staff communications (custom messages)",
};
