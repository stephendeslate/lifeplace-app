// frontend/client-portal/src/components/booking/steps/EnhancedContactInfoStep.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Alert,
  Autocomplete,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AutoAwesome as AutoAwesomeIcon,
  Security as SecurityIcon,
  AccountCircle as AccountIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import { useContactInfo } from '../../../hooks/booking/useContactInfo';
import type { 
  ContactInfoStepData, 
  ContactInfoStepConfiguration, 
  BookingFlow,
  StepValidationResult
} from '../../../types/booking';

interface EnhancedContactInfoStepProps {
  stepData?: ContactInfoStepData;
  config?: ContactInfoStepConfiguration;
  onDataChange: (data: ContactInfoStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  flowConfig: BookingFlow | null;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

interface ValidationState {
  email: 'idle' | 'validating' | 'valid' | 'invalid';
  phone: 'idle' | 'validating' | 'valid' | 'invalid';
  full_name: 'idle' | 'validating' | 'valid' | 'invalid';
}

interface SmartSuggestion {
  type: 'address' | 'phone' | 'email';
  value: string;
  confidence: number;
  source: string;
}

// Philippines phone number formatting utility
const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  if (cleaned.length <= 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // For international format
  if (cleaned.startsWith('63')) {
    return `+63 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 12)}`;
  }
  
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
};

// Email validation utility
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation for Philippines
const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Accept 10-11 digit numbers, or international format starting with 63
  return cleaned.length >= 10 && (
    cleaned.length <= 11 || 
    (cleaned.startsWith('63') && cleaned.length === 12)
  );
};

// Get location suggestions - can be enhanced with API integration
const getLocationSuggestions = (): string[] => {
  // This would typically call a location API service
  // For now, return empty array to avoid hardcoded data
  return [];
};

export const EnhancedContactInfoStep: React.FC<EnhancedContactInfoStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors: externalValidationErrors,
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  
  const {
    getInitialData,
    fieldRequirements,
    accountCreationOptions,
    isAuthenticated,
    user,
  } = useContactInfo(config);

  // Form data state
  const [formData, setFormData] = useState<ContactInfoStepData>(() => {
    if (stepData) return stepData;
    if (isAuthenticated && user) {
      return {
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: '',
        address: '',
        company: '',
        create_account: false,
      };
    }
    return getInitialData();
  });

  // Advanced validation states
  const [validationState, setValidationState] = useState<ValidationState>({
    email: 'idle',
    phone: 'idle',
    full_name: 'idle',
  });

  // Smart suggestions
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [emailStrength, setEmailStrength] = useState(0);
  const [phoneStrength, setPhoneStrength] = useState(0);

