// frontend/client-portal/src/components/booking/steps/ContactInfoStep.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useContactInfo } from '../../../hooks/booking/useContactInfo';
import type { 
  ContactInfoStepData, 
  ContactInfoStepConfiguration, 
  BookingFlow,
  StepValidationResult
} from '../../../types/booking';

interface ContactInfoStepProps {
  stepData?: ContactInfoStepData;
  config?: ContactInfoStepConfiguration;
  onDataChange: (data: ContactInfoStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  flowConfig: BookingFlow | null;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

export const ContactInfoStep: React.FC<ContactInfoStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors: externalValidationErrors,
  isValidating,
  flowConfig,
  onValidate,
}) => {
  const {
    getInitialData,
    fieldRequirements,
    accountCreationOptions,
    isAuthenticated,
    user,
  } = useContactInfo(config);

  // Use props stepData as single source of truth, with defaults from user if authenticated
  const formData: ContactInfoStepData = useMemo(() => {
    // If we have step data, use it
    if (stepData && (stepData.full_name || stepData.email)) {
      return {
        full_name: stepData.full_name || '',
        email: stepData.email || '',
        phone: stepData.phone || '',
        address: stepData.address || '',
        company: stepData.company || '',
        create_account: stepData.create_account || false,
        password: stepData.password || '',
        custom_fields: stepData.custom_fields || {},
      };
    }
    
    // If authenticated and no step data, get defaults from user
    if (isAuthenticated && user) {
      return getInitialData();
    }
    
    // Otherwise return empty defaults
    return {
      full_name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      create_account: false,
      password: '',
      custom_fields: {},
    };
  }, [stepData, isAuthenticated, user, getInitialData]);

  // Handle field change - directly update parent
  const handleFieldChange = useCallback(async (field: keyof ContactInfoStepData, value: any) => {
    const updatedData = {
      ...formData,
      [field]: value === undefined || value === null ? '' : value,
    };

    onDataChange(updatedData);

    // Auto-validate if onValidate is provided
    if (onValidate) {
      try {
        await onValidate(updatedData);
      } catch (error) {
        console.warn('Validation failed:', error);
      }
    }
  }, [formData, onDataChange, onValidate]);

  // Helper to get field error (prioritize external validation errors)
  const getFieldErrorMessage = useCallback((fieldName: string): string | undefined => {
    return externalValidationErrors[fieldName]?.[0];
  }, [externalValidationErrors]);

  // Helper to check if field has error
  const hasFieldErrorMessage = useCallback((fieldName: string): boolean => {
    return !!(externalValidationErrors[fieldName]?.length > 0);
  }, [externalValidationErrors]);

  const showAccountCreation = 
    accountCreationOptions.canCreateAccount && 
    flowConfig?.allow_guest_booking && 
    !accountCreationOptions.isAlreadyAuthenticated;

  const mustCreateAccount = 
    accountCreationOptions.mustCreateAccount || 
    flowConfig?.require_account_creation;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Contact Information
      </Typography>

      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Please provide your contact details so we can reach you about your event.
      </Typography>

      {/* Show authenticated user info */}
      {isAuthenticated && user && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are logged in as {user.email}. Your information has been pre-filled below.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Basic Information */}
        <Box>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Basic Information
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {/* Full Name */}
              {fieldRequirements.full_name && (
                <Box sx={{ width: { xs: '100%', md: 'calc(50% - 16px)' } }}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    required
                    value={formData.full_name}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    error={hasFieldErrorMessage('full_name')}
                    helperText={getFieldErrorMessage('full_name')}
                  />
                </Box>
              )}

              {/* Email */}
              {fieldRequirements.email && (
                <Box sx={{ width: { xs: '100%', md: 'calc(50% - 16px)' } }}>
                  <TextField
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    error={hasFieldErrorMessage('email')}
                    helperText={getFieldErrorMessage('email')}
                    disabled={isAuthenticated} // Disable if logged in
                  />
                </Box>
              )}

              {/* Phone */}
              {fieldRequirements.phone && (
                <Box sx={{ width: { xs: '100%', md: 'calc(50% - 16px)' } }}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    required
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    error={hasFieldErrorMessage('phone')}
                    helperText={getFieldErrorMessage('phone')}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </Box>
              )}

              {/* Company */}
              {fieldRequirements.company && (
                <Box sx={{ width: { xs: '100%', md: 'calc(50% - 16px)' } }}>
                  <TextField
                    label="Company/Organization"
                    fullWidth
                    required
                    value={formData.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    error={hasFieldErrorMessage('company')}
                    helperText={getFieldErrorMessage('company')}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Address (if required) */}
        {fieldRequirements.address && (
          <Box>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Address Information
              </Typography>

              <TextField
                label="Address"
                multiline
                rows={3}
                fullWidth
                required
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                error={hasFieldErrorMessage('address')}
                helperText={getFieldErrorMessage('address')}
              />
            </Paper>
          </Box>
        )}

        {/* Account Creation */}
        {showAccountCreation && (
          <Box>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Account Creation {mustCreateAccount ? '(Required)' : '(Optional)'}
              </Typography>

              {mustCreateAccount ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  An account will be created for you to manage your booking and receive updates.
                </Alert>
              ) : (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.create_account}
                      onChange={(e) => handleFieldChange('create_account', e.target.checked)}
                    />
                  }
                  label="Create an account to manage your bookings and receive updates"
                  sx={{ mb: 2 }}
                />
              )}

              {(formData.create_account || mustCreateAccount) && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Creating an account will allow you to view your booking status, receive updates, 
                    and easily book future events.
                  </Alert>

                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    required
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    error={hasFieldErrorMessage('password')}
                    helperText={getFieldErrorMessage('password') || 'Minimum 8 characters'}
                    sx={{ maxWidth: 400 }}
                  />
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* Account Already Exists Notice */}
        {isAuthenticated && (
          <Box>
            <Alert severity="success">
              You are logged in with your existing account. Your booking will be associated with this account automatically.
            </Alert>
          </Box>
        )}
      </Box>
    </Box>
  );
};