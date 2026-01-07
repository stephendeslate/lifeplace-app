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
import { useFeaturedVenues, useFeaturedPackages, usePrefetchVenue, usePrefetchPackage } from '@/hooks/useExplore';
import { Skeleton, Logo, Button } from '@/components/common';
import { VenueCard, PackageCard } from '@/components/explore';
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
  const { data: featuredVenues, isLoading: venuesLoading } = useFeaturedVenues();
  const { data: featuredPackages, isLoading: packagesLoading } = useFeaturedPackages();
  const prefetchVenue = usePrefetchVenue();
  const prefetchPackage = usePrefetchPackage();

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo variant="icon" color="dark" size="lg" />
          <View>
            <Text style={styles.greeting}>
              {greeting}, {userName}!
            </Text>
            <Text style={styles.subGreeting}>Find your perfect venue</Text>
          </View>
        </View>
        <Pressable
          style={styles.notificationButton}
          onPress={() => router.push('/actions' as Href)}
        >
          <Bell size={24} color={colors.primary.black} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Hero Section */}
      <Pressable
        style={styles.heroCard}
        onPress={() => router.push('/booking' as Href)}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroIconContainer}>
            <Sparkle size={32} color={theme.colors.primary[600]} weight="fill" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Start Planning Your Event</Text>
            <Text style={styles.heroSubtitle}>
              Discover beautiful venues and curated packages
            </Text>
          </View>
          <ArrowRight size={24} color={theme.colors.primary[600]} />
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
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greeting: {
    ...typeScale.headlineLarge,
    color: theme.colors.neutral[900],
  },
  subGreeting: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[600],
    marginTop: spacing.xxs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error[500],
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  notificationBadgeText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 10,
    color: theme.colors.surface,
  },
  heroCard: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: layout.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    ...typeScale.titleLarge,
    color: theme.colors.neutral[900],
    marginBottom: spacing.xxs,
  },
  heroSubtitle: {
    ...typeScale.bodySmall,
    color: theme.colors.neutral[600],
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
