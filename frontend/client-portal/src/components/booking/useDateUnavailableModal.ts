// frontend/client-portal/src/components/booking/useDateUnavailableModal.ts
// Hook to manage DateUnavailableModal state - extracted for fast refresh compatibility

import React from 'react';

export const useDateUnavailableModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [unavailableDate, setUnavailableDate] = React.useState<string | null>(null);

  const showModal = React.useCallback((date: string) => {
    setUnavailableDate(date);
    setIsOpen(true);
  }, []);

  const hideModal = React.useCallback(() => {
    setIsOpen(false);
    // Don't clear the date immediately to allow for animation
    setTimeout(() => setUnavailableDate(null), 300);
  }, []);

  return {
    isOpen,
    unavailableDate,
    showModal,
    hideModal,
  };
};
