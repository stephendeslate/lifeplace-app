// frontend/client-portal/src/components/booking/useSessionRecoveryDialog.ts
// Hook to manage session recovery dialog state - extracted for fast refresh compatibility

import React from 'react';

export const useSessionRecoveryDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const showDialog = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const hideDialog = React.useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
  }, []);

  const handleRestore = React.useCallback(async (onRestore: () => Promise<void> | void) => {
    setIsLoading(true);
    try {
      await onRestore();
      hideDialog();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to restore session:', error);
      setIsLoading(false);
    }
  }, [hideDialog]);

  const handleDiscard = React.useCallback(async (onDiscard: () => Promise<void> | void) => {
    setIsLoading(true);
    try {
      await onDiscard();
      hideDialog();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to discard session:', error);
      setIsLoading(false);
    }
  }, [hideDialog]);

  return {
    isOpen,
    isLoading,
    showDialog,
    hideDialog,
    handleRestore,
    handleDiscard,
  };
};
