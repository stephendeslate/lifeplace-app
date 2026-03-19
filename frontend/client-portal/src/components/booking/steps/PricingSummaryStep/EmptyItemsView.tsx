import React from 'react';
import { Box, Typography, Paper, FormControlLabel, Checkbox, Alert } from '@mui/material';
import { Receipt } from '@mui/icons-material';
import type {
  PricingSummaryStepData,
  PricingSummaryStepConfiguration,
  StepData,
  BookingFlow,
} from '@/types/booking';

interface EmptyItemsViewProps {
  config: PricingSummaryStepConfiguration | null;
  stepData: PricingSummaryStepData;
  allStepData?: StepData;
  flow?: BookingFlow | null;
  validationErrors: Record<string, string[]>;
  formatDate: (dateString: string) => string;
  onTermsChange: (accepted: boolean) => void;
  onMarketingConsentChange: (consent: boolean) => void;
  onSpecialRequestsChange: (requests: string) => void;
}

export const EmptyItemsView: React.FC<EmptyItemsViewProps> = ({
  config,
  stepData,
  allStepData,
  flow,
  validationErrors,
  formatDate,
  onTermsChange,
  onMarketingConsentChange,
  onSpecialRequestsChange,
}) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt />
        {config?.header_text || 'Pricing Summary'}
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          No Packages or Add-ons Selected
        </Typography>
        <Typography variant="body2">
          You haven't selected any packages or add-ons yet. You can go back to browse available
          options, or continue to request a custom quote for your event.
        </Typography>
      </Alert>

      {/* Event Details - show even without items */}
      {config?.show_booking_review !== false && config?.show_event_details !== false && (
        <Box sx={{ mb: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Event Details
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Event Type
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {flow?.event_type_name || 'Not specified'}
              </Typography>
            </Box>

            {allStepData?.date_time?.start_date && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Event Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatDate(allStepData.date_time.start_date)}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Special Requests */}
      {config?.show_special_requests !== false && (
        <Box sx={{ mb: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Special Requests
            </Typography>

            <textarea
              placeholder="Any additional requests or special requirements for your event..."
              value={stepData.special_requests || ''}
              onChange={(e) => onSpecialRequestsChange(e.target.value)}
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
      )}

      {/* Terms and Conditions - required even for quote requests */}
      {config?.show_terms_checkbox !== false && (
        <Box sx={{ mb: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Terms and Conditions
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={stepData.terms_accepted || false}
                  onChange={(e) => onTermsChange(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  {config?.terms_text || (
                    <>
                      I agree to the{' '}
                      <a
                        href={config?.effective_terms_url || config?.terms_url || '/terms'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href={config?.effective_privacy_url || config?.privacy_url || '/privacy'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        Privacy Policy
                      </a>
                    </>
                  )}
                </Typography>
              }
              sx={{ mb: 2 }}
            />

            {config?.show_marketing_consent !== false && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stepData.marketing_consent || false}
                    onChange={(e) => onMarketingConsentChange(e.target.checked)}
                    color="primary"
                  />
                }
                label="I would like to receive marketing updates and special offers (optional)"
              />
            )}

            {config?.require_terms_acceptance !== false && validationErrors.terms_accepted && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {validationErrors.terms_accepted[0]}
              </Alert>
            )}
          </Paper>
        </Box>
      )}

      {/* Footer text */}
      {config?.footer_text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {config.footer_text}
        </Typography>
      )}
    </Box>
  );
};
