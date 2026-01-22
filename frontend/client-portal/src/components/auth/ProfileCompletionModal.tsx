// frontend/client-portal/src/components/auth/ProfileCompletionModal.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  InputAdornment,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { Phone, Business, CheckCircle } from '@mui/icons-material';
import { authApi } from '../../apis/auth.api';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { ErrorHandler } from '../../utils/errorHandler';

interface ProfileCompletionModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

/**
 * Modal that appears after Google signup to collect additional profile information
 * that Google OAuth doesn't provide (phone number, company).
 */
export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  open,
  onClose,
  userEmail,
}) => {
  const theme = useTheme();
  const { updateUser } = useAuth();
  const { showSuccess, showError } = useToastActions();

  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePhone = (phoneNumber: string): boolean => {
    if (!phoneNumber.trim()) return true; // Optional field

    // Basic phone validation - adjust regex based on your requirements
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }));
      return false;
    }

    if (phoneNumber.replace(/\D/g, '').length < 10) {
      setErrors(prev => ({ ...prev, phone: 'Phone number must be at least 10 digits' }));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile with the collected information
      const updatedUser = await authApi.updateProfile({
        profile: {
          ...(phone && { phone: phone.trim() }),
          ...(company && { company: company.trim() }),
        },
      });

      // Update local user state
      updateUser(updatedUser);

      showSuccess(
        'Profile Updated',
        'Your profile has been completed successfully!'
      );
      onClose();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error('Profile completion error:', error);
      }
      const message = ErrorHandler.extractMessage(error);
      showError('Profile Update Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.95)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.2)}`,
        },
      }}
    >
      <DialogTitle>
        <Stack spacing={1} alignItems="center" textAlign="center">
          <CheckCircle sx={{ fontSize: 48, color: '#fff' }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff' }}>
            Welcome to LifePlace!
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.9) }}>
            Complete your profile to get started
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), textAlign: 'center' }}>
            You've successfully signed up with <strong>{userEmail}</strong>.
            Add a few more details to complete your profile.
          </Typography>

          <TextField
            fullWidth
            label="Phone Number"
            value={phone}
            onChange={handlePhoneChange}
            error={!!errors.phone}
            helperText={errors.phone || 'We\'ll use this to contact you about your bookings'}
            disabled={isSubmitting}
            placeholder="+63 123 456 7890"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& fieldset': {
                  borderColor: alpha('#fff', 0.3),
                },
                '&:hover fieldset': {
                  borderColor: alpha('#fff', 0.5),
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#fff',
                },
              },
              '& .MuiInputLabel-root': {
                color: alpha('#fff', 0.8),
                '&.Mui-focused': {
                  color: '#fff',
                },
              },
              '& .MuiFormHelperText-root': {
                color: alpha('#fff', 0.7),
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone sx={{ color: errors.phone ? theme.palette.error.light : alpha('#fff', 0.7) }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Company (Optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={isSubmitting}
            placeholder="Your organization name"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& fieldset': {
                  borderColor: alpha('#fff', 0.3),
                },
                '&:hover fieldset': {
                  borderColor: alpha('#fff', 0.5),
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#fff',
                },
              },
              '& .MuiInputLabel-root': {
                color: alpha('#fff', 0.8),
                '&.Mui-focused': {
                  color: '#fff',
                },
              },
              '& .MuiFormHelperText-root': {
                color: alpha('#fff', 0.7),
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business sx={{ color: alpha('#fff', 0.7) }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleSkip}
          disabled={isSubmitting}
          sx={{
            color: alpha('#fff', 0.8),
            '&:hover': {
              backgroundColor: alpha('#fff', 0.1),
            },
          }}
        >
          Skip for now
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          sx={{
            backgroundColor: '#fff',
            color: theme.palette.primary.main,
            px: 3,
            '&:hover': {
              backgroundColor: alpha('#fff', 0.9),
            },
            '&:disabled': {
              backgroundColor: alpha('#fff', 0.5),
            },
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} sx={{ color: 'inherit' }} />
          ) : (
            'Complete Profile'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileCompletionModal;
