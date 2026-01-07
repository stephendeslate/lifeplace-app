/**
 * Event Detail Screen
 *
 * Displays comprehensive event details with 10 tabs:
 * Timeline, Tasks, Documents, Invoices, Contracts, Quotes, Questionnaires, Feedback, Check-In, Notes
 *
 * Matches client-portal EventDetail patterns.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CaretLeft,
  CaretDown,
  Calendar,
  Clock,
  MapPin,
  Users,
  DotsThreeVertical,
} from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useEvent } from '@/hooks/useEvents';
import { contractsApi, type Contract } from '@/apis/contracts.api';
import { theme } from '@/theme';
import { spacing, typeScale } from '@/theme';
import { EventStatusBadge, EventInfoSheet } from '@/components/events';
import { Skeleton } from '@/components/common';
import { ContractSigningSheet } from '@/components/contracts/ContractSigningSheet';
import type { EventStatus } from '@/types/events.types';
import {
  TimelineTab,
  TasksTab,
  DocumentsTab,
  InvoicesTab,
  ContractsTab,
  QuotesTab,
  QuestionnairesTab,
  FeedbackTab,
  NotesTab,
  CheckInTab,
} from '@/components/events/tabs';
import { formatEventDate, formatTime } from '@/utils/formatting';
import { useToast } from '@/contexts/ToastContext';

interface TabMeasurement {
  x: number;
  width: number;
}

interface Tab {
  id: string;
  label: string;
  component: React.ComponentType<{
    eventId: number;
    eventStatus?: EventStatus;
  }>;
}

const TABS: Tab[] = [
  { id: 'timeline', label: 'Timeline', component: TimelineTab },
  { id: 'tasks', label: 'Tasks', component: TasksTab },
  { id: 'documents', label: 'Documents', component: DocumentsTab },
  { id: 'invoices', label: 'Invoices', component: InvoicesTab },
  { id: 'contracts', label: 'Contracts', component: ContractsTab },
  { id: 'quotes', label: 'Quotes', component: QuotesTab },
  { id: 'questionnaires', label: 'Questionnaires', component: QuestionnairesTab },
  { id: 'feedback', label: 'Feedback', component: FeedbackTab },
  { id: 'checkin', label: 'Check-In', component: CheckInTab },
  { id: 'notes', label: 'Notes', component: NotesTab },
];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const eventId = parseInt(id, 10);
  const { showToast } = useToast();

  const { data: event, isLoading, refetch, isRefetching } = useEvent(eventId);

  // Contract signing state
  const [signingSheetVisible, setSigningSheetVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Event info sheet state
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);

  // Find initial tab index from URL param or default to 0
  const initialTabIndex = useMemo(() => {
    if (!initialTab) return 0;
    const index = TABS.findIndex((t) => t.id === initialTab);
    return index >= 0 ? index : 0;
  }, [initialTab]);

  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex);
  const [tabMeasurements, setTabMeasurements] = useState<TabMeasurement[]>([]);
  const tabIndicatorPosition = useSharedValue(0);
  const tabIndicatorWidth = useSharedValue(0);

  // Update indicator position when active tab changes or measurements are available
  useEffect(() => {
    if (tabMeasurements.length > 0 && tabMeasurements[activeTabIndex]) {
      const { x, width } = tabMeasurements[activeTabIndex];
      tabIndicatorPosition.value = withTiming(x, { duration: 200 });
      tabIndicatorWidth.value = withTiming(width, { duration: 200 });
    }
  }, [activeTabIndex, tabMeasurements, tabIndicatorPosition, tabIndicatorWidth]);

  const handleTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabMeasurements((prev) => {
      const updated = [...prev];
      updated[index] = { x, width };
      return updated;
    });
  }, []);

  const handleTabPress = useCallback((index: number) => {
    Haptics.selectionAsync();
    setActiveTabIndex(index);
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  // Contract signing handlers
  const handleSignContract = useCallback(async (contract: Contract) => {
    try {
      // Fetch full contract details before opening signing sheet
      const fullContract = await contractsApi.getContract(contract.id);
      setSelectedContract(fullContract);
      setSigningSheetVisible(true);
    } catch (error) {
      showToast('Failed to load contract details', 'error');
    }
  }, [showToast]);

  const handleSignComplete = useCallback((signedContract: Contract) => {
    showToast('Contract signed successfully!', 'success');
    refetch();
    setSigningSheetVisible(false);
    setSelectedContract(null);
  }, [showToast, refetch]);

  const handleSignError = useCallback((error: string) => {
    showToast(error, 'error');
  }, [showToast]);

  const handleCloseSigningSheet = useCallback(() => {
    setSigningSheetVisible(false);
    setSelectedContract(null);
  }, []);

  // Event info sheet handlers
  const handleOpenInfoSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInfoSheetVisible(true);
  }, []);

  const handleCloseInfoSheet = useCallback(() => {
    setInfoSheetVisible(false);
  }, []);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorPosition.value }],
    width: tabIndicatorWidth.value,
  }));

  const ActiveTabComponent = TABS[activeTabIndex].component;
  const activeTabId = TABS[activeTabIndex].id;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.neutral[800]} />
          </Pressable>
        </View>
        <View style={styles.loadingContent}>
          <Skeleton variant="rounded" height={200} style={styles.skeleton} />
          <Skeleton variant="rounded" height={50} style={styles.skeleton} />
          <Skeleton variant="rounded" height={300} style={styles.skeleton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.neutral[800]} />
          </Pressable>
        </View>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorText}>
            This event may have been removed or you don't have access to it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient overlay */}
      <LinearGradient
        colors={[theme.colors.primary[600], theme.colors.primary[800]]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable onPress={handleBack} style={styles.headerButton}>
              <CaretLeft size={24} color={theme.colors.surface} />
            </Pressable>
            <Pressable style={styles.headerButton}>
              <DotsThreeVertical size={24} color={theme.colors.surface} />
            </Pressable>
          </View>

          {/* Event Info - Tappable to open info sheet */}
          <Pressable style={styles.eventInfo} onPress={handleOpenInfoSheet}>
            <EventStatusBadge status={event.status} size="medium" />
            <Text style={styles.eventName}>{event.name}</Text>

            {/* Event Meta */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Calendar size={16} color={theme.colors.primary[200]} />
                <Text style={styles.metaText}>
                  {formatEventDate(event.start_date, event.end_date)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              {event.start_time && (
                <View style={styles.metaItem}>
                  <Clock size={16} color={theme.colors.primary[200]} />
                  <Text style={styles.metaText}>
                    {formatTime(event.start_time)}
                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                  </Text>
                </View>
              )}
              {event.venue_name && (
                <View style={styles.metaItem}>
                  <MapPin size={16} color={theme.colors.primary[200]} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {event.venue_name}
                  </Text>
                </View>
              )}
            </View>

            {event.num_participants && (
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Users size={16} color={theme.colors.primary[200]} />
                  <Text style={styles.metaText}>
                    {event.num_participants} participants
                  </Text>
                </View>
              </View>
            )}

            {/* Chevron indicator - tap for more details */}
            {event.event_info && (
              <View style={styles.chevronIndicator}>
                <CaretDown size={20} color={theme.colors.primary[200]} />
                <Text style={styles.chevronText}>Tap for venue & package details</Text>
              </View>
            )}
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab, index) => (
            <Pressable
              key={tab.id}
              style={[
                styles.tabItem,
                activeTabIndex === index && styles.tabItemActive,
              ]}
              onPress={() => handleTabPress(index)}
              onLayout={(e) => handleTabLayout(index, e)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTabIndex === index && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
          {/* Indicator inside ScrollView so it scrolls with tabs */}
          <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Tab Component with contract signing support */}
        {activeTabId === 'contracts' ? (
          <ContractsTab
            eventId={eventId}
            onSignContract={handleSignContract}
          />
        ) : activeTabId === 'timeline' ? (
          <TimelineTab
            eventId={eventId}
            event={event}
          />
        ) : (
          <ActiveTabComponent eventId={eventId} eventStatus={event.status} />
        )}
      </View>

      {/* Contract Signing Sheet */}
      <ContractSigningSheet
        visible={signingSheetVisible}
        onClose={handleCloseSigningSheet}
        contract={selectedContract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />

      {/* Event Info Sheet */}
      <EventInfoSheet
        visible={infoSheetVisible}
        onClose={handleCloseInfoSheet}
        eventInfo={event.event_info || null}
        eventName={event.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    paddingHorizontal: spacing.lg,
  },
  eventName: {
    ...typeScale.headlineMedium,
    color: theme.colors.surface,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[100],
  },
  chevronIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  chevronText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary[200],
  },
  tabBarContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    position: 'relative',
  },
  tabBarContent: {
    paddingHorizontal: spacing.sm,
  },
  tabItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tabItemActive: {},
  tabLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  tabLabelActive: {
    color: theme.colors.primary[600],
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: theme.colors.primary[600],
  },
  tabContent: {
    flex: 1,
  },
  loadingContent: {
    padding: spacing.lg,
  },
  skeleton: {
    marginBottom: spacing.md,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typeScale.titleLarge,
    color: theme.colors.neutral[800],
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[600],
    textAlign: 'center',
  },
});
