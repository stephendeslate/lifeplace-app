/**
 * Screen-Level Skeleton Components
 *
 * Pre-built skeleton loading states for common screen layouts.
 * These provide consistent loading experiences across the app.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard, SkeletonEventCard } from './Skeleton';
import { colors, spacing, layout } from '@/theme';

interface SkeletonScreenProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Header skeleton with back button and title
 */
export function SkeletonHeader({ style }: SkeletonScreenProps) {
  return (
    <View style={[styles.header, style]}>
      <Skeleton variant="circular" width={44} height={44} />
      <Skeleton variant="text" width={150} height={20} />
      <View style={{ width: 44 }} />
    </View>
  );
}

/**
 * List screen skeleton (Events, Invoices, etc.)
 */
export function SkeletonListScreen({
  itemCount = 4,
  showHeader = true,
  showFilters = true,
  itemHeight = 100,
  style,
}: SkeletonScreenProps & {
  itemCount?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  itemHeight?: number;
}) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={['top']}>
      {/* Header */}
      {showHeader && (
        <View style={styles.listHeader}>
          <Skeleton variant="text" width="50%" height={28} />
          <Skeleton variant="text" width="30%" height={14} style={styles.mt8} />
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View style={styles.filterRow}>
          <Skeleton variant="rounded" width={60} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={70} height={32} />
          <Skeleton variant="rounded" width={90} height={32} />
        </View>
      )}

      {/* List items */}
      <View style={styles.listContent}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={itemHeight}
            style={styles.listItem}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

/**
 * Detail screen skeleton (Event Detail, Payment Detail, etc.)
 */
