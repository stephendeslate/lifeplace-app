// frontend/client-portal/src/components/common/index.ts

export { ErrorBoundary, useErrorHandler, withErrorBoundary } from './ErrorBoundary';
export { ConfirmDialogProvider, useConfirmDialog, SimpleConfirmDialog } from './ConfirmDialog';
export { QuoteRejectionDialog } from './QuoteRejectionDialog';
export {
  CardSkeleton,
  ListSkeleton,
  FormSkeleton,
  BookingStepSkeleton,
  TimelineSkeleton,
  MobileCardSkeleton
} from './SkeletonLoaders';
export { OptimizedImage } from './OptimizedImage';
export { TestModeBanner, useTestMode, isTestMode } from './TestModeBanner';