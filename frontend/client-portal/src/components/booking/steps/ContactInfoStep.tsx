// frontend/client-portal/src/components/booking/steps/ContactInfoStep.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  Stack,
  Divider,
  Paper,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Home,
  Business,
  AccountCircle,
  Info,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastActions } from '../../../contexts/ToastContext';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  ContactInfoStepConfig,
} from '../../../types/bookingflow.types';

interface ContactInfoStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

interface ContactFormData {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  create_account: boolean;
}

const ContactInfoStep: React.FC<ContactInfoStepProps> = ({
  step,
  data,
  validationErrors = {},
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { showInfo } = useToastActions();

  // Get step configuration - cast to ContactInfoStepConfig for type safety
  const config = step.configuration_data as ContactInfoStepConfig | undefined;

  // Initialize form data
  const [formData, setFormData] = useState<ContactFormData>({
    full_name: data.full_name || (user ? `${user.first_name} ${user.last_name}`.trim() : ''),
    email: data.email || user?.email || '',
    phone: data.phone || user?.profile?.phone || '',
    address: data.address || '',
    company: data.company || user?.profile?.company || '',
    create_account: data.create_account || false,
  });

  // Form validation state
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [hasInteracted, setHasInteracted] = useState<Record<string, boolean>>({});

  // Pre-fill with user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !data.email) {
      const initialData = {
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        phone: user.profile?.phone || '',
        address: '',
        company: user.profile?.company || '',
        create_account: false,
      };
      setFormData(initialData);
      onChange(initialData);
      
      if (user.first_name && user.last_name) {
        showInfo('Info Pre-filled', 'Your contact information has been pre-filled from your account.');
      }
    }
  }, [isAuthenticated, user, data.email, onChange, showInfo]);

  // Handle form field changes
  const handleFieldChange = (field: keyof ContactFormData, value: string | boolean) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    setHasInteracted({ ...hasInteracted, [field]: true });

    // Clear local error when user starts typing
    if (localErrors[field]) {
      setLocalErrors({ ...localErrors, [field]: '' });
    }

    // Validate field and notify parent
    // @ts-ignore
    const validation = validateForm(newData);
    onChange(newData);

    if (onValidate) {
      onValidate(newData);
    }
  };

  // Form validation
  const validateForm = (currentData: ContactFormData): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    // Full name validation
    if (config?.require_full_name !== false && !currentData.full_name.trim()) {
      errors.full_name = ['Full name is required'];
    } else if (currentData.full_name.trim() && currentData.full_name.trim().length < 2) {
      errors.full_name = ['Full name must be at least 2 characters'];
    }

    // Email validation
    if (config?.require_email !== false && !currentData.email.trim()) {
      errors.email = ['Email address is required'];
    } else if (currentData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentData.email)) {
        errors.email = ['Please enter a valid email address'];
      }
    }

    // Phone validation
    if (config?.require_phone && !currentData.phone.trim()) {
      errors.phone = ['Phone number is required'];
    } else if (currentData.phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(currentData.phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.phone = ['Please enter a valid phone number'];
      }
    }

    // Address validation
    if (config?.require_address && !currentData.address.trim()) {
      errors.address = ['Address is required'];
    }

    // Company validation
    if (config?.require_company && !currentData.company.trim()) {
      errors.company = ['Company name is required'];
    }

    // Account creation validation
    if (config?.require_account_creation && !isAuthenticated && !currentData.create_account) {
      errors.create_account = ['Account creation is required for this booking'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Get field error message
  const getFieldError = (field: string): string | undefined => {
    // Check validation errors from parent first
    if (validationErrors[field]?.length) {
      return validationErrors[field][0];
    }
    // Then check local errors
    if (localErrors[field]) {
      return localErrors[field];
    }
    return undefined;
  };

  // Check if field has error
  const hasFieldError = (field: string): boolean => {
    return !!(validationErrors[field]?.length || localErrors[field]);
  };

  // Handle blur events for validation
  const handleFieldBlur = (field: keyof ContactFormData) => {
    setHasInteracted({ ...hasInteracted, [field]: true });
    
    if (hasInteracted[field]) {
      const validation = validateForm(formData);
      const fieldErrors = validation.errors[field];
      
      if (fieldErrors?.length) {
        setLocalErrors({ ...localErrors, [field]: fieldErrors[0] });
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {/* Step Introduction */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Please provide your contact information so we can finalize your booking and keep you updated.
        </Typography>
      </Box>

      {/* Account Status Info */}
      {isAuthenticated ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You're signed in as <strong>{user?.email}</strong>. 
            Your information has been pre-filled where available.
          </Typography>
        </Alert>
      ) : config?.offer_account_creation && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box display="flex" alignItems="flex-start" gap={2}>
            <AccountCircle sx={{ color: 'primary.main', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Create an Account for Easier Booking
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Creating an account allows you to track your bookings, save preferences, 
                and speed up future reservations.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.create_account}
                    onChange={(e) => handleFieldChange('create_account', e.target.checked)}
                    disabled={isLoading || isReadOnly}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    {config?.require_account_creation
                      ? 'Account creation is required for this booking'
                      : 'Yes, create an account for me'
                    }
                  </Typography>
                }
              />
            </Box>
          </Box>
        </Paper>
      )}

      {/* Contact Form */}
      <Stack spacing={3}>
        {/* Full Name */}
        {config?.require_full_name !== false && (
          <TextField
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.full_name}
            onChange={(e) => handleFieldChange('full_name', e.target.value)}
            onBlur={() => handleFieldBlur('full_name')}
            error={hasFieldError('full_name')}
            helperText={getFieldError('full_name')}
            disabled={isLoading || isReadOnly}
            required={config?.require_full_name === true}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: isReadOnly ? 'action.hover' : 'background.paper',
              },
            }}
          />
        )}

        {/* Email */}
        {config?.require_email !== false && (
          <TextField
            label="Email Address"
            placeholder="Enter your email address"
            type="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
            error={hasFieldError('email')}
            helperText={getFieldError('email') || 'We\'ll use this to send you booking confirmations'}
            disabled={isLoading || isReadOnly || (isAuthenticated && !!user?.email)}
            required={config?.require_email === true}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: isReadOnly || (isAuthenticated && !!user?.email) ? 'action.hover' : 'background.paper',
              },
            }}
          />
        )}

        {/* Phone */}
        {(config?.require_phone || config?.require_phone !== false) && (
          <TextField
            label="Phone Number"
            placeholder="Enter your phone number"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            onBlur={() => handleFieldBlur('phone')}
            error={hasFieldError('phone')}
            helperText={getFieldError('phone') || 'For urgent communications about your booking'}
            disabled={isLoading || isReadOnly}
            required={config?.require_phone}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: isReadOnly ? 'action.hover' : 'background.paper',
              },
            }}
          />
        )}

        {/* Address */}
        {config?.require_address && (
          <TextField
            label="Address"
            placeholder="Enter your address"
            multiline
            minRows={2}
            maxRows={4}
            value={formData.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            onBlur={() => handleFieldBlur('address')}
            error={hasFieldError('address')}
            helperText={getFieldError('address')}
            disabled={isLoading || isReadOnly}
            required={config?.require_address}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <Home sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: isReadOnly ? 'action.hover' : 'background.paper',
              },
            }}
          />
        )}

        {/* Company */}
        {config?.require_company && (
          <TextField
            label="Company"
            placeholder="Enter your company name"
            value={formData.company}
            onChange={(e) => handleFieldChange('company', e.target.value)}
            onBlur={() => handleFieldBlur('company')}
            error={hasFieldError('company')}
            helperText={getFieldError('company')}
            disabled={isLoading || isReadOnly}
            required={config?.require_company}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: isReadOnly ? 'action.hover' : 'background.paper',
              },
            }}
          />
        )}

        {/* Custom Fields */}
        {Array.isArray(config?.custom_fields) &&
          config.custom_fields.map((field, index) => {
            // Type guard for custom field object
            if (
              typeof field === 'object' &&
              field !== null &&
              typeof field.key === 'string' &&
              typeof field.label === 'string'
            ) {
              return (
          <TextField
            key={`custom_field_${index}`}
            label={field.label}
            placeholder={field.placeholder}
            type={field.type || 'text'}
            multiline={field.type === 'textarea'}
            minRows={field.type === 'textarea' ? 2 : undefined}
            maxRows={field.type === 'textarea' ? 4 : undefined}
            value={(formData as Record<string, any>)[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            onBlur={() => handleFieldBlur(field.key)}
            error={hasFieldError(field.key)}
            helperText={getFieldError(field.key) || field.help_text}
            disabled={isLoading || isReadOnly}
            required={field.required}
            fullWidth
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: isReadOnly ? 'action.hover' : 'background.paper',
              },
            }}
          />
              );
            }
            return null;
          })}
      </Stack>

      {/* Account Creation Requirements */}
      {config?.require_account_creation && !isAuthenticated && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="warning" icon={<Info />}>
            <Typography variant="body2">
              <strong>Account Required:</strong> You'll need to create an account to complete this booking. 
              After providing your details, you'll be prompted to set a password.
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Read-only mode notice */}
      {isReadOnly && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="info">
            <Typography variant="body2">
              This information has been provided and cannot be modified at this step.
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="error">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Please correct the following errors:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {Object.entries(validationErrors).map(([field, errors]) => (
                <Box component="li" key={field}>
                  <Typography variant="body2">
                    {errors[0]}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Alert>
        </Box>
      )}

      {/* Privacy Notice */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          Your information is secure and will only be used for booking-related communications. 
          View our <Button variant="text" size="small" sx={{ p: 0, minWidth: 'auto', textDecoration: 'underline' }}>
            Privacy Policy
          </Button> for more details.
        </Typography>
      </Box>
    </Box>
  );
};

export default ContactInfoStep;