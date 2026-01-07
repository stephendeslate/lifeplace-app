/**
 * DiscoveryLayout Component
 *
 * Home screen layout for users WITHOUT active bookings.
 * Focuses on discovery, exploration, and booking initiation.
 *
 * Content:
 * - Header with greeting and notification bell
 * - Hero section with "Book Your Event" CTA
 * - Quick search bar
 * - Featured Venues preview
 * - Popular Packages preview
 * - "Explore All" CTA
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Bell, ArrowRight, MagnifyingGlass, Sparkle } from 'phosphor-react-native';

import { theme } from '@/theme';
import { colors, spacing, typeScale, layout } from '@/theme';
import { useFeaturedVenues, useFeaturedPackages, useEventTypes, usePrefetchVenue, usePrefetchPackage } from '@/hooks/useExplore';
import { Skeleton, Button } from '@/components/common';
import { VenueCard, PackageCard } from '@/components/explore';
import { EventTypeQuickCard } from './EventTypeQuickCard';
import type { User } from '@/types/auth.types';
import { getTimeBasedGreeting } from '@/utils/userState';

// =============================================================================
// TYPES
// =============================================================================

export interface DiscoveryLayoutProps {
  /** Authenticated user data */
  user: User | null;
  /** Whether any data is loading */
  isLoading: boolean;
  /** Whether data is being refreshed */
  isRefetching: boolean;
  /** Function to trigger refresh */
  onRefresh: () => void;
  /** Unread notification count */
  unreadCount: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DiscoveryLayout({
  user,
  isLoading,
  isRefetching,
  onRefresh,
  unreadCount,
}: DiscoveryLayoutProps) {
  const router = useRouter();

  // Explore data hooks
  const { data: eventTypes, isLoading: eventTypesLoading } = useEventTypes();
  const { data: featuredVenues, isLoading: venuesLoading } = useFeaturedVenues();
  const { data: featuredPackages, isLoading: packagesLoading } = useFeaturedPackages();
  const prefetchVenue = usePrefetchVenue();
  const prefetchPackage = usePrefetchPackage();

  // Navigate to explore with event type pre-selected
  const navigateToExploreWithType = (eventTypeId: number) => {
    router.push(`/(tabs)/explore?eventTypeId=${eventTypeId}` as Href);
  };

  // Greeting
  const greeting = getTimeBasedGreeting();
  const userName = user?.first_name || 'there';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    >
      {/* Header - Clean & Minimal */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greetingLabel}>{greeting},</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.subGreeting}>Find your perfect venue</Text>
        </View>
        <Pressable
          style={styles.notificationButton}
          onPress={() => router.push('/actions' as Href)}
        >
          <Bell size={24} color={colors.primary.black} weight={unreadCount > 0 ? 'fill' : 'regular'} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Hero Section - Full width with gradient */}
      <Pressable
        style={styles.heroCard}
        onPress={() => router.push('/booking' as Href)}
      >
        <View style={styles.heroContent}>
          <Sparkle size={40} color={theme.colors.brand.green[500]} weight="fill" />
          <Text style={styles.heroTitle}>Plan Your{'\n'}Perfect Event</Text>
          <Text style={styles.heroSubtitle}>
            Browse venues, packages, and start booking today
          </Text>
          <View style={styles.heroCTA}>
            <Text style={styles.heroCTAText}>Get Started</Text>
            <ArrowRight size={20} color={theme.colors.brand.green[600]} />
          </View>
        </View>
      </Pressable>

      {/* Search Bar - navigates to explore tab */}
      <Pressable
        style={styles.searchBar}
        onPress={() => router.push('/(tabs)/explore' as Href)}
      >
        <MagnifyingGlass size={20} color={colors.neutral.gray} />
        <Text style={styles.searchPlaceholder}>
          Search venues, packages...
        </Text>
      </Pressable>

      {/* Browse by Event Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse by Event</Text>
        </View>
        <View style={styles.eventTypeGrid}>
          {eventTypesLoading || isLoading ? (
            <>
              <Skeleton variant="rounded" width={80} height={80} style={styles.eventTypeSkeleton} />
              <Skeleton variant="rounded" width={80} height={80} style={styles.eventTypeSkeleton} />
              <Skeleton variant="rounded" width={80} height={80} style={styles.eventTypeSkeleton} />
              <Skeleton variant="rounded" width={80} height={80} style={styles.eventTypeSkeleton} />
            </>
          ) : eventTypes && eventTypes.length > 0 ? (
            eventTypes.slice(0, 4).map((eventType) => (
              <EventTypeQuickCard
                key={eventType.id}
                eventType={eventType}
                onPress={() => navigateToExploreWithType(eventType.id)}
              />
            ))
          ) : null}
        </View>
      </View>

      {/* Featured Venues */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Venues</Text>
          <Pressable
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/explore' as Href)}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ArrowRight size={16} color={theme.colors.primary[600]} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {venuesLoading || isLoading ? (
            <>
              <Skeleton variant="rounded" width={240} height={220} style={styles.cardSkeleton} />
              <Skeleton variant="rounded" width={240} height={220} style={styles.cardSkeleton} />
            </>
          ) : featuredVenues && featuredVenues.length > 0 ? (
            featuredVenues.slice(0, 4).map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                compact
                onPress={() => router.push(`/venues/${venue.id}` as Href)}
                onPressIn={() => prefetchVenue(venue.id)}
              />
            ))
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                No featured venues available
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Popular Packages */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Packages</Text>
          <Pressable
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/explore' as Href)}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ArrowRight size={16} color={theme.colors.primary[600]} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {packagesLoading || isLoading ? (
            <>
              <Skeleton variant="rounded" width={240} height={220} style={styles.cardSkeleton} />
              <Skeleton variant="rounded" width={240} height={220} style={styles.cardSkeleton} />
            </>
          ) : featuredPackages && featuredPackages.length > 0 ? (
            featuredPackages.slice(0, 4).map((pkg) => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                compact
                onPress={() => router.push(`/packages/${pkg.id}` as Href)}
                onPressIn={() => prefetchPackage(pkg.id)}
              />
            ))
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                No packages available
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Explore All CTA */}
      <View style={styles.ctaSection}>
        <Button
          variant="primary"
          onPress={() => router.push('/(tabs)/explore' as Href)}
          fullWidth
        >
          Explore All Venues & Packages
        </Button>
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomNavHeight + spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerContent: {
    flex: 1,
  },
  greetingLabel: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500],
  },
  userName: {
    ...typeScale.displaySmall,
    color: theme.colors.neutral[900],
    marginTop: spacing.xxs,
  },
  subGreeting: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[600],
    marginTop: spacing.xs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.error[500],
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 10,
    color: theme.colors.surface,
  },
  heroCard: {
    backgroundColor: theme.colors.brand.green[50],
    borderRadius: layout.borderRadius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  heroTitle: {
    ...typeScale.displaySmall,
    color: theme.colors.neutral[900],
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[600],
    textAlign: 'center',
    maxWidth: 280,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroCTAText: {
    ...typeScale.labelLarge,
    color: theme.colors.brand.green[600],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: layout.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  searchPlaceholder: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500],
  },
  section: {
    marginBottom: spacing.xl,
  },
  eventTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  eventTypeSkeleton: {
    borderRadius: layout.borderRadius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleLarge,
    color: theme.colors.neutral[900],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  horizontalList: {
    paddingRight: spacing.lg,
  },
  cardSkeleton: {
    marginRight: spacing.md,
  },
  placeholder: {
    backgroundColor: theme.colors.surface,
    padding: spacing.xxl,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  placeholderText: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500],
  },
  ctaSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});

export default DiscoveryLayout;
