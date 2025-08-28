// frontend/admin-crm/src/components/common/index.ts

export { EmptyState } from './EmptyState';
export { LoadingTable } from './LoadingTable';
export { ErrorBoundary, useErrorHandler, withErrorBoundary } from './ErrorBoundary';
export { ConfirmDialogProvider, useConfirmDialog, SimpleConfirmDialog } from './ConfirmDialog';
export { TableSkeleton, CardSkeleton, ListSkeleton, FormSkeleton } from './TableSkeleton';

// Enhanced profile components
export * from './ActivityTimeline';
export * from './QuickActions';
export * from './FinancialSummary';
export * from './EntityNavigation';
export * from './WorkflowVisualization';