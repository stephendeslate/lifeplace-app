/**
 * My Events Screen
 *
 * Shows user's booked events with filtering by status.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useEventsList } from '@/hooks/useEvents';
import { theme } from '@/theme';
import { colors, spacing, typeScale, layout } from '@/theme';
import { EventCard } from '@/components/events';
import { FilterChips, EmptyState, SkeletonEventCard } from '@/components/common';
import { filterEventsByStatus, sortEventsByDate } from '@/utils/eventHelpers';
import type { Event, EventStatus } from '@/types/events.types';
import type { FilterChip } from '@/components/common';

type FilterValue = EventStatus | 'all';

const FILTER_OPTIONS: FilterChip<FilterValue>[] = [
  { id: 'all', label: 'All', value: 'all' },
  { id: 'confirmed', label: 'Upcoming', value: 'CONFIRMED' },
  { id: 'in-progress', label: 'In Progress', value: 'IN_PROGRESS' },
  { id: 'completed', label: 'Completed', value: 'COMPLETED' },
  { id: 'cancelled', label: 'Cancelled', value: 'CANCELLED' },
];

export default function EventsScreen() {
  const router = useRouter();
  const { data: events, isLoading, refetch, isRefetching } = useEventsList();

  const [selectedFilter, setSelectedFilter] = useState<FilterValue>('all');

  const handleFilterChange = useCallback((value: FilterValue) => {
    Haptics.selectionAsync();
    setSelectedFilter(value);
  }, []);

  const handleEventPress = useCallback(
    (event: Event) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/events/${event.id}`);
    },
    [router]
  );

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const filtered = filterEventsByStatus(events, selectedFilter);
    return sortEventsByDate(filtered, true); // Upcoming first
  }, [events, selectedFilter]);

  const renderEventItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard
        event={item}
        onPress={() => handleEventPress(item)}
        style={styles.eventCard}
      />
    ),
    [handleEventPress]
  );

  const keyExtractor = useCallback((item: Event) => String(item.id), []);

  const renderEmptyState = () => {
    if (isLoading) return null;

    if (selectedFilter !== 'all') {
      return (
        <EmptyState
          icon="calendar"
          title="No Events Found"
          description={`You don't have any ${getFilterLabel(selectedFilter).toLowerCase()} events.`}
          actionLabel="View All Events"
          onAction={() => setSelectedFilter('all')}
        />
      );
    }

    return (
      <EmptyState
        icon="calendar"
        title="No Events Yet"
        description="Start planning your next event with LifePlace!"
        actionLabel="Book an Event"
        onAction={() => router.push('/booking' as never)}
      />
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3].map((i) => (
        <SkeletonEventCard key={i} style={styles.eventCard} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
        {events && events.length > 0 && (
          <Text style={styles.eventCount}>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </Text>
        )}
      </View>

      {/* Filters */}
      <FilterChips
        chips={FILTER_OPTIONS}
        selectedValue={selectedFilter}
        onSelect={handleFilterChange}
        style={styles.filters}
      />

      {/* Events List */}
      {isLoading ? (
        renderLoadingState()
      ) : (
        <FlashList
          data={filteredEvents}
          renderItem={renderEventItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

function getFilterLabel(filter: FilterValue): string {
  const option = FILTER_OPTIONS.find((f) => f.value === filter);
  return option?.label || 'All';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typeScale.headlineLarge,
    color: theme.colors.neutral[900],
  },
  eventCount: {
    ...typeScale.bodySmall,
    color: theme.colors.neutral[500],
    marginTop: spacing.xxs,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomNavHeight + spacing.xl,
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
