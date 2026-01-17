/**
 * Booking Storage
 * Session persistence via expo-secure-store
 */

import * as SecureStore from 'expo-secure-store';
import type { StoredSession, SessionRecoveryInfo, BookingData, BookingFlow } from '@/types/booking';
import { isSessionExpired } from './bookingHelpers';
import { logger } from './logger';

const storageLogger = logger.create('BookingStorage');

// Cache for flow data to avoid repeated API calls during recovery lookup
let flowCache: Record<number, BookingFlow> = {};

/**
 * Set flow data in cache (called when flows are loaded)
 */
export function cacheFlowData(flows: BookingFlow[]): void {
  for (const flow of flows) {
    flowCache[flow.id] = flow;
  }
}

/**
 * Clear flow cache (called on logout or app reset)
 */
export function clearFlowCache(): void {
  flowCache = {};
}

/**
 * Get step name from flow and step ID
 */
function getStepName(flowId: number, stepId?: number): string {
  if (!stepId) return '';

  const flow = flowCache[flowId];
  if (!flow?.steps) return '';

  const step = flow.steps.find(s => s.id === stepId);
  return step?.title || step?.step_type_display || step?.step_type || '';
}

/**
 * Get flow name from flow ID
 */
function getFlowName(flowId: number): string {
  const flow = flowCache[flowId];
  return flow?.name || '';
}

// Storage keys
const SESSION_KEY_PREFIX = 'booking_session_';
const SESSION_INDEX_KEY = 'booking_session_index';
const MAX_STORED_SESSIONS = 5;

/**
 * Generate storage key for a session
 */
function getSessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/**
 * Get list of stored session IDs
 */
export async function getStoredSessionIds(): Promise<string[]> {
  try {
    const indexData = await SecureStore.getItemAsync(SESSION_INDEX_KEY);
    if (!indexData) return [];
    return JSON.parse(indexData) as string[];
  } catch (error) {
    storageLogger.warn('Failed to get session index:', error);
    return [];
  }
}

/**
 * Update the session index
 */
async function updateSessionIndex(sessionIds: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_INDEX_KEY, JSON.stringify(sessionIds));
  } catch (error) {
    storageLogger.warn('Failed to update session index:', error);
  }
}

/**
 * Add session ID to index
 */
async function addToSessionIndex(sessionId: string): Promise<void> {
  const ids = await getStoredSessionIds();

  // Remove if already exists (to move to front)
  const filtered = ids.filter(id => id !== sessionId);

  // Add to front
  filtered.unshift(sessionId);

  // Keep only MAX_STORED_SESSIONS
  const trimmed = filtered.slice(0, MAX_STORED_SESSIONS);

  // Remove old sessions that were trimmed
  for (const id of filtered.slice(MAX_STORED_SESSIONS)) {
    await clearBookingSession(id);
  }

  await updateSessionIndex(trimmed);
}

/**
 * Remove session ID from index
 */
async function removeFromSessionIndex(sessionId: string): Promise<void> {
  const ids = await getStoredSessionIds();
  const filtered = ids.filter(id => id !== sessionId);
  await updateSessionIndex(filtered);
}

/**
 * Save booking session to secure storage
 */
export async function saveBookingSession(
  sessionId: string,
  data: Partial<StoredSession>
): Promise<void> {
  try {
    const key = getSessionKey(sessionId);

    // Load existing data to merge
    const existing = await loadBookingSession(sessionId);

    const session: StoredSession = {
      session_id: sessionId,
      booking_flow_id: data.booking_flow_id ?? existing?.booking_flow_id ?? 0,
      booking_data: {
        ...(existing?.booking_data || {}),
        ...(data.booking_data || {}),
      } as BookingData,
      current_step_id: data.current_step_id ?? existing?.current_step_id,
      completed_steps: data.completed_steps ?? existing?.completed_steps ?? [],
      total_price: data.total_price ?? existing?.total_price,
      expires_at: data.expires_at ?? existing?.expires_at ?? '',
      last_synced_at: new Date().toISOString(),
      pending_sync: data.pending_sync ?? false,
    };

    await SecureStore.setItemAsync(key, JSON.stringify(session));
    await addToSessionIndex(sessionId);
  } catch (error) {
    storageLogger.warn('Failed to save booking session:', error);
    throw error;
  }
}

/**
 * Load booking session from secure storage
 */
