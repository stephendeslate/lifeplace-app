// Business logic hook for EnhancedContactInfoStep

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccessibility } from '@/components/accessibility';
import { useContactInfo } from '@/hooks/booking/useContactInfo';
import { useAuth } from '@/contexts/AuthContext';
import { validatePhoneNumber as validatePhoneLib } from '@shared/utils/phoneValidation';
import type { ContactInfoStepData, ContactInfoStepConfiguration } from '@/types/booking';
import type { ValidationState } from './types';

// Email validation utility
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation — delegates to shared library (PH default, international supported)
const validatePhoneNumber = (phone: string): boolean => {
  return validatePhoneLib(phone);
};

interface UseEnhancedContactInfoStepLogicParams {
  stepData?: ContactInfoStepData;
  config?: ContactInfoStepConfiguration;
  onDataChange: (data: ContactInfoStepData) => void;
}

export function useEnhancedContactInfoStepLogic({
  stepData,
  config,
  onDataChange,
}: UseEnhancedContactInfoStepLogicParams) {
  const { announceToScreenReader } = useAccessibility();

  const { getInitialData, fieldRequirements, accountCreationOptions, isAuthenticated, user } =
    useContactInfo(config);

  // Form data state
  const [formData, setFormData] = useState<ContactInfoStepData>(() => {
    if (stepData) return stepData;
    if (isAuthenticated && user) {
      return {
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: user.profile?.phone || '',
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

  // Sync autofilled data to parent on mount
  useEffect(() => {
    // Only sync if we have autofilled data from authenticated user
    if (isAuthenticated && user && !stepData) {
      onDataChange(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on mount to autofill authenticated user data
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);

  // Get fresh auth state for sign-in success handling
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth();

  // Ref to track if sign-in just occurred (to trigger form update)
  const justSignedInRef = useRef(false);

  // Update form data with real-time validation
  const updateFormData = useCallback(
    (field: keyof ContactInfoStepData, value: unknown) => {
      const newData = { ...formData, [field]: value };
      setFormData(newData);
      onDataChange(newData);

      // Real-time validation for specific fields
      if (field === 'email') {
        setValidationState((prev) => ({ ...prev, email: 'validating' }));
        setTimeout(() => {
          const isValid = validateEmail(value as string);
          setValidationState((prev) => ({
            ...prev,
            email: isValid ? 'valid' : 'invalid',
          }));
          if (isValid) {
            announceToScreenReader('Email address is valid');
          }
        }, 500);
      }

      if (field === 'phone') {
        setValidationState((prev) => ({ ...prev, phone: 'validating' }));

        setTimeout(() => {
          const isValid = validatePhoneNumber(value as string);
          setValidationState((prev) => ({
            ...prev,
            phone: isValid ? 'valid' : 'invalid',
          }));
          if (isValid) {
            announceToScreenReader('Phone number is valid');
          }
        }, 500);
      }

      if (field === 'full_name') {
        setValidationState((prev) => ({ ...prev, full_name: 'validating' }));
        setTimeout(() => {
          const hasFullName =
            value && (value as string).trim().length > 0 && (value as string).includes(' ');
          setValidationState((prev) => ({
            ...prev,
            full_name: hasFullName ? 'valid' : 'invalid',
          }));
        }, 300);
      }
    },
    [formData, onDataChange, announceToScreenReader],
  );

  // Handle successful sign-in - set flag to trigger form update
  const handleSignInSuccess = useCallback(() => {
    justSignedInRef.current = true;
  }, []);

  // Effect to handle auth state changes after sign-in
  useEffect(() => {
    // Only auto-fill if user just signed in via the dialog
    if (justSignedInRef.current && authIsAuthenticated && authUser) {
      // Reset the flag
      justSignedInRef.current = false;

      // Update form with user data
      const newData: ContactInfoStepData = {
        full_name: `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim(),
        email: authUser.email || '',
        phone: authUser.profile?.phone || formData.phone || '',
        address: formData.address || '',
        company: formData.company || '',
        create_account: false,
      };
      setFormData(newData);
      onDataChange(newData);

      // Update validation states for auto-filled fields
      if (newData.email) {
        setValidationState((prev) => ({ ...prev, email: 'valid' }));
      }
      if (newData.full_name && newData.full_name.includes(' ')) {
        setValidationState((prev) => ({ ...prev, full_name: 'valid' }));
      }
      if (newData.phone && validatePhoneNumber(newData.phone)) {
        setValidationState((prev) => ({ ...prev, phone: 'valid' }));
      }

      // Announce to screen reader
      announceToScreenReader('Your contact information has been filled in from your account');
    }
  }, [
    authIsAuthenticated,
    authUser,
    formData.phone,
    formData.address,
    formData.company,
    onDataChange,
    announceToScreenReader,
  ]);

  return {
    formData,
    validationState,
    showPassword,
    setShowPassword,
    signInDialogOpen,
    setSignInDialogOpen,
    isAuthenticated,
    authIsAuthenticated,
    user,
    fieldRequirements,
    accountCreationOptions,
    updateFormData,
    handleSignInSuccess,
  };
}
