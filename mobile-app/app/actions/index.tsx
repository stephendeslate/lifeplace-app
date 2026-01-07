/**
 * Action Center Screen
 *
 * Unified view of all pending actions requiring client attention:
 * - Pending quotes
 * - Contracts needing signature
 * - Payments due or overdue
 * - Tasks requiring client input
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  Funnel,
  Warning,
  Clock,
  CheckCircle,
  X,
  CaretLeft,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useActionCenter } from '@/hooks/useActionCenter';
import { ActionItemCard } from '@/components/actions';
import { FilterModal } from '@/components/common/FilterModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { ScreenErrorBoundary } from '@/components/common/ScreenErrorBoundary';
import { FilterChips, type FilterChip } from '@/components/common';
import type { ActionType, UrgencyLevel, AnyActionItem } from '@/types/action-center.types';

type FilterValue = ActionType | 'ALL';

const ACTION_TYPE_FILTERS: FilterChip<FilterValue>[] = [
  { id: 'all', label: 'All', value: 'ALL' },
  { id: 'quote', label: 'Quotes', value: 'QUOTE' },
  { id: 'contract', label: 'Contracts', value: 'CONTRACT' },
  { id: 'payment', label: 'Payments', value: 'PAYMENT' },
  { id: 'task', label: 'Tasks', value: 'TASK' },
];

function ActionCenterScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Filter state
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<FilterValue>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ActionType[]>([]);
  const [selectedUrgencies, setSelectedUrgencies] = useState<UrgencyLevel[]>([]);

  // Build filters object
  const filters = useMemo(() => {
    const types: ActionType[] = [];

    // Add type from tab filter
    if (selectedTypeFilter !== 'ALL') {
      types.push(selectedTypeFilter);
    }

    // Add types from modal filter
    if (selectedTypes.length > 0) {
      types.push(...selectedTypes.filter((t) => !types.includes(t)));
    }

    return {
      types,
      urgency: selectedUrgencies.length > 0 ? selectedUrgencies : undefined,
      search: searchQuery || undefined,
    };
  }, [selectedTypeFilter, selectedTypes, selectedUrgencies, searchQuery]);

  // Fetch actions with filters
  const {
    actions,
    counts,
    isLoading,
    isRefetching,
    hasActions,
    hasCriticalActions,
    refetch,
  } = useActionCenter({ filters });

  // Handle action press - navigate to appropriate screen
  const handleActionPress = useCallback(
    (action: AnyActionItem) => {
      switch (action.type) {
        case 'QUOTE':
          router.push(`/quotes/${action.id.replace('quote-', '')}`);
          break;
        case 'CONTRACT':
          router.push(`/contracts/${action.id.replace('contract-', '')}`);
          break;
        case 'PAYMENT':
          const id = action.id.replace('payment-', '').replace('invoice-', '');
          router.push(`/payments/${id}`);
          break;
        case 'TASK':
          // Navigate to event with tasks tab
          router.push(`/events/${action.eventId}?tab=tasks`);
          break;
      }
    },
    [router]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedUrgencies([]);
    setSearchQuery('');
    setSelectedTypeFilter('ALL');
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedUrgencies.length > 0 ||
    searchQuery.length > 0 ||
    selectedTypeFilter !== 'ALL';

  // Render loading skeleton
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Skeleton width={180} height={32} />
          <Skeleton width={100} height={20} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.searchContainer}>
          <Skeleton width="100%" height={44} borderRadius={12} />
        </View>
        <View style={styles.content}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={120}
              borderRadius={12}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={24} color={theme.colors.primary.black} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Action Center</Text>

          {/* Summary counts */}
          <View style={styles.summaryRow}>
          {counts.critical > 0 && (
            <View style={styles.summaryItem}>
              <Warning size={16} color={theme.colors.semantic.error} weight="fill" />
              <Text style={[styles.summaryText, { color: theme.colors.semantic.error }]}>
                {counts.critical} Critical
              </Text>
            </View>
          )}
          {counts.high > 0 && (
            <View style={styles.summaryItem}>
              <Clock size={16} color={theme.colors.semantic.warning} />
              <Text style={[styles.summaryText, { color: theme.colors.semantic.warning }]}>
                {counts.high} High
              </Text>
            </View>
          )}
          {counts.total === 0 && (
            <View style={styles.summaryItem}>
              <CheckCircle size={16} color={theme.colors.semantic.success} />
              <Text style={[styles.summaryText, { color: theme.colors.semantic.success }]}>
                All caught up!
              </Text>
            </View>
          )}
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MagnifyingGlass size={20} color={theme.colors.neutral.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search actions..."
            placeholderTextColor={theme.colors.neutral.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.colors.neutral.gray} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Funnel
            size={24}
            color={hasActiveFilters ? theme.colors.neutral.white : theme.colors.primary.black}
          />
        </TouchableOpacity>
      </View>

      {/* Type Filter Tabs */}
      <FilterChips
        chips={ACTION_TYPE_FILTERS}
        selectedValue={selectedTypeFilter}
        onSelect={setSelectedTypeFilter}
        style={styles.filters}
      />

      {/* Actions List */}
      <FlashList
        data={actions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPaddingHorizontal,
          paddingBottom: insets.bottom + 20,
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <ActionItemCard action={item} onPress={() => handleActionPress(item)} />
        )}
        ListEmptyComponent={
          hasActiveFilters ? (
            <EmptyState
              icon="search"
              title="No matching actions"
              description="Try adjusting your filters or search query."
              actionLabel="Clear Filters"
              onAction={handleClearFilters}
            />
          ) : (
            <EmptyState
              icon="success"
              title="All Caught Up!"
              description="No actions require your attention right now. Great job!"
            />
          )
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        selectedUrgencies={selectedUrgencies}
        onUrgenciesChange={setSelectedUrgencies}
        onClearAll={() => {
          setSelectedTypes([]);
          setSelectedUrgencies([]);
        }}
      />
    </View>
  );
}

export default function ActionCenterScreen() {
  return (
    <ScreenErrorBoundary screenName="Action Center">
      <ActionCenterScreenContent />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  title: {
    ...theme.typeScale.headlineLarge,
    color: theme.colors.primary.black,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    ...theme.typeScale.labelSmall,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.white,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typeScale.bodyMedium,
    color: theme.colors.primary.black,
    padding: 0,
  },
  filterButton: {
    backgroundColor: theme.colors.neutral.white,
    padding: theme.spacing.sm,
    borderRadius: 12,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary.black,
  },
  filters: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginBottom: theme.spacing.md,
    flexGrow: 0,
    flexShrink: 0,
  },
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  separator: {
    height: theme.spacing.md,
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
});
