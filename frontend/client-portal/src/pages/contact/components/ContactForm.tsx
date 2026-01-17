// pages/contact/components/ContactForm.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Send, Check } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
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
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light" intensity="medium">
            <Stack spacing={4} sx={{ p: { xs: 4, md: 6 } }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Send Us a Message
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Have a question or inquiry? Fill out the form below and we'll get back to you soon.
                </Typography>
              </Box>

              {submitStatus === 'success' && (
                <Alert
                  severity="success"
                  icon={<Check />}
                  sx={{ borderRadius: 2 }}
                >
                  Thank you for your inquiry! We've received your message and will get back to you within 24-48 hours.
                </Alert>
              )}

              {submitStatus === 'error' && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {errorMessage}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    name="name"
                    label="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    fullWidth
                    variant="outlined"
                    disabled={isSubmitting}
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
                  />

                  <TextField
                    name="phone"
                    label="Phone Number (Optional)"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    disabled={isSubmitting}
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
                  >
                    {inquiryTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
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
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                    }}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </Stack>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                By submitting this form, you agree to be contacted regarding your inquiry.
                Your information will not be shared with third parties.
              </Typography>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};
