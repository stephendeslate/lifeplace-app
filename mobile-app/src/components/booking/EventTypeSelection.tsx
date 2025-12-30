/**
 * EventTypeSelection
 *
 * Grid of event type cards for booking flow entry.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MagnifyingGlass, Sparkle } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';
import { useEventTypes } from '@/hooks/booking';
import { EventTypeCard } from './EventTypeCard';
import { EventTypeDetailModal } from './EventTypeDetailModal';
import { EmptyState } from '@/components/common';
import type { EventType } from '@/types/booking';

interface EventTypeSelectionProps {
  onSelectEventType: (eventType: EventType) => void;
  selectedEventTypeId?: number;
  title?: string;
  subtitle?: string;
  showFeatured?: boolean;
  layout?: 'grid' | 'list';
}

export function EventTypeSelection({
  onSelectEventType,
  selectedEventTypeId,
  title = 'Choose Your Event',
  subtitle = 'Select the type of event you want to book',
  showFeatured = true,
  layout: layoutType = 'list',
}: EventTypeSelectionProps) {
  const { data: eventTypes, isLoading, error, refetch, isRefetching } = useEventTypes();
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleSelectEventType = useCallback((eventType: EventType) => {
    onSelectEventType(eventType);
  }, [onSelectEventType]);

  const handleViewDetails = useCallback((eventType: EventType) => {
    setSelectedEventType(eventType);
    setShowDetailModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
  }, []);

  const handleBookFromModal = useCallback((eventType: EventType) => {
    onSelectEventType(eventType);
  }, [onSelectEventType]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading event types...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState
          icon={<MagnifyingGlass size={48} color={colors.neutral.gray} />}
          title="Couldn't Load Events"
          message="There was a problem loading event types. Please try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  // Empty state
  if (!eventTypes || eventTypes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon={<Sparkle size={48} color={colors.neutral.gray} />}
          title="No Events Available"
          message="There are no event types available for booking at this time."
        />
      </View>
    );
  }

  // Separate featured and regular event types
  const featuredEventTypes = eventTypes.filter(et => et.is_featured);
  const regularEventTypes = eventTypes.filter(et => !et.is_featured);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.black]}
            tintColor={colors.primary.black}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Featured Event Types */}
        {showFeatured && featuredEventTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <View style={styles.featuredList}>
              {featuredEventTypes.map((eventType) => (
                <EventTypeCard
                  key={eventType.id}
                  eventType={eventType}
                  variant="featured"
                  onPress={handleSelectEventType}
                  onViewDetails={handleViewDetails}
                  selected={selectedEventTypeId === eventType.id}
                />
              ))}
            </View>
          </View>
        )}

        {/* All Event Types */}
        <View style={styles.section}>
          {showFeatured && featuredEventTypes.length > 0 && (
            <Text style={styles.sectionTitle}>All Event Types</Text>
          )}
          <View style={layoutType === 'grid' ? styles.gridList : styles.list}>
            {regularEventTypes.map((eventType) => (
              <View
                key={eventType.id}
                style={layoutType === 'grid' ? styles.gridItem : styles.listItem}
              >
                <EventTypeCard
                  eventType={eventType}
                  variant="standard"
                  onPress={handleSelectEventType}
                  onViewDetails={handleViewDetails}
                  selected={selectedEventTypeId === eventType.id}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <EventTypeDetailModal
        visible={showDetailModal}
        eventType={selectedEventType}
        onClose={handleCloseModal}
        onBook={handleBookFromModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featuredList: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  listItem: {
    marginBottom: 0,
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});

export default EventTypeSelection;
