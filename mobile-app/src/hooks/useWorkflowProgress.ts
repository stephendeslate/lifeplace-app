/**
 * useWorkflowProgress Hook
 *
 * React Query hook for fetching event workflow progress.
 */

import { useQuery } from '@tanstack/react-query';
import { workflowsApi, type WorkflowProgress } from '@/apis/workflows.api';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const workflowKeys = {
  all: ['workflow-progress'] as const,
  event: (eventId: number) => [...workflowKeys.all, eventId] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch workflow progress for a specific event
 */
export function useWorkflowProgress(eventId: number) {
  return useQuery<WorkflowProgress>({
    queryKey: workflowKeys.event(eventId),
    queryFn: () => workflowsApi.getEventProgress(eventId),
    enabled: eventId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if workflow not found
  });
}

export default useWorkflowProgress;
