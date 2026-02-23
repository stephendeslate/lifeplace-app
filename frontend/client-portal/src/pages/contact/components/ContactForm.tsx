// pages/contact/components/ContactForm.tsx

import React, { useState } from 'react';
import { Box, Typography, Stack, TextField, MenuItem, Alert } from '@mui/material';
import { Send, Check } from '@mui/icons-material';
import { Section, Container, ModernCard, AnimatedElement, tokens } from '../../../design-system';
import { Button } from '../../../design-system';
import { inquiryApi } from '../../../apis/inquiry.api';
import type { ContactFormData, InquiryType } from '../types/contact.types';

// Type for axios error response
interface ApiErrorResponse {
  response?: {
    data?: {
      errors?: Record<string, string>;
      error?: string;
    };
    status?: number;
  };
}

const inquiryTypes: { value: InquiryType; label: string }[] = [
  { value: 'GENERAL_INQUIRY', label: 'General Inquiry' },
  { value: 'EVENT_QUESTION', label: 'Event Question' },
  { value: 'PARTNERSHIP_INTEREST', label: 'Partnership Interest' },
  { value: 'PRICING_QUESTION', label: 'Pricing Question' },
  { value: 'OTHER', label: 'Other' },
];

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'GENERAL_INQUIRY',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await inquiryApi.submitInquiry(formData);
      // Track successful contact form submission
      import('../../../utils/ga4').then(({ GA4Events }) => GA4Events.contactFormSubmitted());

      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: 'GENERAL_INQUIRY',
        message: '',
      });
    } catch (error: unknown) {
      setSubmitStatus('error');

      // Handle specific error messages from the API
      const apiError = error as ApiErrorResponse;
      if (apiError.response?.data?.errors) {
        const errors = apiError.response.data.errors;
        const errorMessages = Object.values(errors).filter(Boolean).join(' ');
        setErrorMessage(errorMessages || 'Please check your form and try again.');
      } else if (apiError.response?.data?.error) {
        setErrorMessage(apiError.response.data.error);
      } else if (apiError.response?.status === 429) {
        setErrorMessage('Too many submissions. Please wait a while before trying again.');
      } else {
        setErrorMessage('Failed to submit your inquiry. Please try again or contact us directly.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="narrow">
        <AnimatedElement animation="fadeIn" delay={100}>
          <ModernCard variant="elevated" size="large">
            <Stack spacing={tokens.spacing.space[8]}>
              {/* Header */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.color.base.neutral[900],
                    mb: tokens.spacing.space[2],
                  }}
                >
                  Send Us a Message
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: tokens.color.base.neutral[600],
                    fontSize: tokens.typography.sizes.md,
                  }}
                >
                  Have a question or inquiry? Fill out the form below and we'll get back to you
                  soon.
                </Typography>
              </Box>

              {/* Success Message */}
              {submitStatus === 'success' && (
                <Alert
                  severity="success"
                  icon={<Check />}
                  sx={{
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: tokens.color.semantic.success.subtle,
                    color: tokens.color.semantic.success.dark,
                    border: `1px solid ${tokens.color.semantic.success.light}`,
                    '& .MuiAlert-icon': {
                      color: tokens.color.semantic.success.main,
                    },
                  }}
                >
                  Thank you for your inquiry! We've received your message and will get back to you
                  within 24-48 hours.
                </Alert>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: tokens.color.semantic.error.subtle,
                    color: tokens.color.semantic.error.dark,
                    border: `1px solid ${tokens.color.semantic.error.light}`,
                    '& .MuiAlert-icon': {
                      color: tokens.color.semantic.error.main,
                    },
                  }}
                >
                  {errorMessage}
                </Alert>
              )}

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={tokens.spacing.space[5]}>
                  <TextField
                    name="name"
                    label="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    fullWidth
                    variant="outlined"
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: tokens.spacing.radius.lg,
                        backgroundColor: tokens.color.base.neutral[50],
                        transition: tokens.animation.transition.all,
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[200],
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.sage[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[500],
                          borderWidth: '2px',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: tokens.color.base.neutral[100],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        fontSize: tokens.typography.sizes.md,
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: tokens.color.base.neutral[900],
                        fontSize: tokens.typography.sizes.md,
                      },
                    }}
                  />

                  <TextField
                    name="email"
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    fullWidth
                    variant="outlined"
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: tokens.spacing.radius.lg,
                        backgroundColor: tokens.color.base.neutral[50],
                        transition: tokens.animation.transition.all,
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[200],
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.sage[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[500],
                          borderWidth: '2px',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: tokens.color.base.neutral[100],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        fontSize: tokens.typography.sizes.md,
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: tokens.color.base.neutral[900],
                        fontSize: tokens.typography.sizes.md,
                      },
                    }}
                  />

                  <TextField
                    name="phone"
                    label="Phone Number (Optional)"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: tokens.spacing.radius.lg,
                        backgroundColor: tokens.color.base.neutral[50],
                        transition: tokens.animation.transition.all,
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[200],
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.sage[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[500],
                          borderWidth: '2px',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: tokens.color.base.neutral[100],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        fontSize: tokens.typography.sizes.md,
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: tokens.color.base.neutral[900],
                        fontSize: tokens.typography.sizes.md,
                      },
                    }}
                  />

                  <TextField
                    name="inquiryType"
                    label="Inquiry Type"
                    select
                    value={formData.inquiryType}
                    onChange={handleChange}
                    required
                    fullWidth
                    variant="outlined"
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: tokens.spacing.radius.lg,
                        backgroundColor: tokens.color.base.neutral[50],
                        transition: tokens.animation.transition.all,
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[200],
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.sage[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[500],
                          borderWidth: '2px',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: tokens.color.base.neutral[100],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        fontSize: tokens.typography.sizes.md,
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: tokens.color.base.neutral[900],
                        fontSize: tokens.typography.sizes.md,
                      },
                    }}
                  >
                    {inquiryTypes.map((type) => (
                      <MenuItem
                        key={type.value}
                        value={type.value}
                        sx={{
                          fontSize: tokens.typography.sizes.md,
                          color: tokens.color.base.neutral[800],
                          '&:hover': {
                            backgroundColor: tokens.color.base.sage[50],
                          },
                          '&.Mui-selected': {
                            backgroundColor: tokens.color.base.sage[100],
                            '&:hover': {
                              backgroundColor: tokens.color.base.sage[200],
                            },
                          },
                        }}
                      >
                        {type.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    name="message"
                    label="Your Message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    fullWidth
                    multiline
                    rows={5}
                    variant="outlined"
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: tokens.spacing.radius.lg,
                        backgroundColor: tokens.color.base.neutral[50],
                        transition: tokens.animation.transition.all,
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[200],
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.sage[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[500],
                          borderWidth: '2px',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: tokens.color.base.neutral[100],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        fontSize: tokens.typography.sizes.md,
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: tokens.color.base.neutral[900],
                        fontSize: tokens.typography.sizes.md,
                        lineHeight: tokens.typography.lineHeights.relaxed,
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="terracotta"
                    size="large"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    endIcon={!isSubmitting && <Send />}
                    fullWidth
                    ariaLabel={isSubmitting ? 'Sending your message' : 'Send message'}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </Stack>
              </Box>

              {/* Privacy Notice */}
              <Typography
                variant="caption"
                sx={{
                  textAlign: 'center',
                  color: tokens.color.base.neutral[600],
                  fontSize: tokens.typography.sizes.sm,
                  lineHeight: tokens.typography.lineHeights.relaxed,
                }}
              >
                By submitting this form, you agree to be contacted regarding your inquiry. Your
                information will not be shared with third parties.
              </Typography>
            </Stack>
          </ModernCard>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
