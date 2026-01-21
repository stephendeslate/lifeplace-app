// frontend/admin-crm/src/hooks/usePasswordVisibility.ts
// Centralized password visibility toggle hook for auth forms

import { useState, useCallback } from 'react';

/**
 * Hook for managing password visibility toggles in auth forms
 * Replaces duplicate useState patterns across auth components
 */
export const usePasswordVisibility = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const resetVisibility = useCallback(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  return {
    showPassword,
    showConfirmPassword,
    togglePassword,
    toggleConfirmPassword,
    resetVisibility,
  };
};

/**
 * Simple single password visibility hook
 * For forms with only one password field
 */
export const useSinglePasswordVisibility = () => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const resetVisibility = useCallback(() => {
    setShowPassword(false);
  }, []);

  return {
    showPassword,
    togglePassword,
    resetVisibility,
  };
};
