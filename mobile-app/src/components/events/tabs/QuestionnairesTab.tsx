/**
 * QuestionnairesTab Component
 *
 * Displays questionnaire responses with edit capability.
 * Matches client-portal EventQuestionnaires patterns.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ClipboardText,
  CheckCircle,
  RadioButton,
  PencilSimple,
  Check,
  X,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventQuestionnaires } from '@/hooks/useEvents';
import {
  useQuestionnairesForEvent,
  useEventResponses,
  useSaveEventResponses,
} from '@/hooks/useEventQuestionnaires';
import { Skeleton, EmptyState, Card, Button } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import type { EventQuestionnaire } from '@/types/events.types';
import type { Questionnaire, QuestionnaireResponse, QuestionnaireField } from '@/apis/questionnaires.api';

export interface QuestionnairesTabProps {
  eventId: number;
}

export function QuestionnairesTab({ eventId }: QuestionnairesTabProps) {
  // Use legacy hook for backward compatibility (displays submitted questionnaires)
  const { data: submittedQuestionnaires, isLoading: isLoadingSubmitted, refetch, isRefetching } = useEventQuestionnaires(eventId);

  // New hooks for full questionnaire editing (matches client-portal pattern)
  const { data: questionnaireStructures, isLoading: isLoadingStructures } = useQuestionnairesForEvent(eventId);
  const { data: responses, isLoading: isLoadingResponses } = useEventResponses(eventId);
  const saveResponses = useSaveEventResponses();

  const [editingQuestionnaireId, setEditingQuestionnaireId] = useState<number | null>(null);
  const [editedResponses, setEditedResponses] = useState<Record<number, string>>({});

  const isLoading = isLoadingSubmitted || isLoadingStructures || isLoadingResponses;

  // Build a map of field_id -> response value
  const responseMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (responses) {
      responses.forEach((response) => {
        map[response.field] = response.value;
      });
    }
    return map;
  }, [responses]);

  // Initialize edited responses when starting to edit
  useEffect(() => {
    if (editingQuestionnaireId !== null && questionnaireStructures) {
      const questionnaire = questionnaireStructures.find((q) => q.id === editingQuestionnaireId);
      if (questionnaire) {
        const initialResponses: Record<number, string> = {};
        questionnaire.fields.forEach((field) => {
          initialResponses[field.id] = responseMap[field.id] || '';
        });
        setEditedResponses(initialResponses);
      }
    }
  }, [editingQuestionnaireId, questionnaireStructures, responseMap]);

  const handleEditPress = (questionnaireId: number) => {
    Haptics.selectionAsync();
    setEditingQuestionnaireId(questionnaireId);
  };

  const handleCancelEdit = () => {
    Haptics.selectionAsync();
    setEditingQuestionnaireId(null);
    setEditedResponses({});
  };

  const handleSave = () => {
    if (editingQuestionnaireId === null) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const responsesToSave = Object.entries(editedResponses).map(([fieldId, value]) => ({
      field_id: parseInt(fieldId, 10),
      value,
    }));

    saveResponses.mutate(
      {
        event_id: eventId,
        responses: responsesToSave,
      },
      {
        onSuccess: () => {
          setEditingQuestionnaireId(null);
          setEditedResponses({});
          refetch();
        },
      }
    );
  };

  const handleFieldChange = (fieldId: number, value: string) => {
    setEditedResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton variant="rounded" height={150} style={styles.skeleton} />
        <Skeleton variant="rounded" height={150} style={styles.skeleton} />
      </View>
    );
  }

  // If we have questionnaire structures with fields, show editable view
  if (questionnaireStructures && questionnaireStructures.length > 0) {
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
        {questionnaireStructures.map((questionnaire) => (
          <EditableQuestionnaireCard
            key={questionnaire.id}
            questionnaire={questionnaire}
            responseMap={responseMap}
            isEditing={editingQuestionnaireId === questionnaire.id}
            editedResponses={editedResponses}
            onEdit={() => handleEditPress(questionnaire.id)}
            onCancel={handleCancelEdit}
            onSave={handleSave}
            onFieldChange={handleFieldChange}
            isSaving={saveResponses.isPending}
          />
        ))}
      </ScrollView>
    );
  }

  // Fallback to legacy view (submitted questionnaires without edit)
  if (!submittedQuestionnaires || submittedQuestionnaires.length === 0) {
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
      {submittedQuestionnaires.map((questionnaire) => (
        <LegacyQuestionnaireCard key={questionnaire.id} questionnaire={questionnaire} />
      ))}
    </ScrollView>
  );
}

// =============================================================================
// EDITABLE QUESTIONNAIRE CARD (with new API)
// =============================================================================

interface EditableQuestionnaireCardProps {
  questionnaire: Questionnaire;
  responseMap: Record<number, string>;
  isEditing: boolean;
  editedResponses: Record<number, string>;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFieldChange: (fieldId: number, value: string) => void;
  isSaving: boolean;
}

function EditableQuestionnaireCard({
  questionnaire,
  responseMap,
  isEditing,
  editedResponses,
  onEdit,
  onCancel,
  onSave,
  onFieldChange,
  isSaving,
}: EditableQuestionnaireCardProps) {
  const hasResponses = questionnaire.fields.some((field) => responseMap[field.id]);

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <ClipboardText
            size={24}
            color={hasResponses ? theme.colors.success[500] : theme.colors.primary[500]}
            weight="duotone"
          />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.cardTitle}>{questionnaire.name}</Text>
          <Text style={styles.cardDate}>
            {questionnaire.fields_count} {questionnaire.fields_count === 1 ? 'field' : 'fields'}
          </Text>
        </View>
        {hasResponses ? (
          <CheckCircle size={24} color={theme.colors.success[500]} weight="fill" />
        ) : (
          <RadioButton size={24} color={theme.colors.neutral[400]} />
        )}
      </View>

      {/* Fields */}
      <View style={styles.responsesSection}>
        {isEditing ? (
          // Edit mode: show input fields
          <>
            {questionnaire.fields
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <View key={field.id} style={styles.fieldItem}>
                  <Text style={styles.fieldLabel}>
                    {field.name}
                    {field.required && <Text style={styles.requiredMark}> *</Text>}
                  </Text>
                  {field.help_text && (
                    <Text style={styles.fieldHint}>{field.help_text}</Text>
                  )}
                  <TextInput
                    style={[
                      styles.fieldInput,
                      field.type === 'TEXT_LONG' && styles.fieldInputMultiline,
                    ]}
                    value={editedResponses[field.id] || ''}
                    onChangeText={(value) => onFieldChange(field.id, value)}
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                    placeholderTextColor={theme.colors.neutral[400]}
                    multiline={field.type === 'TEXT_LONG'}
                    numberOfLines={field.type === 'TEXT_LONG' ? 4 : 1}
                  />
                </View>
              ))}

            {/* Edit Actions */}
            <View style={styles.editActions}>
              <Button
                onPress={onCancel}
                variant="secondary"
                disabled={isSaving}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                onPress={onSave}
                variant="primary"
                loading={isSaving}
                disabled={isSaving}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            </View>
          </>
        ) : (
          // View mode: show responses
          <>
            {questionnaire.fields
              .sort((a, b) => a.order - b.order)
              .slice(0, 3)
              .map((field) => (
                <View key={field.id} style={styles.responseItem}>
                  <Text style={styles.responseLabel}>{field.name}</Text>
                  <Text style={styles.responseValue}>
                    {responseMap[field.id] || 'No response'}
                  </Text>
                </View>
              ))}
            {questionnaire.fields.length > 3 && (
              <Text style={styles.moreResponses}>
                +{questionnaire.fields.length - 3} more fields
              </Text>
            )}

            {/* Edit Button */}
            <Pressable onPress={onEdit} style={styles.editButton}>
              <PencilSimple size={18} color={theme.colors.primary[600]} />
              <Text style={styles.editButtonText}>
                {hasResponses ? 'Edit Responses' : 'Fill Out'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Card>
  );
}

// =============================================================================
// LEGACY QUESTIONNAIRE CARD (backward compatibility)
// =============================================================================

interface LegacyQuestionnaireCardProps {
  questionnaire: EventQuestionnaire;
}

function LegacyQuestionnaireCard({ questionnaire }: LegacyQuestionnaireCardProps) {
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

// =============================================================================
// UTILITIES
// =============================================================================

function formatQuestionLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined) return 'No response';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// =============================================================================
// STYLES
// =============================================================================

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
  // Edit mode styles
  fieldItem: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.xs,
  },
  requiredMark: {
    color: theme.colors.error[500],
  },
  fieldHint: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
  },
  fieldInput: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  fieldInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  editButtonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[600],
  },
});

export default QuestionnairesTab;