export async function loadBookingSession(
  sessionId: string
): Promise<StoredSession | null> {
  try {
    const key = getSessionKey(sessionId);
    const data = await SecureStore.getItemAsync(key);

    if (!data) return null;

    const session = JSON.parse(data) as StoredSession;

    // Check if expired
    if (isSessionExpired(session.expires_at)) {
      // Clean up expired session
      await clearBookingSession(sessionId);
      return null;
    }

    return session;
  } catch (error) {
    storageLogger.warn('Failed to load booking session:', error);
    return null;
  }
}

/**
 * Clear a specific booking session
 */
export async function clearBookingSession(sessionId: string): Promise<void> {
  try {
    const key = getSessionKey(sessionId);
    await SecureStore.deleteItemAsync(key);
    await removeFromSessionIndex(sessionId);
  } catch (error) {
    storageLogger.warn('Failed to clear booking session:', error);
  }
}

/**
 * Clear all booking sessions
 */
export async function clearAllBookingSessions(): Promise<void> {
  try {
    const ids = await getStoredSessionIds();

    for (const id of ids) {
      const key = getSessionKey(id);
      await SecureStore.deleteItemAsync(key);
    }

    await SecureStore.deleteItemAsync(SESSION_INDEX_KEY);
  } catch (error) {
    storageLogger.warn('Failed to clear all booking sessions:', error);
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const ids = await getStoredSessionIds();
    let cleanedCount = 0;

    for (const id of ids) {
      const session = await loadBookingSession(id);
      // loadBookingSession already handles cleanup of expired sessions
      if (!session) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    storageLogger.warn('Failed to cleanup expired sessions:', error);
    return 0;
  }
}

/**
 * Get the most recent recoverable session
 */
export async function getRecoverableSession(): Promise<SessionRecoveryInfo | null> {
  try {
    const ids = await getStoredSessionIds();

    for (const id of ids) {
      const session = await loadBookingSession(id);

      if (session && !isSessionExpired(session.expires_at)) {
        // Found a valid session - look up flow and step names from cache
        const flowName = getFlowName(session.booking_flow_id);
        const stepName = getStepName(session.booking_flow_id, session.current_step_id);

        return {
          session_id: session.session_id,
          booking_flow_id: session.booking_flow_id,
          booking_flow_name: flowName,
          event_type_name: session.booking_data.event_type_name || '',
          current_step_name: stepName,
          progress_percentage: calculateProgressPercentage(session),
          last_updated: session.last_synced_at,
          expires_at: session.expires_at,
          total_price: session.total_price,
        };
      }
    }

    return null;
  } catch (error) {
    storageLogger.warn('Failed to get recoverable session:', error);
    return null;
  }
}

/**
 * Calculate progress percentage from stored session
 */
function calculateProgressPercentage(session: StoredSession): number {
  // Simple calculation based on completed steps
  // In reality, would need to know total steps from the flow
  const completedCount = session.completed_steps.length;

  // Assume 10 steps average
  const estimatedTotal = 10;

  return Math.min(Math.round((completedCount / estimatedTotal) * 100), 99);
}

/**
 * Check if there are any pending syncs
 */
export async function hasPendingSync(): Promise<boolean> {
  try {
    const ids = await getStoredSessionIds();

    for (const id of ids) {
      const key = getSessionKey(id);
      const data = await SecureStore.getItemAsync(key);

      if (data) {
        const session = JSON.parse(data) as StoredSession;
        if (session.pending_sync) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    storageLogger.warn('Failed to check pending sync:', error);
    return false;
  }
}

/**
 * Mark session as synced
 */
export async function markSessionSynced(sessionId: string): Promise<void> {
  try {
    const session = await loadBookingSession(sessionId);

    if (session) {
      await saveBookingSession(sessionId, {
        ...session,
        pending_sync: false,
        last_synced_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    storageLogger.warn('Failed to mark session synced:', error);
  }
}

/**
 * Get sessions pending sync
 */
export async function getPendingSyncSessions(): Promise<StoredSession[]> {
  try {
    const ids = await getStoredSessionIds();
    const pending: StoredSession[] = [];

    for (const id of ids) {
      const session = await loadBookingSession(id);
      if (session?.pending_sync) {
        pending.push(session);
      }
    }

    return pending;
  } catch (error) {
    storageLogger.warn('Failed to get pending sync sessions:', error);
    return [];
  }
}

/**
 * Update step data in stored session
 */
export async function updateStoredStepData(
  sessionId: string,
  stepType: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const session = await loadBookingSession(sessionId);

    if (session) {
      await saveBookingSession(sessionId, {
        ...session,
        booking_data: {
          ...session.booking_data,
          [stepType]: data,
        },
        pending_sync: true,
      });
    }
  } catch (error) {
    storageLogger.warn('Failed to update stored step data:', error);
  }
}
