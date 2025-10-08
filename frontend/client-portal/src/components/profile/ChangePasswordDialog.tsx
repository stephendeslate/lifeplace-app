// frontend/client-portal/src/components/profile/ChangePasswordDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  LinearProgress,
  Alert,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

interface PasswordVisibility {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const theme = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<PasswordVisibility>({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setShowPasswords({ current: false, new: false, confirm: false });
    }
  }, [open]);

  const togglePasswordVisibility = (field: keyof PasswordVisibility) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) {
      return { score: 0, label: '', color: 'error' };
    }

    let score = 0;

    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;

    // Complexity checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;

    if (score < 40) {
      return { score, label: 'Weak', color: 'error' };
    } else if (score < 60) {
      return { score, label: 'Fair', color: 'warning' };
    } else if (score < 80) {
      return { score, label: 'Good', color: 'info' };
    } else {
      return { score, label: 'Strong', color: 'success' };
    }
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!currentPassword) {
      newErrors.current = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.new = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.new = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 40) {
      newErrors.new = 'Password is too weak';
    }

    if (!confirmPassword) {
      newErrors.confirm = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.new = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      // Form will be reset when dialog closes
    } catch (_error) {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.1)}`,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <SecurityIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Change Password
              </Typography>
            </Box>
            <IconButton
              onClick={handleClose}
              disabled={isLoading}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.1),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ backgroundColor: alpha(theme.palette.info.main, 0.1) }}>
              Your password must be at least 8 characters long and contain a mix of uppercase, lowercase, numbers, and special characters.
            </Alert>

            {/* Current Password */}
            <TextField
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={!!errors.current}
              helperText={errors.current}
              disabled={isLoading}
              fullWidth
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                },
              }}
            />

            {/* New Password */}
            <Box>
              <TextField
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={!!errors.new}
                helperText={errors.new}
                disabled={isLoading}
                fullWidth
                required
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('new')}
                        edge="end"
                        disabled={isLoading}
                      >
                        {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: alpha('#fff', 0.05),
                    backdropFilter: 'blur(10px)',
                  },
                }}
              />

              {/* Password Strength Indicator */}
              {newPassword && (
                <Box sx={{ mt: 1.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Password Strength
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette[passwordStrength.color].main,
                      }}
                    >
                      {passwordStrength.label}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.score}
                    color={passwordStrength.color}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: alpha('#fff', 0.1),
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Confirm Password */}
            <TextField
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!errors.confirm}
              helperText={errors.confirm}
              disabled={isLoading}
              fullWidth
              required
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                },
              }}
            />

            {/* Password Match Indicator */}
            {confirmPassword && (
              <Box display="flex" alignItems="center" gap={1}>
                {newPassword === confirmPassword ? (
                  <>
                    <CheckCircleIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main">
                      Passwords match
                    </Typography>
                  </>
                ) : (
                  <>
                    <CancelIcon fontSize="small" color="error" />
                    <Typography variant="caption" color="error.main">
                      Passwords do not match
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="outlined"
            sx={{
              backgroundColor: alpha('#fff', 0.05),
              border: `1px solid ${alpha('#fff', 0.2)}`,
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={<SecurityIcon />}
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
