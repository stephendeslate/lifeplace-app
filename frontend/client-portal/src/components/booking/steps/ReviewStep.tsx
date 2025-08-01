// frontend/client-portal/src/components/booking/steps/ReviewStep.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  FormControlLabel,
  Checkbox,
  Alert,
  Chip,
} from '@mui/material';
import type { 
  ReviewStepData, 
  StepData, 
  BookingFlow, 
  BookingSession 
} from '../../../types/booking';

interface ReviewStepProps {
  stepData?: ReviewStepData;
  allStepData: StepData;
  config: any;
  onDataChange: (data: ReviewStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  flow: BookingFlow | null;
  session: BookingSession | null;
  totalPrice: string;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  stepData = {
    terms_accepted: false,
    marketing_consent: false,
    special_requests: '',
  },
  allStepData,
  config,
  onDataChange,
  validationErrors,
  isValidating,
  flow,
  session,
  totalPrice,
}) => {
  const handleTermsChange = (accepted: boolean) => {
    onDataChange({
      ...stepData,
      terms_accepted: accepted,
      marketing_consent: stepData.marketing_consent ?? false,
      special_requests: stepData.special_requests ?? '',
    });
  };

  const handleMarketingConsentChange = (consent: boolean) => {
    onDataChange({
      ...stepData,
      marketing_consent: consent,
      terms_accepted: stepData.terms_accepted ?? false,
      special_requests: stepData.special_requests ?? '',
    });
  };

  const handleSpecialRequestsChange = (requests: string) => {
    onDataChange({
      ...stepData,
      special_requests: requests,
      terms_accepted: stepData.terms_accepted ?? false,
      marketing_consent: stepData.marketing_consent ?? false,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Review Your Booking
      </Typography>

      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Please review all details before confirming your booking.
      </Typography>

      {/* Event Details */}
      <Box sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', height: 'fit-content' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Event Details
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Event Type</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {flow?.event_type_name || 'Not specified'}
            </Typography>
          </Box>

          {allStepData.date_time?.start_date && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Event Date</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formatDate(allStepData.date_time.start_date)}
              </Typography>
            </Box>
          )}

          {allStepData.date_time?.start_time && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Event Time</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {allStepData.date_time.start_time}
              </Typography>
            </Box>
          )}

          {allStepData.date_time?.duration && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Duration</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {allStepData.date_time.duration} hours
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Contact Information */}
      <Box sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', height: 'fit-content' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Contact Information
          </Typography>

          {allStepData.contact_info?.full_name && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {allStepData.contact_info.full_name}
              </Typography>
            </Box>
          )}

          {allStepData.contact_info?.email && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {allStepData.contact_info.email}
              </Typography>
            </Box>
          )}

          {allStepData.contact_info?.phone && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Phone</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {allStepData.contact_info.phone}
              </Typography>
            </Box>
          )}

          {allStepData.contact_info?.company && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Company</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {allStepData.contact_info.company}
              </Typography>
            </Box>
          )}

          {allStepData.contact_info?.create_account && (
            <Chip label="Account will be created" color="primary" size="small" />
          )}
        </Paper>
      </Box>

      {/* Payment Summary */}
      <Box>
        <Paper elevation={0} sx={{ p: 3, border: 2, borderColor: 'primary.main', backgroundColor: 'primary.light' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Payment Summary
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Total Amount:
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              ₱{totalPrice}
            </Typography>
          </Box>

          {allStepData.payment_info?.payment_type === 'DEPOSIT' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              * Deposit payment selected - remaining balance due before event date
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Special Requests */}
      <Box>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Special Requests
          </Typography>

          <textarea
            placeholder="Any additional requests or special requirements for your event..."
            value={stepData.special_requests || ''}
            onChange={(e) => handleSpecialRequestsChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </Paper>
      </Box>

      {/* Terms and Conditions */}
      <Box>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Terms and Conditions
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={stepData.terms_accepted || false}
                onChange={(e) => handleTermsChange(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <a href="/terms" target="_blank" style={{ color: 'blue' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" style={{ color: 'blue' }}>
                  Privacy Policy
                </a>
              </Typography>
            }
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={stepData.marketing_consent || false}
                onChange={(e) => handleMarketingConsentChange(e.target.checked)}
                color="primary"
              />
            }
            label="I would like to receive marketing updates and special offers from LifePlace Alfonso (optional)"
          />

          {validationErrors.terms_accepted && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {validationErrors.terms_accepted[0]}
            </Alert>
          )}
        </Paper>
      </Box>
    </Box>
  );
};