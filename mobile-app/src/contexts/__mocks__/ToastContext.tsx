/**
 * Mock ToastContext for Testing
 *
 * This mock provides a simple implementation without React Native Reanimated.
 */

import React, { createContext, useContext, type ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

// =============================================================================
// MOCK FUNCTIONS
// =============================================================================

export const mockShowToast = jest.fn();
export const mockHideToast = jest.fn();

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const value: ToastContextValue = {
    showToast: mockShowToast,
    hideToast: mockHideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Reset all mock functions between tests
 */
export function resetToastMocks() {
  mockShowToast.mockClear();
  mockHideToast.mockClear();
}
