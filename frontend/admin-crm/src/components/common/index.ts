// frontend/admin-crm/src/components/common/index.ts

// Modern shared components for consistent UI across all settings pages
export { default as ModernTable, createStandardActions } from './ModernTable';
export type { ModernTableColumn, ModernTableAction, ModernTableProps } from './ModernTable';

export {
  default as ModernDialog,
  createStandardActions as createDialogActions,
  createDeleteActions,
  DIALOG_PADDING,
  DIALOG_SIZES,
} from './ModernDialog';
export type { ModernDialogAction, ModernDialogProps } from './ModernDialog';

export { default as ModernForm, createFormSection } from './ModernForm';
export type { ModernFormField, ModernFormSection, ModernFormProps } from './ModernForm';

export { default as ModernSearch } from './ModernSearch';
export type { ModernSearchFilter, ModernSearchProps } from './ModernSearch';

// Modern Page Layout
export {
  ModernPageLayout,
  ModernSettingsLayout,
  ModernOverviewLayout
} from './ModernPageLayout';

// Modern Card System
export {
  ModernCard,
  ModernGlassCard,
  ModernMetricCard,
} from './ModernCard';

// Modern Page Header
export {
  ModernPageHeader,
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

// Template Preview
export { TemplatePreviewDialog } from './TemplatePreviewDialog';

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

// Status Chips - Reusable status display components
export {
  PaymentStatusChip,
  PaymentPlanStatusChip,
  InstallmentStatusChip,
} from './StatusChips';

// Image Upload Components
export { ImageUploadField } from './ImageUploadField';
export type { ImageUploadFieldProps } from './ImageUploadField';
export { GalleryUploadField } from './GalleryUploadField';
export type { GalleryUploadFieldProps } from './GalleryUploadField';