// frontend/admin-crm/src/pages/auth/AcceptInvitation.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  AdminPanelSettings,
  Lock,
  Person,
  Email,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { authApi } from '../../apis/auth.api';
import { storage } from '../../utils/storage';

interface InvitationData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  invited_by: string;
  expires_at: string;
  is_accepted: boolean;
}

interface AcceptInvitationFormData {
  password: string;
  confirm_password: string;
}

export const AcceptInvitation: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToastActions();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<AcceptInvitationFormData>({
    password: '',
    confirm_password: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<AcceptInvitationFormData>>({});
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!invitationId) {
        setError('Invalid invitation link');
        setIsLoading(false);
        return;
      }

      try {
        const invitationData = await authApi.getInvitation(invitationId);

        // Check if invitation is already accepted
        if (invitationData.is_accepted) {
          setError('This invitation has already been accepted');
          setIsLoading(false);
          return;
        }

        // Check if invitation is expired
        const isExpired = new Date(invitationData.expires_at) < new Date();
        if (isExpired) {
          setError('This invitation has expired');
          setIsLoading(false);
          return;
        }

        setInvitation(invitationData);
      } catch (error: unknown) {
        console.error('Error fetching invitation:', error);
        const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Invalid or expired invitation link';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [invitationId]);

  const validateForm = (): boolean => {
    const errors: Partial<AcceptInvitationFormData> = {};

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !invitationId) return;

    setIsSubmitting(true);

    try {
      const response = await authApi.acceptInvitation(invitationId, {
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      // Store tokens and user data
      if (response.tokens && response.user) {
        storage.setTokens(response.tokens);
        storage.setUser(response.user);
      }

      showSuccess(
        'Account Created Successfully!',
        'You have been logged in and can now access the admin dashboard.'
      );

      // Redirect to dashboard and reload to trigger auth context update
      navigate('/dashboard', { replace: true });
      window.location.reload();

    } catch (error: unknown) {
      console.error('Error accepting invitation:', error);
      const apiError = error as { response?: { data?: { detail?: string; password?: string[]; non_field_errors?: string[] } } };
      const message = apiError.response?.data?.detail || 
                     apiError.response?.data?.password?.[0] ||
                     apiError.response?.data?.non_field_errors?.[0] ||
                     'Failed to accept invitation';
      showError('Account Creation Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof AcceptInvitationFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading invitation details...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          px: 2,
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Invalid Invitation
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
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
        backgroundColor: 'grey.50',
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <AdminPanelSettings 
              color="primary" 
              sx={{ fontSize: 48, mb: 2 }} 
            />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Welcome to LifePlace Admin
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete your account setup to get started
            </Typography>
          </Box>

          {/* Invitation Details */}
          {invitation && (
            <Box sx={{ mb: 4 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  You've been invited by <strong>{invitation.invited_by}</strong> to join as an administrator.
                </Typography>
              </Alert>

              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Person color="action" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body2">
                      {invitation.first_name} {invitation.last_name}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Email color="action" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2">
                      {invitation.email}
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              <Divider sx={{ my: 3 }} />
            </Box>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Set Your Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a secure password for your admin account
            </Typography>

            <Stack spacing={3}>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password || 'Must be at least 8 characters'}
                fullWidth
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                error={!!formErrors.confirm_password}
                helperText={formErrors.confirm_password}
                fullWidth
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircle />}
                sx={{ py: 1.5, mt: 2 }}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account & Continue'}
              </Button>
            </Stack>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              By creating an account, you agree to our terms of service and privacy policy.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};