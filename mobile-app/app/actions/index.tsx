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
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  Funnel,
  Warning,
  Clock,
  CheckCircle,
  X,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useActionCenter } from '@/hooks/useActionCenter';
import { ActionItemCard } from '@/components/actions';
import { FilterModal } from '@/components/common/FilterModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import type { ActionType, UrgencyLevel, AnyActionItem } from '@/types/action-center.types';
import { ACTION_TYPE_CONFIGS } from '@/types/action-center.types';

const ACTION_TYPE_FILTERS: Array<{ value: ActionType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'QUOTE', label: 'Quotes' },
  { value: 'CONTRACT', label: 'Contracts' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'TASK', label: 'Tasks' },
];

export default function ActionCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Filter state
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<ActionType | 'ALL'>('ALL');
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
      <FlatList
        horizontal
        data={ACTION_TYPE_FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeTabs}
        renderItem={({ item }) => {
          const isActive = selectedTypeFilter === item.value;
          const count =
            item.value === 'ALL'
              ? counts.total
              : counts[item.value.toLowerCase() as keyof typeof counts];
          return (
            <TouchableOpacity
              style={[styles.typeTab, isActive && styles.typeTabActive]}
              onPress={() => setSelectedTypeFilter(item.value)}
            >
              <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>
                {item.label}
              </Text>
              {typeof count === 'number' && count > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Actions List */}
      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
  },
  header: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
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
  typeTabs: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 24,
    backgroundColor: theme.colors.neutral.white,
    gap: theme.spacing.xs,
  },
  typeTabActive: {
    backgroundColor: theme.colors.primary.black,
  },
  typeTabText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
  },
  typeTabTextActive: {
    color: theme.colors.neutral.white,
  },
  countBadge: {
    backgroundColor: theme.colors.neutral.warmGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.primary.black,
  },
  countTextActive: {
    color: theme.colors.neutral.white,
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
