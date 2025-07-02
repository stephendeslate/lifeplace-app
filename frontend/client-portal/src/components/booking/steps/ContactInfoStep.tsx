// frontend/client-portal/src/components/booking/steps/ContactInfoStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Divider,
  FormHelperText,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import type { 
  ContactInfoStepConfiguration,
  BookingFlowStep 
} from '../../../types/booking.types';
import type { 
  BaseStepProps 
} from '../../../types/booking-steps.types';
import type { ContactInfoStepData } from '../../../types/booking-session.types';

interface ContactInfoStepProps extends BaseStepProps<ContactInfoStepData> {
  step: BookingFlowStep;
}

const ContactInfoStep: React.FC<ContactInfoStepProps> = ({
  step,
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSave,
  isLoading = false,
  validationErrors = {},
  canGoNext = true,
  canGoPrevious = true,
  showSaveButton = true,
}) => {
  const {
    updateSessionData,
    validateStepData,
    isUpdating,
    error: sessionError,
  } = useBookingSessionContext();

  // Get step configuration
  const config = step.configuration_data as ContactInfoStepConfiguration;

  // Form state
  const [formData, setFormData] = useState<ContactInfoStepData>({
    full_name: data.full_name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    company: data.company || '',
    custom_fields: data.custom_fields || {},
    create_account: data.create_account || false,
    password: data.password || '',
    password_confirm: data.password_confirm || '',
    marketing_consent: data.marketing_consent || false,
  });

  // Local validation state
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Update parent component when form data changes
  useEffect(() => {
    onUpdate(formData);
  }, [formData, onUpdate]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof ContactInfoStepData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear local error for this field
    if (localErrors[field]) {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [localErrors]);

  // Handle custom field changes
  const handleCustomFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldName]: value,
      },
    }));
  }, []);

  // Validate form data
  const validateForm = useCallback(async () => {
    setIsValidating(true);
    
    try {
      const result = await validateStepData(step.id, formData);
      
      if (!result.isValid) {
        setLocalErrors(result.errors);
        return false;
      }
      
      setLocalErrors({});
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [step.id, formData, validateStepData]);

  // Handle save
  const handleSave = useCallback(async () => {
    const isValid = await validateForm();
    if (isValid) {
      try {
        await updateSessionData(step.id, formData, false);
        onSave();
      } catch (error) {
        console.error('Save failed:', error);
      }
    }
  }, [validateForm, updateSessionData, step.id, formData, onSave]);

  // Handle next
  const handleNext = useCallback(async () => {
    const isValid = await validateForm();
    if (isValid) {
      try {
        await updateSessionData(step.id, formData, true);
        onNext();
      } catch (error) {
        console.error('Next step failed:', error);
      }
    }
  }, [validateForm, updateSessionData, step.id, formData, onNext]);

  // Combine validation errors (local + from context)
  const allErrors = { ...localErrors, ...validationErrors };

  // Helper to get field error
  const getFieldError = (fieldName: string): string | undefined => {
    const errors = allErrors[fieldName];
    return errors && errors.length > 0 ? errors[0] : undefined;
  };

  // Helper to check if field has error
  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  // Check if field is required
  const isFieldRequired = (fieldName: keyof ContactInfoStepConfiguration): boolean => {
    return config ? Boolean(config[fieldName]) : false;
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 2, 
          fontWeight: 600,
          color: 'primary.main',
          textAlign: 'center'
        }}
      >
        {step.name || 'Contact Information'}
      </Typography>

      {step.description && (
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 4, 
            color: 'text.secondary',
            textAlign: 'center'
          }}
        >
          {step.description}
        </Typography>
      )}

      {sessionError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {sessionError.message || 'An error occurred. Please try again.'}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            {/* Full Name */}
            {(isFieldRequired('require_full_name') || formData.full_name) && (
              <TextField
                fullWidth
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => handleFieldChange('full_name', e.target.value)}
                required={isFieldRequired('require_full_name')}
                error={hasFieldError('full_name')}
                helperText={getFieldError('full_name')}
                disabled={isLoading || isUpdating}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Email */}
            {(isFieldRequired('require_email') || formData.email) && (
              <TextField
                fullWidth
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                required={isFieldRequired('require_email')}
                error={hasFieldError('email')}
                helperText={getFieldError('email')}
                disabled={isLoading || isUpdating}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Phone */}
            {(isFieldRequired('require_phone') || formData.phone) && (
              <TextField
                fullWidth
                type="tel"
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                required={isFieldRequired('require_phone')}
                error={hasFieldError('phone')}
                helperText={getFieldError('phone')}
                disabled={isLoading || isUpdating}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Address */}
            {(isFieldRequired('require_address') || formData.address) && (
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Address"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                required={isFieldRequired('require_address')}
                error={hasFieldError('address')}
                helperText={getFieldError('address')}
                disabled={isLoading || isUpdating}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <HomeIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Company */}
            {(isFieldRequired('require_company') || formData.company) && (
              <TextField
                fullWidth
                label="Company"
                value={formData.company}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                required={isFieldRequired('require_company')}
                error={hasFieldError('company')}
                helperText={getFieldError('company')}
                disabled={isLoading || isUpdating}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* Custom Fields */}
            {config?.custom_fields && config.custom_fields.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.primary' }}>
                  Additional Information
                </Typography>
                
                {config.custom_fields.map((field: any, index: number) => (
                  <TextField
                    key={index}
                    fullWidth
                    label={field.label || field.name}
                    value={formData.custom_fields?.[field.name] || ''}
                    onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                    required={field.required || false}
                    multiline={field.type === 'textarea'}
                    rows={field.type === 'textarea' ? 3 : 1}
                    disabled={isLoading || isUpdating}
                    helperText={field.help_text}
                  />
                ))}
              </>
            )}

            {/* Account Creation */}
            {config?.offer_account_creation && (
              <>
                <Divider sx={{ my: 2 }} />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.create_account}
                      onChange={(e) => handleFieldChange('create_account', e.target.checked)}
                      disabled={isLoading || isUpdating}
                    />
                  }
                  label="Create an account to save your information and track your booking"
                />

                {formData.create_account && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      required={formData.create_account}
                      error={hasFieldError('password')}
                      helperText={getFieldError('password') || 'Password must be at least 8 characters'}
                      disabled={isLoading || isUpdating}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      type={showPasswordConfirm ? 'text' : 'password'}
                      label="Confirm Password"
                      value={formData.password_confirm}
                      onChange={(e) => handleFieldChange('password_confirm', e.target.value)}
                      required={formData.create_account}
                      error={hasFieldError('password_confirm')}
                      helperText={getFieldError('password_confirm')}
                      disabled={isLoading || isUpdating}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                              edge="end"
                            >
                              {showPasswordConfirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Stack>
                )}
              </>
            )}

            {/* Marketing Consent */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.marketing_consent}
                  onChange={(e) => handleFieldChange('marketing_consent', e.target.checked)}
                  disabled={isLoading || isUpdating}
                />
              }
              label="I'd like to receive updates about events and special offers"
            />

            {/* Form-level errors */}
            {allErrors.general && (
              <Alert severity="error">
                {allErrors.general[0]}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mt: 4,
          gap: 2
        }}
      >
        <Button
          variant="outlined"
          onClick={onPrevious}
          disabled={!canGoPrevious || isLoading || isUpdating || isValidating}
          sx={{ minWidth: 120 }}
        >
          Previous
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {showSaveButton && (
            <Button
              variant="text"
              onClick={handleSave}
              disabled={isLoading || isUpdating || isValidating}
            >
              {isUpdating ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Save Progress'
              )}
            </Button>
          )}

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canGoNext || isLoading || isUpdating || isValidating}
            sx={{ minWidth: 120 }}
          >
            {isValidating || isUpdating ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {isValidating ? 'Validating...' : 'Saving...'}
              </>
            ) : (
              'Next'
            )}
          </Button>
        </Box>
      </Box>

      {/* Required fields notice */}
      {config && (
        <FormHelperText sx={{ textAlign: 'center', mt: 2 }}>
          * Required fields
        </FormHelperText>
      )}
    </Box>
  );
};

export default ContactInfoStep;