// frontend/client-portal/src/hooks/useUnfinishedBookings.ts

import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export interface UnfinishedBookingSession {
  id: number;
  session_id: string;
  booking_flow: {
    id: number;
    name: string;
    event_type?: {
      id: number;
      name: string;
    };
  };
  current_step: {
    id: number;
    name: string;
    step_type: string;
  } | null;
  progress_percentage: number;
  booking_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Hook to fetch unfinished booking sessions for the logged-in user
 * Uses the authenticated endpoint: GET /bookingflow/sessions/?is_completed=false&is_abandoned=false
 */
export const useUnfinishedBookings = () => {
  const { user } = useAuth();

  return useQuery<UnfinishedBookingSession[]>({
    queryKey: ['unfinished-bookings', user?.id],
    queryFn: async () => {
      const response = await api.get<UnfinishedBookingSession[]>('/bookingflow/sessions/', {
        params: {
          is_completed: 'false',
          is_abandoned: 'false',
        },
      });
      return response.data;
    },
    enabled: !!user, // Only fetch for logged-in users
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

export default useUnfinishedBookings;
