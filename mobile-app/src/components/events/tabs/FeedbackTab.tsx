/**
 * FeedbackTab Component
 *
 * Displays event feedback form and submitted feedback with edit capability.
 * Matches client-portal EventFeedback patterns.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Switch,
  RefreshControl,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Star, CheckCircle, PencilSimple } from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventFeedback, useSubmitEventFeedback, useUpdateEventFeedback } from '@/hooks/useEvents';
import { Skeleton, EmptyState, Card, Button } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import type { EventStatus } from '@/types/events.types';

export interface FeedbackTabProps {
  eventId: number;
  eventStatus?: EventStatus;
}

export function FeedbackTab({ eventId, eventStatus = 'CONFIRMED' }: FeedbackTabProps) {
  const { data: feedback, isLoading, refetch, isRefetching } = useEventFeedback(eventId);
  const submitFeedback = useSubmitEventFeedback();
  const updateFeedback = useUpdateEventFeedback();

  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Initialize form with existing feedback when entering edit mode
  useEffect(() => {
    if (feedback && isEditing) {
      setRating(feedback.overall_rating);
      setComments(feedback.comments || '');
      setTestimonial(feedback.testimonial || '');
      setIsPublic(feedback.is_public);
    }
  }, [feedback, isEditing]);

  const canSubmitFeedback =
    eventStatus === 'COMPLETED' || eventStatus === 'IN_PROGRESS';

  const handleRatingPress = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(value);
  };

  const handleEditPress = () => {
    Haptics.selectionAsync();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Haptics.selectionAsync();
    setIsEditing(false);
    // Reset form values
    if (feedback) {
      setRating(feedback.overall_rating);
      setComments(feedback.comments || '');
      setTestimonial(feedback.testimonial || '');
      setIsPublic(feedback.is_public);
    }
  };

  const handleSubmit = () => {
    if (rating === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (feedback && isEditing) {
      // Update existing feedback
      updateFeedback.mutate(
        {
          eventId,
          feedbackId: feedback.id,
          data: {
            overall_rating: rating,
            comments,
            testimonial,
            is_public: isPublic,
          },
        },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        }
      );
    } else {
      // Submit new feedback
      submitFeedback.mutate({
        eventId,
        data: {
          overall_rating: rating,
          comments,
          testimonial,
          is_public: isPublic,
        },
      });
    }
  };

  const isSubmitting = submitFeedback.isPending || updateFeedback.isPending;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton variant="rounded" height={200} />
      </View>
    );
  }

  // Show submitted feedback (with edit capability)
  if (feedback && !isEditing) {
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
        <Card style={styles.feedbackCard}>
          <View style={styles.successHeader}>
            <CheckCircle
              size={48}
              color={theme.colors.success[500]}
              weight="fill"
            />
            <Text style={styles.successTitle}>Feedback Submitted</Text>
            <Text style={styles.successDate}>
              {formatCardDate(feedback.created_at)}
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingDisplay}>
            <Text style={styles.sectionLabel}>Your Rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  size={32}
                  color={
                    value <= feedback.overall_rating
                      ? theme.colors.warning[500]
                      : theme.colors.neutral[300]
                  }
                  weight={value <= feedback.overall_rating ? 'fill' : 'regular'}
                />
              ))}
            </View>
          </View>

          {/* Comments */}
          {feedback.comments && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Comments</Text>
              <Text style={styles.feedbackText}>{feedback.comments}</Text>
            </View>
          )}

          {/* Testimonial */}
          {feedback.testimonial && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Testimonial</Text>
              <Text style={styles.feedbackText}>{feedback.testimonial}</Text>
            </View>
          )}

          {/* Response from team */}
          {feedback.has_response && feedback.response && (
            <View style={styles.responseSection}>
              <Text style={styles.sectionLabel}>Response from Our Team</Text>
              <Text style={styles.responseText}>{feedback.response}</Text>
              {feedback.response_by_name && (
                <Text style={styles.responseBy}>
                  — {feedback.response_by_name}
                </Text>
              )}
            </View>
          )}

          {/* Edit Button */}
          <Button
            onPress={handleEditPress}
            variant="secondary"
            style={styles.editButton}
          >
            <View style={styles.editButtonContent}>
              <PencilSimple size={18} color={theme.colors.primary[600]} />
              <Text style={styles.editButtonText}>Edit Feedback</Text>
            </View>
          </Button>
        </Card>
      </ScrollView>
    );
  }

  // Show feedback form (only for new feedback, not edit mode which is handled below)
  if (!canSubmitFeedback && !isEditing) {
    return (
      <EmptyState
        icon="calendar"
        title="Feedback Not Available"
        description="You can submit feedback once your event is in progress or completed."
      />
    );
  }

  // Show feedback form (for new submission or editing)
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>
          {isEditing ? 'Edit Your Feedback' : 'Share Your Experience'}
        </Text>
        <Text style={styles.formDescription}>
          {isEditing
            ? 'Update your feedback below.'
            : "We'd love to hear about your experience. Your feedback helps us improve!"}
        </Text>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overall Rating *</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => handleRatingPress(value)}>
                <Star
                  size={40}
                  color={
                    value <= rating
                      ? theme.colors.warning[500]
                      : theme.colors.neutral[300]
                  }
                  weight={value <= rating ? 'fill' : 'regular'}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {rating === 5
                ? 'Excellent!'
                : rating === 4
                  ? 'Great!'
                  : rating === 3
                    ? 'Good'
                    : rating === 2
                      ? 'Fair'
                      : 'Poor'}
            </Text>
          )}
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Comments</Text>
          <TextInput
            style={styles.textArea}
            value={comments}
            onChangeText={setComments}
            placeholder="Tell us what you liked or what could be improved..."
            placeholderTextColor={theme.colors.neutral[400]}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Testimonial */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Testimonial</Text>
          <Text style={styles.fieldHint}>
            Share a testimonial that we may feature on our website.
          </Text>
          <TextInput
            style={styles.textArea}
            value={testimonial}
            onChangeText={setTestimonial}
            placeholder="I highly recommend LifePlace for..."
            placeholderTextColor={theme.colors.neutral[400]}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Public toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleLabel}>Make testimonial public</Text>
            <Text style={styles.toggleHint}>
              Allow us to share your testimonial on our website
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{
              false: theme.colors.neutral[300],
              true: theme.colors.primary[500],
            }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isEditing && (
            <Button
              onPress={handleCancelEdit}
              variant="secondary"
              disabled={isSubmitting}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          )}
          <Button
            onPress={handleSubmit}
            variant="primary"
            disabled={rating === 0 || isSubmitting}
            loading={isSubmitting}
            style={isEditing ? styles.saveButton : styles.submitButton}
          >
            {isEditing ? 'Save Changes' : 'Submit Feedback'}
          </Button>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
  },
  feedbackCard: {
    padding: theme.spacing.lg,
  },
  formCard: {
    padding: theme.spacing.lg,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.success[700],
    marginTop: theme.spacing.md,
  },
  successDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
  },
  formTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.sm,
  },
  formDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  ratingLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.warning[600],
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  feedbackText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[700],
    lineHeight: 22,
  },
  responseSection: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  responseText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[700],
    lineHeight: 22,
    fontStyle: 'italic',
  },
  responseBy: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    marginTop: theme.spacing.sm,
    textAlign: 'right',
  },
  fieldHint: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  toggleContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  toggleHint: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    flex: 1,
  },
  editButton: {
    marginTop: theme.spacing.lg,
  },
  editButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  editButtonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[600],
  },
  actionButtons: {
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
});

export default FeedbackTab;
