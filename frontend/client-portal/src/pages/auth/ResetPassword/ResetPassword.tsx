import React from 'react';
import { useResetPasswordLogic } from './useResetPasswordLogic';
import ValidatingState from './ValidatingState';
import InvalidTokenState from './InvalidTokenState';
import SuccessState from './SuccessState';
import ResetPasswordForm from './ResetPasswordForm';

interface ResetPasswordProps {
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigateToLogin, onNavigateToHome }) => {
  const {
    isValidating,
    isTokenValid,
    isSuccess,
    email,
    tokenError,
    password,
    confirmPassword,
    errors,
    showPassword,
    showConfirmPassword,
    isSubmitting,
    setShowPassword,
    setShowConfirmPassword,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleSubmit,
    handleBackToLogin,
    handleBackToHome,
    handleRequestNewLink,
  } = useResetPasswordLogic({ onNavigateToLogin, onNavigateToHome });

  if (isValidating) {
    return <ValidatingState />;
  }

  if (!isTokenValid) {
    return (
      <InvalidTokenState
        tokenError={tokenError}
        onBackToHome={handleBackToHome}
        onBackToLogin={handleBackToLogin}
        onRequestNewLink={handleRequestNewLink}
      />
    );
  }

  if (isSuccess) {
    return <SuccessState />;
  }

  return (
    <ResetPasswordForm
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      errors={errors}
      showPassword={showPassword}
      showConfirmPassword={showConfirmPassword}
      isSubmitting={isSubmitting}
      onPasswordChange={handlePasswordChange}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      onSubmit={handleSubmit}
      onToggleShowPassword={() => setShowPassword(!showPassword)}
      onToggleShowConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
      onBackToHome={handleBackToHome}
    />
  );
};

export default ResetPassword;
