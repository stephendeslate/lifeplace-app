// frontend/admin-crm/src/contexts/walkthrough/useWalkthrough.ts

import { useContext } from 'react';
import { WalkthroughContext } from './Provider';
import type { WalkthroughContextType } from '../../types/walkthrough.types';

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};
