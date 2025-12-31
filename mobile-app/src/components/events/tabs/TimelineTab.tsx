/**
 * TimelineTab Component
 *
 * Displays the event activity timeline.
 */

import React from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl } from 'react-native';
import {
  CheckCircle,
  FileText,
  CurrencyCircleDollar,
  ChatCircle,
  CalendarCheck,
  User,
  Info,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventTimeline } from '@/hooks/useEvents';
import { Skeleton, EmptyState } from '@/components/common';
import { WorkflowProgressStepper } from '@/components/events/WorkflowProgressStepper';
import { getRelativeTime } from '@/utils/formatting';
import type { EventTimeline } from '@/types/events.types';
import type { WorkflowProgress } from '@/apis/workflows.api';

export interface TimelineTabProps {
  eventId: number;
  workflowProgress?: WorkflowProgress | null;
}

const actionTypeConfig: Record<
  string,
  { icon: React.ComponentType<any>; color: string }
> = {
  EVENT_CREATED: { icon: CalendarCheck, color: theme.colors.primary[500] },
  EVENT_UPDATED: { icon: Info, color: theme.colors.primary[500] },
  PAYMENT_RECEIVED: { icon: CurrencyCircleDollar, color: theme.colors.success[500] },
  DOCUMENT_UPLOADED: { icon: FileText, color: theme.colors.warning[500] },
  CONTRACT_SIGNED: { icon: CheckCircle, color: theme.colors.success[500] },
  QUOTE_ACCEPTED: { icon: CheckCircle, color: theme.colors.success[500] },
  QUOTE_REJECTED: { icon: Info, color: theme.colors.error[500] },
  NOTE_ADDED: { icon: ChatCircle, color: theme.colors.primary[500] },
  FEEDBACK_SUBMITTED: { icon: User, color: theme.colors.primary[500] },
  TASK_COMPLETED: { icon: CheckCircle, color: theme.colors.success[500] },
  STATUS_CHANGED: { icon: Info, color: theme.colors.warning[500] },
};

export function TimelineTab({ eventId, workflowProgress }: TimelineTabProps) {
  const { data: timeline, isLoading, refetch, isRefetching } = useEventTimeline(eventId);

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="circular" width={40} height={40} />
            <View style={styles.skeletonContent}>
              <Skeleton variant="text" width="80%" height={16} />
              <Skeleton variant="text" width="50%" height={12} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No Activity Yet"
        description="Activity for this event will appear here as it happens."
      />
    );
  }

  const renderItem = ({ item, index }: { item: EventTimeline; index: number }) => {
    const config = actionTypeConfig[item.action_type] || {
      icon: Info,
      color: theme.colors.neutral[500],
    };
    const IconComponent = config.icon;
    const isLast = index === timeline.length - 1;

    return (
      <View style={styles.timelineItem}>
        {/* Connector line */}
        {!isLast && <View style={styles.connectorLine} />}

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <IconComponent size={20} color={config.color} weight="bold" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.metadata}>
            <Text style={styles.actor}>{item.actor_name}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.time}>{getRelativeTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = workflowProgress ? (
    <View style={styles.workflowContainer}>
      <WorkflowProgressStepper progress={workflowProgress} variant="stepper" />
    </View>
  ) : null;

  return (
    <FlatList
      data={timeline}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      ListHeaderComponent={ListHeader}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: 19,
    top: 44,
    bottom: -theme.spacing.lg,
    width: 2,
    backgroundColor: theme.colors.neutral[200],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
    paddingTop: 2,
  },
  description: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: 4,
    lineHeight: 22,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actor: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  separator: {
    marginHorizontal: theme.spacing.xs,
    color: theme.colors.neutral[400],
  },
  time: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  skeletonItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  skeletonContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  workflowContainer: {
    marginBottom: theme.spacing.md,
  },
});

export default TimelineTab;
