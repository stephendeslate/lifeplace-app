// frontend/client-portal/src/hooks/useChangePassword.ts

import { useMutation } from '@tanstack/react-query';
import { authApi } from '../apis/auth.api';
import { useToastActions } from '../contexts/ToastContext';

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export const useChangePassword = () => {
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: ChangePasswordData) => authApi.changePassword(data),
    onSuccess: (response) => {
      showSuccess(
        'Password Changed',
        response.detail || 'Your password has been updated successfully.',
      );
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: {
          data?: {
            detail?: string;
            current_password?: string[];
            new_password?: string[];
            confirm_password?: string[];
          };
        };
      };
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.current_password?.[0] ||
        err?.response?.data?.new_password?.[0] ||
        err?.response?.data?.confirm_password?.[0] ||
        'Failed to change password. Please try again.';

      showError('Password Change Failed', errorMessage);
    },
  });
};
