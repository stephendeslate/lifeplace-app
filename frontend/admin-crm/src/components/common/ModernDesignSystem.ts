// Modern Design System Export
// Central export file for all modern design system components

// Layout Components
export {
  ModernPageLayout,
  ModernSettingsLayout,
  ModernOverviewLayout,
} from './ModernPageLayout';

// Card Components
export {
  ModernCard,
  ModernGlassCard,
  ModernMetricCard,
} from './ModernCard';

// Empty State Components
export {
  ModernEmptyState,
  ModernNoDataState,
  ModernErrorState,
  ModernSearchEmptyState,
  ModernLoadingState,
} from './ModernEmptyState';

// Header Components
export {
  ModernPageHeader,
  ModernOverviewHeader,
  createRefreshAction,
  createFilterAction,
  createExportAction,
  createSettingsAction,
  createAddAction,
} from './ModernPageHeader';

// Loading Components
export {
  ModernSkeleton,
  ModernHeaderSkeleton,
  ModernCardSkeleton,
  ModernMetricCardSkeleton,
  ModernTableSkeleton,
  ModernListSkeleton,
  ModernLoadingSpinner,
  ModernPageLoadingSkeleton,
} from './ModernLoadingStates';

// Types for better TypeScript support
export type {
  ModernPageLayoutProps,
  ModernCardProps,
  ModernEmptyStateProps,
  ModernPageHeaderProps,
  ModernSkeletonProps,
} from './types';

// Design System Utilities
export const modernDesignSystem = {
  // Component categories
  layouts: [
    'ModernPageLayout',
    'ModernSettingsLayout',
    'ModernOverviewLayout',
  ],

  cards: [
    'ModernCard',
    'ModernGlassCard',
    'ModernMetricCard',
  ],

  emptyStates: [
    'ModernEmptyState',
    'ModernNoDataState',
    'ModernErrorState',
    'ModernSearchEmptyState',
    'ModernLoadingState',
  ],

  headers: [
    'ModernPageHeader',
    'ModernOverviewHeader',
  ],
  
  loading: [
    'ModernSkeleton',
    'ModernHeaderSkeleton',
    'ModernCardSkeleton',
    'ModernMetricCardSkeleton',
    'ModernTableSkeleton',
    'ModernListSkeleton',
    'ModernLoadingSpinner',
    'ModernPageLoadingSkeleton',
  ],
  
  // Quick component builders
  builders: {
    refreshAction: 'createRefreshAction',
    filterAction: 'createFilterAction', 
    exportAction: 'createExportAction',
    settingsAction: 'createSettingsAction',
    addAction: 'createAddAction',
  },
  
  // Usage patterns
  patterns: {
    dashboardPage: {
      layout: 'ModernPageLayout',
      header: 'ModernPageHeader',
      cards: 'ModernMetricCard',
      loading: 'ModernPageLoadingSkeleton',
    },

    settingsPage: {
      layout: 'ModernSettingsLayout',
      header: 'ModernPageHeader',
      cards: 'ModernCard',
      loading: 'ModernCardSkeleton',
    },

    overviewPage: {
      layout: 'ModernOverviewLayout',
      header: 'ModernOverviewHeader',
      cards: 'ModernGlassCard',
      emptyState: 'ModernEmptyState',
      loading: 'ModernTableSkeleton',
    },

    listPage: {
      layout: 'ModernPageLayout',
      header: 'ModernPageHeader',
      cards: 'ModernCard',
      emptyState: 'ModernNoDataState',
      loading: 'ModernListSkeleton',
    },
  },
  
  // Design principles
  principles: [
    'Glassmorphic effects for modern aesthetics',
    'Consistent spacing and typography',
    'Smooth animations and transitions',
    'Responsive design across all breakpoints',
    'Accessibility-first approach',
    'High contrast and readable text',
    'Intuitive user interactions',
    'Loading states for all async operations',
  ],
  
  // Component guidelines
  guidelines: {
    cards: 'Use glass variants for primary content, elevated for secondary content, outlined for forms',
    emptyStates: 'Always provide helpful actions and tips for empty states',
    headers: 'Include breadcrumbs for deep navigation, use appropriate actions for page context',
    loading: 'Match skeleton structure to actual content layout',
    layouts: 'Choose background pattern based on page importance and content density',
  },
} as const;

export default modernDesignSystem;