/**
 * Workflows API
 *
 * API calls for workflow progress matching client-portal patterns.
 */

import api from '@/utils/api';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkflowStageProgress {
  id: number;
  name: string;
  stage: 'LEAD' | 'PRODUCTION' | 'POST_PRODUCTION';
  order: number;
  status: 'completed' | 'current' | 'pending';
}

export interface WorkflowProgress {
  current_stage_id: number | null;
  current_stage_name: string | null;
  current_stage_type: string | null;
  total_stages: number;
  completed_stages: number;
  progress_percentage: number;
  stages: WorkflowStageProgress[];
}

// =============================================================================
// API
// =============================================================================

export const workflowsApi = {
  /**
   * Get workflow progress for a specific event
   */
  getEventProgress: async (eventId: number): Promise<WorkflowProgress> => {
    const response = await api.get<WorkflowProgress>(
      `/workflows/client/workflows/events/${eventId}/progress/`
    );
    return response.data;
  },
};

export default workflowsApi;
