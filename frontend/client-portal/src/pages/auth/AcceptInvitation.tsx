// frontend/client-portal/src/pages/auth/AcceptInvitation.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useClientInvitations } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { validatePassword, validatePasswordConfirmation, getPasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from '../../utils/validation';
import type { AcceptInvitationData } from '../../types/clients.types';

const AcceptInvitation: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showSuccess, showError } = useToastActions();

  const [formData, setFormData] = useState<AcceptInvitationData>({
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { useInvitation, acceptInvitation, isAcceptingInvitation } = useClientInvitations();
  const { data: invitation, isLoading, error } = useInvitation(invitationId || '');

  useEffect(() => {
    if (error) {
      showError('Invalid Invitation', 'This invitation link is invalid, expired, or has already been used.');
    }
  }, [error, showError]);

  const handleInputChange = (field: keyof AcceptInvitationData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validatePasswordConfirmation(formData.password, formData.confirm_password);
    if (confirmPasswordError) newErrors.confirm_password = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm() || !invitationId) return;

    setIsSubmitting(true);

    try {
      // Accept the invitation
      const response = await new Promise<unknown>((resolve, reject) => {
        acceptInvitation(
          { invitationId, data: formData },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      // Auto-login the user with the returned tokens
      // Response data has dynamic structure requiring any type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((response as any)?.tokens && (response as any)?.user) {
        // Store user data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userData = (response as any).user;

        // Use the login function to set up the auth context
        await login({
          email: userData.email,
          password: formData.password,
        });

        showSuccess('Welcome to LifePlace!', 'Your account has been activated successfully.');
        navigate('/dashboard', { replace: true });
      }
    } catch (error: unknown) {
      console.error('Accept invitation error:', error);
      // Error objects from axios have dynamic structure requiring any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorObj = error as any;
      const message = errorObj.response?.data?.detail || 'Failed to activate account. Please try again.';
      showError('Activation Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabel = getPasswordStrengthLabel(passwordStrength);
  const strengthColor = getPasswordStrengthColor(passwordStrength);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Loading invitation details...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !invitation) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 500, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Invalid Invitation
            </Typography>
            <Typography variant="body2">
              This invitation link is invalid, expired, or has already been used. 
              Please contact LifePlace Alfonso if you believe this is an error.
            </Typography>
          </Alert>
          
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Return to Home
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 },
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Box sx={{ maxWidth: 500, width: '100%' }}>
        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              {/* Header */}
              <Box textAlign="center">
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                  Activate Your Account
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Complete your account setup to access LifePlace Alfonso services
                </Typography>
              </Box>

              {/* Invitation Details */}
              <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    Account Details
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <PersonIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Full Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {invitation.client_name}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                      <EmailIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email Address
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {invitation.client}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                      <CalendarIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Invitation Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Set Your Password
                  </Typography>

                  {/* Password Field */}
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!errors.password}
                    helperText={errors.password}
                    disabled={isSubmitting || isAcceptingInvitation}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={isSubmitting || isAcceptingInvitation}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" color="text.secondary">
                          Password Strength
                        </Typography>
                        <Chip 
                          label={strengthLabel}
                          size="small"
                          color={strengthColor as 'error' | 'warning' | 'success'}
                          variant="outlined"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(passwordStrength / 5) * 100}
                        color={strengthColor as 'error' | 'warning' | 'success'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}

                  {/* Confirm Password Field */}
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={handleInputChange('confirm_password')}
                    error={!!errors.confirm_password}
                    helperText={errors.confirm_password}
                    disabled={isSubmitting || isAcceptingInvitation}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            disabled={isSubmitting || isAcceptingInvitation}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isSubmitting || isAcceptingInvitation}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    }}
                  >
                    {isSubmitting || isAcceptingInvitation ? (
                      <Box display="flex" alignItems="center" gap={2}>
                        <CircularProgress size={20} color="inherit" />
                        Activating Account...
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={2}>
                        <CheckCircleIcon />
                        Activate Account
                      </Box>
                    )}
                  </Button>

                  {/* Help Text */}
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Welcome to LifePlace Alfonso!</strong> After activating your account, 
                      you'll be able to book events, manage your reservations, and communicate with our team.
                    </Typography>
                  </Alert>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box textAlign="center" sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Need help? Contact us at{' '}
            <Typography component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>
              support@lifeplace.com
            </Typography>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AcceptInvitation;