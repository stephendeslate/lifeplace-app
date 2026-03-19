// frontend/client-portal/src/hooks/useActionCenter/useActionCount.ts

import { useActionCenter } from './useActionCenter';

// ==================== LIGHTWEIGHT HOOK FOR BADGE ====================

/**
 * Lightweight hook just for getting action count (for sidebar badge)
 */
export const useActionCount = (): { count: number; isLoading: boolean } => {
  const { counts, isLoading } = useActionCenter();

  return {
    count: counts.total,
    isLoading,
  };
};