  // Update form data with real-time validation
  const updateFormData = useCallback((field: keyof ContactInfoStepData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);

    // Real-time validation for specific fields
    if (field === 'email') {
      setValidationState(prev => ({ ...prev, email: 'validating' }));
      setTimeout(() => {
        const isValid = validateEmail(value);
        setValidationState(prev => ({ ...prev, email: isValid ? 'valid' : 'invalid' }));
        setEmailStrength(isValid ? (value.includes('.com') ? 100 : 80) : 0);
        if (isValid) {
          announceToScreenReader('Email address is valid');
        }
      }, 500);
    }

    if (field === 'phone') {
      setValidationState(prev => ({ ...prev, phone: 'validating' }));
      const formatted = formatPhoneNumber(value);
      if (formatted !== value) {
        const updatedData = { ...newData, phone: formatted };
        setFormData(updatedData);
        onDataChange(updatedData);
      }
      
      setTimeout(() => {
        const isValid = validatePhoneNumber(formatted);
        setValidationState(prev => ({ ...prev, phone: isValid ? 'valid' : 'invalid' }));
        setPhoneStrength(isValid ? 100 : 0);
        if (isValid) {
          announceToScreenReader('Phone number is valid');
        }
      }, 500);
    }

    if (field === 'full_name') {
      setValidationState(prev => ({ ...prev, full_name: 'validating' }));
      setTimeout(() => {
        const hasFullName = value && value.trim().length > 0 && value.includes(' ');
        setValidationState(prev => ({ ...prev, full_name: hasFullName ? 'valid' : 'invalid' }));
      }, 300);
    }
  }, [formData, onDataChange, announceToScreenReader]);

  // Smart suggestions based on user input
  const generateSuggestions = useCallback((field: string, value: string) => {
    if (field === 'address' && value.length > 2) {
      const matches = getLocationSuggestions();
      
      const newSuggestions = matches.map(match => ({
        type: 'address' as const,
        value: match,
        confidence: 0.9,
        source: 'api_suggestions'
      }));
      
      setSuggestions(newSuggestions);
    }
  }, []);

  const getFieldError = (fieldName: string) => externalValidationErrors[fieldName]?.[0];
  const hasFieldError = (fieldName: string) => !!(externalValidationErrors[fieldName]?.length > 0);

  const getValidationIcon = (field: keyof ValidationState) => {
    switch (validationState[field]) {
      case 'validating':
        return <AutoAwesomeIcon color="primary" sx={{ animation: 'pulse 1s infinite' }} />;
      case 'valid':
        return <CheckCircleIcon color="success" />;
      case 'invalid':
        return null;
      default:
        return null;
    }
  };

  const getFieldStrength = (field: 'email' | 'phone') => {
    const strength = field === 'email' ? emailStrength : phoneStrength;
    if (strength === 0) return null;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Box sx={{ flex: 1, height: 4, backgroundColor: alpha('#fff', 0.2), borderRadius: 2 }}>
          <Box 
            sx={{ 
              height: '100%', 
              width: `${strength}%`, 
              backgroundColor: strength > 80 ? theme.palette.success.main : theme.palette.warning.main,
              borderRadius: 2,
              transition: 'all 0.3s ease'
            }} 
          />
        </Box>
        <Typography variant="caption" color={strength > 80 ? 'success.main' : 'warning.main'}>
          {strength > 80 ? 'Strong' : 'Good'}
        </Typography>
      </Box>
    );
  };

  const isFormValid = useMemo(() => {
    return formData.full_name && 
           formData.email && 
           formData.phone &&
           validationState.email === 'valid' &&
           validationState.phone === 'valid' &&
           validationState.full_name === 'valid';
  }, [formData, validationState]);

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 3,
            }}
          >
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Contact Information
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Please provide your contact details so we can coordinate your event perfectly
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Smart Status Cards */}
      <AnimatedElement animation="slideUp" delay={200}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          {[
            { key: 'full_name', label: 'Name', icon: <PersonIcon fontSize="small" /> },
            { key: 'email', label: 'Email', icon: <EmailIcon fontSize="small" /> },
            { key: 'phone', label: 'Phone', icon: <PhoneIcon fontSize="small" /> }
          ].map(item => (
            <Chip
              key={item.key}
              icon={getValidationIcon(item.key as keyof ValidationState) || item.icon}
              label={item.label}
              variant={validationState[item.key as keyof ValidationState] === 'valid' ? 'filled' : 'outlined'}
              color={validationState[item.key as keyof ValidationState] === 'valid' ? 'success' : 'default'}
              sx={{
                backgroundColor: validationState[item.key as keyof ValidationState] === 'valid' 
                  ? alpha(theme.palette.success.main, 0.15)
                  : alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </Box>
      </AnimatedElement>

      {/* Authenticated User Banner */}
      {isAuthenticated && user && (
        <AnimatedElement animation="slideRight" delay={250}>
          <GlassCard 
            variant="light" 
            intensity="subtle"
            sx={{
              mb: 4,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.15),
                  color: theme.palette.success.main,
                }}
              >
                <VerifiedIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Welcome back, {user.first_name}!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We've pre-filled your information from your account
                </Typography>
              </Box>
              <Chip 
                label="Verified User" 
                size="small"
                icon={<StarIcon />}
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.2),
                  color: theme.palette.success.main,
                }}
              />
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
        
        {/* Main Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Personal Information */}
          <AnimatedElement animation="slideRight" delay={300}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                backgroundColor: alpha('#fff', 0.08),
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <AccountIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Personal Details
                  </Typography>
                </Box>
                
                <TextField
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) => updateFormData('full_name', e.target.value)}
                  error={hasFieldError('full_name')}
                  helperText={getFieldError('full_name') || 'Enter your first and last name'}
                  required={fieldRequirements.full_name}
                  fullWidth
                  placeholder="John Doe"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: validationState.full_name === 'valid' && (
                      <InputAdornment position="end">
                        <CheckCircleIcon color="success" />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha('#fff', 0.2),
                      },
                    },
                  }}
                />
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Contact Information */}
          <AnimatedElement animation="slideRight" delay={400}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                backgroundColor: alpha('#fff', 0.08),
                border: hasFieldError('email') || hasFieldError('phone')
                  ? `2px solid ${theme.palette.error.main}` 
                  : `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <EmailIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Contact Details
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <TextField
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      error={hasFieldError('email') || validationState.email === 'invalid'}
                      helperText={getFieldError('email') || (validationState.email === 'invalid' ? 'Please enter a valid email address' : '')}
                      required={fieldRequirements.email}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            {getValidationIcon('email')}
                          </InputAdornment>
                        ),
                        sx: {
                          backgroundColor: alpha('#fff', 0.1),
                          backdropFilter: 'blur(10px)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha('#fff', 0.2),
                          },
                        },
                      }}
                    />
                    {getFieldStrength('email')}
                  </Box>
                  
                  <Box>
                    <TextField
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      error={hasFieldError('phone') || validationState.phone === 'invalid'}
                      helperText={getFieldError('phone') || (validationState.phone === 'invalid' ? 'Please enter a valid Philippines phone number' : 'Format: +63 XXX XXX XXXX')}
                      required={fieldRequirements.phone}
                      placeholder="+63 XXX XXX XXXX"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            {getValidationIcon('phone')}
                          </InputAdornment>
                        ),
                        sx: {
                          backgroundColor: alpha('#fff', 0.1),
                          backdropFilter: 'blur(10px)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha('#fff', 0.2),
                          },
                        },
                      }}
                    />
                    {getFieldStrength('phone')}
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Address Information */}
          <AnimatedElement animation="slideRight" delay={500}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                backgroundColor: alpha('#fff', 0.08),
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <LocationIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Address Details
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Autocomplete
                    options={suggestions.map(s => s.value)}
                    value={formData.address || ''}
                    onInputChange={(_, newValue) => {
                      updateFormData('address', newValue);
                      generateSuggestions('address', newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Address"
                        error={hasFieldError('address')}
                        helperText={getFieldError('address')}
                        required={fieldRequirements.address}
                        multiline
                        rows={2}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                                <LocationIcon color="primary" />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                          sx: {
                            backgroundColor: alpha('#fff', 0.1),
                            backdropFilter: 'blur(10px)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#fff', 0.2),
                            },
                          },
                        }}
                      />
                    )}
                  />
                  
                  <TextField
                    label="Company (Optional)"
                    value={formData.company || ''}
                    onChange={(e) => updateFormData('company', e.target.value)}
                    error={hasFieldError('company')}
                    helperText={getFieldError('company')}
                    required={fieldRequirements.company}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon color="primary" />
                        </InputAdornment>
                      ),
                      sx: {
                        backgroundColor: alpha('#fff', 0.1),
                        backdropFilter: 'blur(10px)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha('#fff', 0.2),
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Account Creation */}
          {accountCreationOptions.canCreateAccount && !isAuthenticated && (
            <AnimatedElement animation="slideRight" delay={600}>
              <GlassCard
                variant="light"
                intensity="subtle"
                sx={{
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Box sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <SecurityIcon color="info" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Account Options
                    </Typography>
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.create_account || false}
                        onChange={(e) => updateFormData('create_account', e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Create an account for faster future bookings
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Save your preferences and view booking history
                        </Typography>
                      </Box>
                    }
                  />
                  
                  {formData.create_account && (
                    <Box sx={{ mt: 3 }}>
                      <TextField
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => updateFormData('password', e.target.value)}
                        required
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                          sx: {
                            backgroundColor: alpha('#fff', 0.1),
                            backdropFilter: 'blur(10px)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#fff', 0.2),
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </GlassCard>
            </AnimatedElement>
          )}
        </Box>

        {/* Smart Sidebar */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Completion Status */}
          <AnimatedElement animation="slideLeft" delay={700}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                backgroundColor: isFormValid 
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha('#fff', 0.08),
                border: `1px solid ${alpha(isFormValid ? theme.palette.success.main : '#fff', 0.2)}`,
              }}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  {isFormValid ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <AutoAwesomeIcon color="primary" />
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {isFormValid ? 'Ready to Continue' : 'Form Progress'}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Completion</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Math.round((Object.values(validationState).filter(state => state === 'valid').length / 3) * 100)}%
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    height: 8, 
                    backgroundColor: alpha('#fff', 0.2), 
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      height: '100%', 
                      width: `${(Object.values(validationState).filter(state => state === 'valid').length / 3) * 100}%`,
                      backgroundColor: theme.palette.success.main,
                      transition: 'width 0.5s ease'
                    }} />
                  </Box>
                </Box>
                
                {isFormValid && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    All required information provided!
                  </Alert>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  {isFormValid 
                    ? 'Your contact information is complete and validated.'
                    : 'Please fill in all required fields to continue.'
                  }
                </Typography>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <AnimatedElement animation="slideLeft" delay={800}>
              <GlassCard
                variant="light"
                intensity="subtle"
                sx={{
                  backgroundColor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                }}
              >
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <AutoAwesomeIcon color="warning" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Smart Suggestions
                    </Typography>
                  </Box>
                  
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      onClick={() => updateFormData('address', suggestion.value)}
                      sx={{
                        mb: 1,
                        mr: 1,
                        backgroundColor: alpha('#fff', 0.1),
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.2),
                        },
                      }}
                    >
                      {suggestion.value}
                    </Button>
                  ))}
                </Box>
              </GlassCard>
            </AnimatedElement>
          )}

          {/* Help & Tips */}
          <AnimatedElement animation="slideLeft" delay={900}>
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                backgroundColor: alpha('#fff', 0.05),
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  💡 Quick Tips
                </Typography>
                
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Use a valid email - we'll send confirmation details
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Phone format: +63 XXX XXX XXXX for Philippines
                  </Typography>
                  <Typography component="li" variant="body2">
                    Creating an account saves time for future bookings
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </AnimatedElement>
        </Box>
      </Box>
    </Box>
  );
};