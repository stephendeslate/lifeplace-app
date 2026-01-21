/**
 * Documents Screen
 *
 * Aggregated view of all documents across events with search,
 * filtering, and sorting capabilities.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  MagnifyingGlass,
  SortAscending,
  SortDescending,
  X,
  ArrowLeft,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useDocuments } from '@/hooks/useDocuments';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { DocumentCard } from '@/components/documents';
import { EmptyState, Skeleton, ScreenErrorBoundary } from '@/components/common';
import type {
  DocumentItem,
  DocumentType,
  DocumentSortOption,
} from '@/types/documents.types';

// =============================================================================
// FILTER OPTIONS
// =============================================================================

const TYPE_FILTERS: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CONTRACT', label: 'Contracts' },
  { value: 'RECEIPT', label: 'Receipts' },
  { value: 'UPLOAD', label: 'Uploads' },
  { value: 'PHOTO', label: 'Photos' },
  { value: 'OTHER', label: 'Other' },
];

const SORT_OPTIONS: { value: DocumentSortOption; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'size', label: 'Size' },
];

// =============================================================================
// COMPONENT
// =============================================================================

function DocumentsScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');

  const {
    documents,
    isLoading,
    isRefetching,
    refresh,
    updateFilters,
    sortBy,
    setSortBy,
    sortAscending,
    toggleSortDirection,
    stats,
  } = useDocuments();

  const {
    isDownloading,
    downloadContractPDF,
  } = useDocumentDownload();

  // Apply search filter
  const filteredDocuments = useMemo(() => {
    let result = documents;

    // Apply type filter
    if (selectedType !== 'all') {
      result = result.filter((doc) => doc.type === selectedType);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.eventName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [documents, selectedType, searchQuery]);

  // Handlers
  const handleTypeChange = (type: DocumentType | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(type);
    if (type === 'all') {
      updateFilters({ types: undefined });
    } else {
      updateFilters({ types: [type] });
    }
  };

  const handleSortChange = (option: DocumentSortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(option);
  };

  const handleDownload = useCallback(
    async (doc: DocumentItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        if (doc.type === 'CONTRACT' && doc.contractId) {
          await downloadContractPDF(
            parseInt(doc.contractId),
            doc.templateName || doc.name
          );
        } else {
          // For other document types, show info alert
          Alert.alert(
            'Download',
            'Document will be downloaded and shared.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        Alert.alert('Download Failed', 'Unable to download document.');
      }
    },
    [downloadContractPDF]
  );

  const handleShare = useCallback(async (doc: DocumentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Share', `Share ${doc.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: () => console.log('Share:', doc.downloadUrl),
      },
    ]);
  }, []);

  const handlePreview = useCallback(
    (doc: DocumentItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (doc.type === 'CONTRACT' && doc.contractId) {
        router.push(`/contracts/${doc.contractId}`);
      }
    },
    [router]
  );

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const renderItem = useCallback(
    ({ item }: { item: DocumentItem }) => (
      <DocumentCard
        document={item}
        onDownload={handleDownload}
        onShare={handleShare}
        onPreview={item.type === 'CONTRACT' ? handlePreview : undefined}
        isDownloading={isDownloading}
        showEventName
      />
    ),
    [handleDownload, handleShare, handlePreview, isDownloading]
  );

  const renderEmpty = () => (
    <EmptyState
      icon="document"
      title="No Documents"
      description={
        searchQuery || selectedType !== 'all'
          ? 'No documents match your filters. Try adjusting your search.'
          : 'Documents from your events will appear here.'
      }
    />
  );

  const renderHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <MagnifyingGlass size={20} color={theme.colors.neutral[500]} />
          <TextInput
            style={styles.searchText}
            placeholder="Search documents..."
            placeholderTextColor={theme.colors.neutral[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => toggleSortDirection()}
        >
          {sortAscending ? (
            <SortAscending size={24} color={theme.colors.primary[500]} />
          ) : (
            <SortDescending size={24} color={theme.colors.primary[500]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Type Filters */}
      <FlatList
        horizontal
        data={TYPE_FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleTypeChange(item.value)}
            style={[
              styles.filterChip,
              selectedType === item.value && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === item.value && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Sort Options */}
      <View style={styles.sortOptions}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => handleSortChange(option.value)}
            style={[
              styles.sortOption,
              sortBy === option.value && styles.sortOptionActive,
            ]}
          >
            <Text
              style={[
                styles.sortOptionText,
                sortBy === option.value && styles.sortOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredDocuments.length} document
        {filteredDocuments.length !== 1 ? 's' : ''}
      </Text>
    </>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
          <Text style={styles.title}>Documents</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={72} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>
            {stats.total} total across {Object.keys(stats.byEvent).length} events
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Document List */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            colors={[theme.colors.accent.wood]}
            tintColor={theme.colors.accent.wood}
          />
        }
      />
    </View>
  );
}

export default function DocumentsScreen() {
  return (
    <ScreenErrorBoundary screenName="Documents">
      <DocumentsScreenContent />
    </ScreenErrorBoundary>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  headerCenter: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes['3xl'],
    color: theme.colors.primary[500],
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xxs,
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[500],
  },
  sortButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  filterList: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary[500],
  },
  filterChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[500],
  },
  filterChipTextActive: {
    color: theme.colors.neutral.white,
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sortLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  sortOption: {
    paddingVertical: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  sortOptionActive: {
    backgroundColor: theme.colors.accent.woodSubtle,
  },
  sortOptionText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral.darkGray,
  },
  sortOptionTextActive: {
    color: theme.colors.accent.wood,
    fontWeight: '600',
  },
  resultsCount: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 80, // Extra for bottom nav
  },
  separator: {
    height: theme.spacing.sm,
  },
  loadingContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
});
