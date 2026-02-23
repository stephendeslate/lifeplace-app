// frontend/client-portal/src/components/events/EventFeedback.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Rating,
  TextField,
  Button,
  Alert,
  Divider,
  Skeleton,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Feedback as FeedbackIcon,
  Star as StarIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { formatInTimeZone } from 'date-fns-tz';
import { useEvents } from '../../hooks/useEvents';
import type { FeedbackSubmission } from '../../types/events.types';

interface EventFeedbackProps {
  eventId: number;
  eventStatus: string;
  showEmpty?: boolean;
}

const FEEDBACK_CATEGORIES = [
  { key: 'communication', label: 'Communication' },
  { key: 'organization', label: 'Organization' },
  { key: 'quality', label: 'Quality of Service' },
  { key: 'timeliness', label: 'Timeliness' },
  { key: 'value', label: 'Value for Money' },
];

const EventFeedbackComponent: React.FC<EventFeedbackProps> = ({
  eventId,
  eventStatus,
  showEmpty = true,
}) => {
  const PHILIPPINE_TIMEZONE = 'Asia/Manila';
  const { useEventFeedback, useSubmitEventFeedback, useUpdateEventFeedback } = useEvents();

  const { data: feedback, isLoading, error } = useEventFeedback(eventId);

  const submitMutation = useSubmitEventFeedback();
  const updateMutation = useUpdateEventFeedback();

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FeedbackSubmission>({
    overall_rating: 5,
    categories: {},
    comments: '',
    testimonial: '',
    is_public: false,
  });

  // Initialize form data when feedback is loaded or editing starts
  React.useEffect(() => {
    if (feedback && isEditing) {
      setFormData({
        overall_rating: feedback.overall_rating,
        categories: feedback.categories || {},
        comments: feedback.comments || '',
        testimonial: feedback.testimonial || '',
        is_public: feedback.is_public || false,
      });
    }
  }, [feedback, isEditing]);

  // Handle form field changes
  const handleOverallRatingChange = (_: React.SyntheticEvent, value: number | null) => {
    if (value !== null) {
      setFormData((prev) => ({ ...prev, overall_rating: value }));
    }
  };

  const handleCategoryRatingChange = (category: string, value: number | null) => {
    if (value !== null) {
      setFormData((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: value,
        },
      }));
    }
  };

  const handleTextChange =
    (field: keyof FeedbackSubmission) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handlePublicToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, is_public: event.target.checked }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (feedback) {
        // Update existing feedback
        await updateMutation.mutateAsync({
          eventId,
          feedbackId: feedback.id,
          data: formData,
        });
      } else {
        // Submit new feedback
        await submitMutation.mutateAsync({
          eventId,
          data: formData,
        });
      }
      setIsEditing(false);
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (feedback) {
      // Reset form to current feedback data
      setFormData({
        overall_rating: feedback.overall_rating,
        categories: feedback.categories || {},
        comments: feedback.comments || '',
        testimonial: feedback.testimonial || '',
        is_public: feedback.is_public || false,
      });
    } else {
      // Reset to default
      setFormData({
        overall_rating: 5,
        categories: {},
        comments: '',
        testimonial: '',
        is_public: false,
      });
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <Box>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={100} />
          <Skeleton variant="rectangular" height={200} />
        </Stack>
      </Box>
    );
  }

  if (error && !error.message?.includes('404')) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load event feedback. Please try again later.
      </Alert>
    );
  }

  // Check if event is completed
  const canSubmitFeedback = eventStatus === 'COMPLETED';
  const hasFeedback = Boolean(feedback);

  // Show empty state if no feedback and not completed event
  if (!hasFeedback && !canSubmitFeedback) {
    return showEmpty ? (
      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
        <FeedbackIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Feedback Not Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Feedback can be submitted after the event is completed.
        </Typography>
      </Paper>
    ) : null;
  }

  // Show empty state if no feedback but event is completed
  if (!hasFeedback && canSubmitFeedback && !isEditing) {
    return showEmpty ? (
      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
        <FeedbackIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Share Your Feedback
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          We'd love to hear about your experience with this event.
        </Typography>
        <Button variant="contained" startIcon={<FeedbackIcon />} onClick={startEditing}>
          Submit Feedback
        </Button>
      </Paper>
    ) : null;
  }

  return (
    <Box role="region" aria-label="Event feedback">
      <Stack spacing={3}>
        {/* Existing Feedback Display */}
        {hasFeedback && feedback && !isEditing && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              {/* Header */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Your Feedback
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Submitted on{' '}
                    {formatInTimeZone(feedback.created_at, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                {!feedback.response && (
                  <Button variant="outlined" size="small" onClick={startEditing}>
                    Edit
                  </Button>
                )}
              </Stack>

              {/* Overall Rating */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                  Overall Rating:
                </Typography>
                <Rating value={feedback.overall_rating} readOnly />
                <Typography variant="body2" color="text.secondary">
                  ({feedback.overall_rating}/5)
                </Typography>
              </Stack>

              {/* Category Ratings */}
              {feedback.categories && Object.keys(feedback.categories).length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body1" fontWeight={500}>
                      Category Ratings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {Object.entries(feedback.categories).map(([key, rating]) => {
                        const category = FEEDBACK_CATEGORIES.find((cat) => cat.key === key);
                        return (
                          <Stack
                            key={key}
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography variant="body2">{category?.label || key}:</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Rating value={rating} size="small" readOnly />
                              <Typography variant="caption" color="text.secondary">
                                ({rating}/5)
                              </Typography>
                            </Stack>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Comments */}
              {feedback.comments && (
                <Box>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    Comments
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feedback.comments}
                  </Typography>
                </Box>
              )}

              {/* Testimonial */}
              {feedback.testimonial && (
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Typography variant="body1" fontWeight={500}>
                      Testimonial
                    </Typography>
                    {feedback.is_public && <Chip label="Public" size="small" color="primary" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {feedback.testimonial}
                  </Typography>
                </Box>
              )}

              {/* Admin Response */}
              {feedback.has_response && feedback.response && (
                <>
                  <Divider />
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <ReplyIcon fontSize="small" color="primary" />
                      <Typography variant="body1" fontWeight={500} color="primary">
                        Response from {feedback.response_by_name || 'Team'}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {feedback.response}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        )}

        {/* Feedback Form */}
        {(isEditing || (!hasFeedback && canSubmitFeedback)) && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6" gutterBottom>
                {hasFeedback ? 'Edit Your Feedback' : 'Submit Feedback'}
              </Typography>

              {/* Overall Rating */}
              <Box>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Overall Rating *
                </Typography>
                <Rating
                  value={formData.overall_rating}
                  onChange={handleOverallRatingChange}
                  icon={<StarIcon fontSize="inherit" />}
                  emptyIcon={<StarIcon fontSize="inherit" />}
                />
              </Box>

              {/* Category Ratings */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body1" fontWeight={500}>
                    Category Ratings (Optional)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {FEEDBACK_CATEGORIES.map((category) => (
                      <Stack
                        key={category.key}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="body2">{category.label}:</Typography>
                        <Rating
                          value={formData.categories?.[category.key] || 0}
                          onChange={(_, value) => handleCategoryRatingChange(category.key, value)}
                          size="small"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Comments */}
              <TextField
                label="Comments"
                multiline
                rows={4}
                value={formData.comments}
                onChange={handleTextChange('comments')}
                placeholder="Share your thoughts about the event experience..."
                fullWidth
              />

              {/* Testimonial */}
              <TextField
                label="Testimonial (Optional)"
                multiline
                rows={3}
                value={formData.testimonial}
                onChange={handleTextChange('testimonial')}
                placeholder="Would you like to share a testimonial that we can use publicly?"
                fullWidth
                helperText="This can be used as a public testimonial if you choose to make it public"
              />

              {/* Public checkbox */}
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_public || false}
                    onChange={handlePublicToggle}
                    color="primary"
                  />
                }
                label="Allow this feedback to be used publicly as a testimonial"
              />

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  onClick={handleCancel}
                  disabled={submitMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  disabled={submitMutation.isPending || updateMutation.isPending}
                  startIcon={<FeedbackIcon />}
                >
                  {submitMutation.isPending || updateMutation.isPending
                    ? 'Submitting...'
                    : hasFeedback
                      ? 'Update Feedback'
                      : 'Submit Feedback'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default EventFeedbackComponent;
