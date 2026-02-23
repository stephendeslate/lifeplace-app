// Modern Design System Types
// TypeScript interfaces for all modern design system components

import React from 'react';

// Layout Component Types
export interface ModernPageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  backgroundPattern?: 'default' | 'minimal' | 'vibrant';
  className?: string;
  sx?: object;
}

// Card Component Types
export interface ModernCardProps {
  children: React.ReactNode;
  variant?: 'glass' | 'elevated' | 'outlined' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  interactive?: boolean;
  loading?: boolean;
  className?: string;
  sx?: object;
  onClick?: () => void;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  animation?: 'fade' | 'grow' | 'none';
}

export interface ModernMetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

// Empty State Component Types
export interface ModernEmptyStateProps {
  icon?: React.ComponentType | React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  tip?: {
    text: string;
    type?: 'info' | 'success' | 'warning' | 'pro';
  };
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'error' | 'search' | 'loading';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  illustration?: 'gradient' | 'glass' | 'minimal';
  className?: string;
  sx?: object;
}

// Header Component Types
export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface HeaderAction {
  icon?: React.ReactNode;
  label: string;
  onClick: (event?: React.MouseEvent<HTMLElement>) => void;
  variant?: 'contained' | 'outlined' | 'text' | 'icon';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  badge?: number;
}

export interface ModernPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  icon?: React.ReactNode;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
  status?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    variant?: 'filled' | 'outlined';
  };
  stats?: {
    label: string;
    value: string | number;
  }[];
  size?: 'small' | 'medium' | 'large';
  gradient?: boolean;
  glass?: boolean;
  className?: string;
  sx?: object;
}

// Loading Component Types
export interface ModernSkeletonProps {
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  glass?: boolean;
  className?: string;
  sx?: object;
}

export interface ModernHeaderSkeletonProps {
  size?: 'small' | 'medium' | 'large';
}

export interface ModernCardSkeletonProps {
  variant?: 'glass' | 'elevated' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  hasHeader?: boolean;
  hasActions?: boolean;
}

export interface ModernMetricCardSkeletonProps {
  size?: 'small' | 'medium' | 'large';
}

export interface ModernTableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
}

export interface ModernListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showSecondaryText?: boolean;
}

export interface ModernLoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  message?: string;
  variant?: 'circular' | 'linear';
  glass?: boolean;
}

// Component Variants
export type CardVariant = 'glass' | 'elevated' | 'outlined' | 'minimal';
export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type BackgroundPattern = 'default' | 'minimal' | 'vibrant';
export type EmptyStateVariant = 'default' | 'error' | 'search' | 'loading';
export type IllustrationStyle = 'gradient' | 'glass' | 'minimal';
export type BorderRadiusSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type AnimationType = 'fade' | 'grow' | 'none';

// Utility Types
export type ResponsiveSize = {
  xs?: ComponentSize;
  sm?: ComponentSize;
  md?: ComponentSize;
  lg?: ComponentSize;
  xl?: ComponentSize;
};

export type ConditionalProps<T, K extends keyof T> = T[K] extends true
  ? Required<Pick<T, K>>
  : Partial<Pick<T, K>>;

// Design System Configuration Types
export interface DesignSystemTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    neutral: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    full: string;
  };
  shadows: {
    glass: string;
    floating: string;
    card: string;
  };
  animations: {
    fast: string;
    normal: string;
    slow: string;
  };
}

// Pattern Types for common page layouts
export interface DashboardPagePattern {
  layout: 'ModernDashboardLayout';
  header: 'ModernDashboardHeader';
  cards: 'ModernMetricCard';
  loading: 'ModernPageLoadingSkeleton';
}

export interface SettingsPagePattern {
  layout: 'ModernSettingsLayout';
  header: 'ModernSettingsHeader';
  cards: 'ModernOutlinedCard';
  loading: 'ModernCardSkeleton';
}

export interface OverviewPagePattern {
  layout: 'ModernOverviewLayout';
  header: 'ModernOverviewHeader';
  cards: 'ModernGlassCard';
  emptyState: 'ModernEmptyState';
  loading: 'ModernTableSkeleton';
}

export interface ListPagePattern {
  layout: 'ModernPageLayout';
  header: 'ModernPageHeader';
  cards: 'ModernCard';
  emptyState: 'ModernNoDataState';
  loading: 'ModernListSkeleton';
}

export type PagePattern =
  | DashboardPagePattern
  | SettingsPagePattern
  | OverviewPagePattern
  | ListPagePattern;

// Export component prop types for external use
export type {
  ModernPageLayoutProps as PageLayoutProps,
  ModernCardProps as CardProps,
  ModernEmptyStateProps as EmptyStateProps,
  ModernPageHeaderProps as PageHeaderProps,
  ModernSkeletonProps as SkeletonProps,
};
