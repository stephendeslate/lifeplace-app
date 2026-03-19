// frontend/admin-crm/src/contexts/walkthrough/types.ts

import type React from 'react';
import type {
  WalkthroughContextType,
  WalkthroughState,
  WalkthroughPreferences,
} from '../../types/walkthrough.types';

export const INITIAL_STATE: WalkthroughState = {
  isActive: false,
  currentTour: null,
  currentStepIndex: 0,
  isPaused: false,
  targetElement: null,
  targetRect: null,
};

export const INITIAL_PREFERENCES: WalkthroughPreferences = {
  autoShowTours: true,
  showWelcomeTour: true,
  completedTours: [],
  dismissedTours: [],
};

export interface WalkthroughProviderProps {
  children: React.ReactNode;
}

// Re-export types consumers may need
export type { WalkthroughContextType, WalkthroughState, WalkthroughPreferences };
