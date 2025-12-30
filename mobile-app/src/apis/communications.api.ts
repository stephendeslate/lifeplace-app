/**
 * Communications API
 *
 * API endpoints for communication records (emails, messages sent to client).
 * Matches the backend API at /api/communications/records/
 */

import { api } from '@/utils/api';
import type { RecentMessage } from '@/types/dashboard.types';

// =============================================================================
// TYPES
// =============================================================================

export interface CommunicationRecord {
  id: number;
  template_name: string;
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  category: string;
  subject: string | null;
  body: string;
  recipient: string;
  delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  is_opened: boolean;
  opened_at: string | null;
  created_at: string;
  event?: {
    id: number;
    title: string;
  } | null;
}

export interface CommunicationRecordsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CommunicationRecord[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get communication records for the current user
 * Clients automatically see only their own records
 */
export const getCommunicationRecords = async (params?: {
  channel?: 'EMAIL' | 'SMS' | 'IN_APP';
  category?: string;
  status?: string;
  event_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<CommunicationRecordsResponse> => {
  const response = await api.get('/communications/records/', { params });
  return response.data;
};

/**
 * Get unread count for the current user
 */
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await api.get('/communications/records/unread_count/');
  return response.data;
};

/**
 * Get recent messages for dashboard
 * Returns most recent communication records formatted for dashboard display
 */
export const getRecentMessages = async (limit: number = 5): Promise<RecentMessage[]> => {
  const response = await api.get('/communications/records/', {
    params: { limit, ordering: '-created_at' },
  });

  // Transform to dashboard format
  return response.data.results.map((record: CommunicationRecord) => ({
    id: String(record.id),
    channel: record.channel,
    subject: record.subject || undefined,
    preview: record.body?.substring(0, 100) || undefined,
    created_at: record.created_at,
    is_opened: record.is_opened,
  }));
};

/**
 * Mark a communication as read
 */
export const markAsRead = async (
  recordId: number
): Promise<{ message: string; opened_at: string }> => {
  const response = await api.post(`/communications/records/${recordId}/mark_as_read/`);
  return response.data;
};

/**
 * Mark a communication as unread
 */
export const markAsUnread = async (recordId: number): Promise<{ message: string }> => {
  const response = await api.post(`/communications/records/${recordId}/mark_as_unread/`);
  return response.data;
};

/**
 * Mark all communications as read
 */
export const markAllAsRead = async (params?: {
  channel?: 'EMAIL' | 'SMS' | 'IN_APP';
  category?: string;
}): Promise<{ message: string; count: number; opened_at: string }> => {
  const response = await api.post('/communications/records/mark_all_as_read/', params || {});
  return response.data;
};

// =============================================================================
// COMMUNICATIONS API OBJECT
// =============================================================================

export const communicationsApi = {
  getCommunicationRecords,
  getUnreadCount,
  getRecentMessages,
  markAsRead,
  markAsUnread,
  markAllAsRead,
};

export default communicationsApi;
