/**
 * TasksTab Component
 *
 * Displays event tasks that the client can view/complete.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle,
  RadioButton,
  Clock,
  Warning,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventTasks, useUpdateEventTask } from '@/hooks/useEvents';
import { Skeleton, EmptyState, Badge } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import {
  getTaskPriorityColor,
  getTaskStatusColor,
} from '@/utils/eventHelpers';
import type { EventTask, TaskPriority } from '@/types/events.types';

export interface TasksTabProps {
  eventId: number;
}

const priorityIcons: Record<TaskPriority, React.ComponentType<any>> = {
  URGENT: Warning,
  HIGH: ArrowUp,
  MEDIUM: Minus,
  LOW: ArrowDown,
};

export function TasksTab({ eventId }: TasksTabProps) {
  const { data: tasks, isLoading, refetch, isRefetching } = useEventTasks(eventId);
  const updateTask = useUpdateEventTask();
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const handleCompleteTask = (task: EventTask) => {
    if (!task.can_update) return;

    Alert.alert(
      'Complete Task',
      `Are you sure you want to mark "${task.title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            updateTask.mutate({
              eventId,
              taskId: task.id,
              data: { status: 'COMPLETED' },
            });
          },
        },
      ]
    );
  };

  const handleStartTask = (task: EventTask) => {
    if (!task.can_update) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask.mutate({
      eventId,
      taskId: task.id,
      data: { status: 'IN_PROGRESS' },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="circular" width={32} height={32} />
            <View style={styles.skeletonContent}>
              <Skeleton variant="text" width="70%" height={18} />
              <Skeleton variant="text" width="40%" height={14} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No Tasks"
        description="There are no tasks assigned to you for this event."
      />
    );
  }

  const renderItem = ({ item: task }: { item: EventTask }) => {
    const PriorityIcon = priorityIcons[task.priority];
    const priorityColor = getTaskPriorityColor(task.priority);
    const isCompleted = task.status === 'COMPLETED';
    const isExpanded = expandedTaskId === task.id;
    const isOverdue =
      !isCompleted && task.due_date && new Date(task.due_date) < new Date();

    return (
      <Pressable
        style={[styles.taskItem, isCompleted && styles.taskItemCompleted]}
        onPress={() => setExpandedTaskId(isExpanded ? null : task.id)}
      >
        {/* Status indicator */}
        <Pressable
          onPress={() =>
            isCompleted ? null : task.status === 'PENDING'
              ? handleStartTask(task)
              : handleCompleteTask(task)
          }
          disabled={!task.can_update || isCompleted}
          style={styles.statusButton}
        >
          {isCompleted ? (
            <CheckCircle
              size={28}
              color={theme.colors.success[500]}
              weight="fill"
            />
          ) : task.status === 'IN_PROGRESS' ? (
            <Clock size={28} color={theme.colors.primary[500]} weight="fill" />
          ) : (
            <RadioButton size={28} color={theme.colors.neutral[300]} />
          )}
        </Pressable>

        {/* Task content */}
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text
              style={[
                styles.taskTitle,
                isCompleted && styles.taskTitleCompleted,
              ]}
              numberOfLines={isExpanded ? undefined : 1}
            >
              {task.title}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
              <PriorityIcon size={12} color={priorityColor} weight="bold" />
            </View>
          </View>

          <View style={styles.taskMeta}>
            <Text
              style={[styles.dueDate, isOverdue && styles.dueDateOverdue]}
            >
              Due: {formatCardDate(task.due_date)}
            </Text>
            {task.requires_client_input && (
              <Badge label="Your Input Needed" variant="warning" size="small" />
            )}
          </View>

          {isExpanded && task.description && (
            <Text style={styles.taskDescription}>{task.description}</Text>
          )}

          {isExpanded && task.can_update && !isCompleted && (
            <View style={styles.taskActions}>
              {task.status === 'PENDING' && (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleStartTask(task)}
                >
                  <Text style={styles.actionButtonText}>Start Task</Text>
                </Pressable>
              )}
              {task.status === 'IN_PROGRESS' && (
                <Pressable
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={() => handleCompleteTask(task)}
                >
                  <Text style={styles.actionButtonTextPrimary}>
                    Mark Complete
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
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
  taskItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemCompleted: {
    opacity: 0.7,
    backgroundColor: theme.colors.neutral[50],
  },
  statusButton: {
    marginRight: theme.spacing.md,
    padding: 4,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  taskTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.neutral[500],
  },
  priorityBadge: {
    padding: 4,
    borderRadius: theme.borderRadius.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  dueDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  dueDateOverdue: {
    color: theme.colors.error[500],
    fontFamily: theme.typography.fonts.medium,
  },
  taskDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  taskActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  actionButtonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  actionButtonTextPrimary: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.surface,
  },
  skeletonItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  skeletonContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});

export default TasksTab;
