import React from 'react';
import { Box } from '@mui/material';
import { SignInDialog } from '@/components/common/SignInDialog';
import { useEnhancedContactInfoStepLogic } from './useEnhancedContactInfoStepLogic';
import { ContactInfoHeader } from './ContactInfoHeader';
import { ValidationStatusChips } from './ValidationStatusChips';
import { AuthenticatedUserBanner } from './AuthenticatedUserBanner';
import { PersonalDetailsCard } from './PersonalDetailsCard';
import { ContactDetailsCard } from './ContactDetailsCard';
import { AccountOptionsCard } from './AccountOptionsCard';
import type { EnhancedContactInfoStepProps } from './types';

export const EnhancedContactInfoStep: React.FC<EnhancedContactInfoStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors,
}) => {
  const {
    formData,
    validationState,
    showPassword,
    setShowPassword,
    signInDialogOpen,
    setSignInDialogOpen,
    isAuthenticated,
    user,
    fieldRequirements,
    accountCreationOptions,
    updateFormData,
    handleSignInSuccess,
  } = useEnhancedContactInfoStepLogic({ stepData, config, onDataChange });

  return (
    <Box>
      <ContactInfoHeader />

      <ValidationStatusChips validationState={validationState} />

      {/* Authenticated user welcome banner */}
      {isAuthenticated && user && <AuthenticatedUserBanner firstName={user.first_name || ''} />}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PersonalDetailsCard
          formData={formData}
          validationState={validationState}
          validationErrors={validationErrors}
          fieldRequirements={fieldRequirements}
          onFieldChange={updateFormData}
        />

        <ContactDetailsCard
          formData={formData}
          validationState={validationState}
          validationErrors={validationErrors}
          fieldRequirements={fieldRequirements}
          onFieldChange={updateFormData}
        />

        {/* Account options for unauthenticated users */}
        {!isAuthenticated && (
          <AccountOptionsCard
            formData={formData}
            showPassword={showPassword}
            canCreateAccount={accountCreationOptions.canCreateAccount ?? false}
            onFieldChange={updateFormData}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onOpenSignIn={() => setSignInDialogOpen(true)}
          />
        )}
      </Box>

      <SignInDialog
        open={signInDialogOpen}
        onClose={() => setSignInDialogOpen(false)}
        onSuccess={handleSignInSuccess}
      />
    </Box>
  );
};

export default EnhancedContactInfoStep;