export function SkeletonDetailScreen({
  showHeroImage = true,
  sectionCount = 3,
  style,
}: SkeletonScreenProps & {
  showHeroImage?: boolean;
  sectionCount?: number;
}) {
  return (
    <View style={[styles.container, style]}>
      {/* Hero image */}
      {showHeroImage && (
        <Skeleton variant="rectangular" width="100%" height={250} />
      )}

      {/* Content */}
      <View style={styles.detailContent}>
        {/* Title section */}
        <Skeleton variant="text" width="80%" height={28} style={styles.mt16} />
        <Skeleton variant="text" width="60%" height={16} style={styles.mt8} />

        {/* Badge row */}
        <View style={[styles.badgeRow, styles.mt16]}>
          <Skeleton variant="rounded" width={80} height={28} />
          <Skeleton variant="rounded" width={100} height={28} />
        </View>

        {/* Sections */}
        {Array.from({ length: sectionCount }).map((_, index) => (
          <View key={index} style={styles.section}>
            <Skeleton variant="text" width="40%" height={18} />
            <Skeleton variant="rounded" height={80} style={styles.mt12} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Card grid skeleton (Explore, Favorites, etc.)
 */
export function SkeletonGridScreen({
  columns = 2,
  itemCount = 6,
  showHeader = true,
  showSearch = true,
  style,
}: SkeletonScreenProps & {
  columns?: number;
  itemCount?: number;
  showHeader?: boolean;
  showSearch?: boolean;
}) {
  const rows = Math.ceil(itemCount / columns);

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top']}>
      {/* Header */}
      {showHeader && (
        <View style={styles.listHeader}>
          <Skeleton variant="text" width="40%" height={28} />
        </View>
      )}

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Skeleton variant="rounded" width="100%" height={48} />
        </View>
      )}

      {/* Grid */}
      <View style={styles.gridContent}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {Array.from({ length: columns }).map((_, colIndex) => {
              const itemIndex = rowIndex * columns + colIndex;
              if (itemIndex >= itemCount) return null;
              return (
                <View key={colIndex} style={[styles.gridItem, { flex: 1 / columns }]}>
                  <SkeletonCard />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

/**
 * Form screen skeleton (Settings, Edit Profile, etc.)
 */
export function SkeletonFormScreen({
  fieldCount = 5,
  showHeader = true,
  style,
}: SkeletonScreenProps & {
  fieldCount?: number;
  showHeader?: boolean;
}) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={['top']}>
      {/* Header */}
      {showHeader && <SkeletonHeader />}

      {/* Form fields */}
      <View style={styles.formContent}>
        {Array.from({ length: fieldCount }).map((_, index) => (
          <View key={index} style={styles.formField}>
            <Skeleton variant="text" width={80} height={14} />
            <Skeleton variant="rounded" width="100%" height={52} style={styles.mt8} />
          </View>
        ))}

        {/* Submit button */}
        <Skeleton variant="rounded" width="100%" height={52} style={styles.mt24} />
      </View>
    </SafeAreaView>
  );
}

/**
 * Dashboard/home screen skeleton
 */
export function SkeletonDashboardScreen({ style }: SkeletonScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={['top']}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <View>
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="text" width={200} height={28} style={styles.mt4} />
        </View>
        <Skeleton variant="circular" width={44} height={44} />
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Skeleton variant="rounded" width="100%" height={60} />
      </View>

      {/* Upcoming events section */}
      <View style={styles.section}>
        <Skeleton variant="text" width={150} height={20} />
        <SkeletonEventCard style={styles.mt12} />
        <SkeletonEventCard style={styles.mt12} />
      </View>

      {/* Action items section */}
      <View style={styles.section}>
        <Skeleton variant="text" width={120} height={20} />
        <Skeleton variant="rounded" height={80} style={styles.mt12} />
        <Skeleton variant="rounded" height={80} style={styles.mt12} />
      </View>
    </SafeAreaView>
  );
}

/**
 * Booking step skeleton
 */
export function SkeletonBookingStep({
  showProgress = true,
  showTitle = true,
  contentHeight = 300,
  style,
}: SkeletonScreenProps & {
  showProgress?: boolean;
  showTitle?: boolean;
  contentHeight?: number;
}) {
  return (
    <View style={[styles.bookingContainer, style]}>
      {/* Progress indicator */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressDots}>
            {Array.from({ length: 5 }).map((_, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Skeleton variant="rectangular" width={20} height={2} />}
                <Skeleton variant="circular" width={28} height={28} />
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Step title */}
      {showTitle && (
        <View style={styles.stepHeader}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={14} style={styles.mt8} />
        </View>
      )}

      {/* Content area */}
      <View style={[styles.stepContent, { minHeight: contentHeight }]}>
        <Skeleton variant="rounded" height={contentHeight} />
      </View>

      {/* Navigation footer */}
      <View style={styles.bookingFooter}>
        <Skeleton variant="rounded" width={100} height={48} />
        <Skeleton variant="rounded" width={100} height={48} />
      </View>
    </View>
  );
}

/**
 * Payment portal skeleton
 */
export function SkeletonPaymentScreen({ style }: SkeletonScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={['top']}>
      {/* Header */}
      <SkeletonHeader />

      {/* Overview card */}
      <View style={styles.paymentOverview}>
        <Skeleton variant="rounded" height={140} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Skeleton variant="rounded" width="30%" height={44} />
        <Skeleton variant="rounded" width="30%" height={44} />
        <Skeleton variant="rounded" width="30%" height={44} />
      </View>

      {/* List items */}
      <View style={styles.listContent}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={120}
            style={styles.listItem}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  listItem: {
    marginBottom: spacing.md,
  },
  detailContent: {
    paddingHorizontal: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  quickActions: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  bookingContainer: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  stepHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  stepContent: {
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  paymentOverview: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
});

export default {
  Header: SkeletonHeader,
  List: SkeletonListScreen,
  Detail: SkeletonDetailScreen,
  Grid: SkeletonGridScreen,
  Form: SkeletonFormScreen,
  Dashboard: SkeletonDashboardScreen,
  BookingStep: SkeletonBookingStep,
  Payment: SkeletonPaymentScreen,
};
