/**
 * QuestionnairesTab Component
 *
 * Displays questionnaire responses submitted for an event.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { ClipboardText, CheckCircle, RadioButton } from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventQuestionnaires } from '@/hooks/useEvents';
import { Skeleton, EmptyState, Card } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import type { EventQuestionnaire } from '@/types/events.types';

export interface QuestionnairesTabProps {
  eventId: number;
}

export function QuestionnairesTab({ eventId }: QuestionnairesTabProps) {
  const { data: questionnaires, isLoading, refetch, isRefetching } = useEventQuestionnaires(eventId);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton variant="rounded" height={150} style={styles.skeleton} />
        <Skeleton variant="rounded" height={150} style={styles.skeleton} />
      </View>
    );
  }

  if (!questionnaires || questionnaires.length === 0) {
    return (
      <EmptyState
        icon="document"
        title="No Questionnaires"
        description="No questionnaire responses have been submitted for this event yet."
      />
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    >
      {questionnaires.map((questionnaire) => (
        <QuestionnaireCard key={questionnaire.id} questionnaire={questionnaire} />
      ))}
    </ScrollView>
  );
}

interface QuestionnaireCardProps {
  questionnaire: EventQuestionnaire;
}

function QuestionnaireCard({ questionnaire }: QuestionnaireCardProps) {
  const isComplete = questionnaire.status === 'COMPLETED';

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <ClipboardText
            size={24}
            color={isComplete ? theme.colors.success[500] : theme.colors.primary[500]}
            weight="duotone"
          />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.cardTitle}>{questionnaire.questionnaire_title}</Text>
          <Text style={styles.cardDate}>
            {isComplete ? 'Completed' : 'Submitted'} {formatCardDate(questionnaire.submitted_at)}
          </Text>
        </View>
        {isComplete ? (
          <CheckCircle size={24} color={theme.colors.success[500]} weight="fill" />
        ) : (
          <RadioButton size={24} color={theme.colors.neutral[400]} />
        )}
      </View>

      {/* Responses Preview */}
      {questionnaire.responses && Object.keys(questionnaire.responses).length > 0 && (
        <View style={styles.responsesSection}>
          <Text style={styles.sectionLabel}>Responses</Text>
          {Object.entries(questionnaire.responses)
            .slice(0, 3)
            .map(([key, value]) => (
              <View key={key} style={styles.responseItem}>
                <Text style={styles.responseLabel}>{formatQuestionLabel(key)}</Text>
                <Text style={styles.responseValue}>{formatResponseValue(value)}</Text>
              </View>
            ))}
          {Object.keys(questionnaire.responses).length > 3 && (
            <Text style={styles.moreResponses}>
              +{Object.keys(questionnaire.responses).length - 3} more responses
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

/**
 * Format a question key into a readable label
 */
function formatQuestionLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format a response value for display
 */
function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined) return 'No response';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
  },
  skeleton: {
    marginBottom: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  cardDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  responsesSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  sectionLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  responseItem: {
    marginBottom: theme.spacing.sm,
  },
  responseLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    marginBottom: 2,
  },
  responseValue: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  moreResponses: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    marginTop: theme.spacing.xs,
  },
});

export default QuestionnairesTab;
