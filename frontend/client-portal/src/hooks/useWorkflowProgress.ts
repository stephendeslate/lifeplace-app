// frontend/client-portal/src/hooks/useWorkflowProgress.ts

import { useQuery } from '@tanstack/react-query';
import { workflowsApi, WorkflowProgress } from '../apis/workflows.api';

export const useWorkflowProgress = (eventId: number) => {
  return useQuery<WorkflowProgress>({
    queryKey: ['workflow-progress', eventId],
    queryFn: () => workflowsApi.getEventProgress(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if workflow not found
  });
};
