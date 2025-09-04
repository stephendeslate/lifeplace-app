// frontend/admin-crm/src/components/common/index.ts

// Modern shared components for consistent UI across all settings pages
export { default as ModernTable, createStandardActions } from './ModernTable';
export type { ModernTableColumn, ModernTableAction, ModernTableProps } from './ModernTable';

export { default as ModernDialog, createStandardActions as createDialogActions, createDeleteActions } from './ModernDialog';
export type { ModernDialogAction, ModernDialogProps } from './ModernDialog';

export { default as ModernForm, createFormSection } from './ModernForm';
export type { ModernFormField, ModernFormSection, ModernFormProps } from './ModernForm';

export { default as ModernSearch } from './ModernSearch';
export type { ModernSearchFilter, ModernSearchProps } from './ModernSearch';

// Modern Page Layout
export { 
  ModernPageLayout, 
  ModernDashboardLayout, 
  ModernSettingsLayout, 
  ModernOverviewLayout 
} from './ModernPageLayout';

// Modern Card System
export {
  ModernCard,
  ModernGlassCard,
  ModernElevatedCard,
  ModernOutlinedCard,
  ModernMinimalCard,
  ModernInteractiveCard,
  ModernMetricCard,
} from './ModernCard';

// Modern Page Header
export {
  ModernPageHeader,
  ModernDashboardHeader,
  ModernSettingsHeader,
  ModernOverviewHeader,
  createRefreshAction,
  createFilterAction,
  createExportAction,
  createSettingsAction,
  createAddAction,
} from './ModernPageHeader';

// Activity Timeline
export { ActivityTimeline } from './ActivityTimeline';
export type { ActivityItem } from './ActivityTimeline';

// Quick Actions
export { 
  QuickActions,
  createEventActions,
  createClientActions,
  createPaymentActions 
} from './QuickActions';
export type { QuickAction } from './QuickActions';

// Financial Summary
export { 
  FinancialSummary,
  calculateEventFinancials,
  calculateClientFinancials 
} from './FinancialSummary';
export type { FinancialMetric, PaymentBreakdown } from './FinancialSummary';

// Entity Navigation
export { 
  EntityNavigation,
  createClientReference,
  createEventReference,
  createPaymentReference 
} from './EntityNavigation';
export type { EntityReference } from './EntityNavigation';

// Workflow Visualization
export { WorkflowVisualization } from './WorkflowVisualization';
export type { WorkflowStage, WorkflowTask } from './WorkflowVisualization';

// Table Skeleton (alias as ModernTableSkeleton)
export { 
  TableSkeleton,
  TableSkeleton as ModernTableSkeleton,
  CardSkeleton,
  ListSkeleton,
  FormSkeleton 
} from './TableSkeleton';

// Existing components
export { default as ModernLoadingStates } from './ModernLoadingStates';
export { ModernEmptyState } from './ModernEmptyState';

// Settings Components System
export {
  SettingsTable,
  SettingsFormDialog,
  SettingsPage,
} from './settings';
export type {
  SettingsTableProps,
  SettingsTableColumn,
  SettingsTableFilter,
  SettingsFormDialogProps,
  SettingsPageProps,
  SettingsPageConfig,
} from './settings';