/**
 * Event Detail Screen
 *
 * Displays comprehensive event details with 10 tabs:
 * Timeline, Tasks, Documents, Invoices, Contracts, Quotes, Questionnaires, Feedback, Check-In, Notes
 *
 * Matches client-portal EventDetail patterns.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
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
  Calendar,
  Clock,
  MapPin,
  Users,
  DotsThreeVertical,
} from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useEvent } from '@/hooks/useEvents';
import { useWorkflowProgress } from '@/hooks/useWorkflowProgress';
import { contractsApi, type Contract } from '@/apis/contracts.api';
import { theme } from '@/theme';
import { spacing, typeScale } from '@/theme';
import { EventStatusBadge } from '@/components/events';
import { Skeleton } from '@/components/common';
import { ContractSigningSheet } from '@/components/contracts/ContractSigningSheet';
import type { EventStatus } from '@/types/events.types';
import type { WorkflowProgress } from '@/apis/workflows.api';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Tab {
  id: string;
  label: string;
  component: React.ComponentType<{
    eventId: number;
    eventStatus?: EventStatus;
    workflowProgress?: WorkflowProgress | null;
  }>;
}

const TABS: Tab[] = [
  { id: 'timeline', label: 'Timeline', component: TimelineTab },
  { id: 'tasks', label: 'Tasks', component: TasksTab },
  { id: 'documents', label: 'Documents', component: DocumentsTab },
  { id: 'invoices', label: 'Invoices', component: InvoicesTab },
  { id: 'contracts', label: 'Contracts', component: ContractsTab },
  { id: 'quotes', label: 'Quotes', component: QuotesTab },
  { id: 'questionnaires', label: 'Forms', component: QuestionnairesTab },
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
  const { data: workflowProgress } = useWorkflowProgress(eventId);

  // Contract signing state
  const [signingSheetVisible, setSigningSheetVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Find initial tab index from URL param or default to 0
  const initialTabIndex = useMemo(() => {
    if (!initialTab) return 0;
    const index = TABS.findIndex((t) => t.id === initialTab);
    return index >= 0 ? index : 0;
  }, [initialTab]);

  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex);
  const tabIndicatorPosition = useSharedValue(initialTabIndex * (SCREEN_WIDTH / TABS.length));

  useEffect(() => {
    tabIndicatorPosition.value = withTiming(
      activeTabIndex * (SCREEN_WIDTH / TABS.length),
      { duration: 200 }
    );
  }, [activeTabIndex, tabIndicatorPosition]);

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

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorPosition.value }],
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

          {/* Event Info */}
          <View style={styles.eventInfo}>
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
          </View>
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
        </ScrollView>
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
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
            workflowProgress={workflowProgress}
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
    height: 2,
    width: SCREEN_WIDTH / TABS.length,
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
