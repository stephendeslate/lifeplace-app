/**
 * Privacy Hooks
 *
 * React Query hooks for privacy and consent management.
 * Reference: Phase 10 Implementation Plan
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import * as PrivacyAPI from '@/apis/privacy.api';
import type {
  ConsentType,
  AccountDeletionRequest,
} from '@/types/privacy.types';
import { useToast } from '@/contexts/ToastContext';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const privacyKeys = {
  all: ['privacy'] as const,
  consents: () => [...privacyKeys.all, 'consents'] as const,
  consentHistory: (params?: { consent_type?: ConsentType }) =>
    [...privacyKeys.all, 'consent-history', params] as const,
  dataAccess: () => [...privacyKeys.all, 'data-access'] as const,
  privacyRequests: () => [...privacyKeys.all, 'requests'] as const,
  sessions: () => [...privacyKeys.all, 'sessions'] as const,
};

// =============================================================================
// CONSENT HOOKS
// =============================================================================

/**
 * Hook to get current consent statuses
 */
export function useConsents() {
  return useQuery({
    queryKey: privacyKeys.consents(),
    queryFn: PrivacyAPI.getConsents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to manage consent toggles
 */
export function useConsentManagement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const grantMutation = useMutation({
    mutationFn: ({ consentType }: { consentType: ConsentType }) =>
      PrivacyAPI.grantConsent(consentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: privacyKeys.consents() });
      showToast('Consent granted', 'success');
    },
    onError: () => {
      showToast('Failed to update consent', 'error');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (consentType: ConsentType) =>
      PrivacyAPI.withdrawConsent(consentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: privacyKeys.consents() });
      showToast('Consent withdrawn', 'success');
    },
    onError: () => {
      showToast('Failed to withdraw consent', 'error');
    },
  });

  const toggleConsent = (consentType: ConsentType, currentlyGranted: boolean) => {
    if (currentlyGranted) {
      withdrawMutation.mutate(consentType);
    } else {
      grantMutation.mutate({ consentType });
    }
  };

  return {
    toggleConsent,
    grantConsent: grantMutation.mutate,
    withdrawConsent: withdrawMutation.mutate,
    isUpdating: grantMutation.isPending || withdrawMutation.isPending,
  };
}

/**
 * Hook to get consent history with pagination
 */
export function useConsentHistory(consentType?: ConsentType) {
  return useInfiniteQuery({
    queryKey: privacyKeys.consentHistory({ consent_type: consentType }),
    queryFn: ({ pageParam = 0 }) =>
      PrivacyAPI.getConsentHistory({
        consent_type: consentType,
        limit: 20,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        const url = new URL(lastPage.next);
        return parseInt(url.searchParams.get('offset') || '0');
      }
      return undefined;
    },
    initialPageParam: 0,
  });
}

// =============================================================================
// DATA SUBJECT RIGHTS HOOKS
// =============================================================================

/**
 * Hook for data access (Right to Access)
 */
export function useDataAccess() {
  return useQuery({
    queryKey: privacyKeys.dataAccess(),
    queryFn: PrivacyAPI.getDataAccess,
    staleTime: 0, // Always fresh for data access requests
    enabled: false, // Only fetch on demand
  });
}

/**
 * Hook for data export (Right to Portability)
 */
export function useDataExport() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (format: 'json' | 'csv' = 'json') =>
      PrivacyAPI.exportData(format),
    onSuccess: () => {
      showToast('Data export ready for download', 'success');
    },
    onError: () => {
      showToast('Failed to export data', 'error');
    },
  });
}

/**
 * Hook to request async data export
 */
export function useRequestDataExport() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (format: 'json' | 'csv' = 'json') =>
      PrivacyAPI.requestDataExport(format),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: privacyKeys.privacyRequests() });
      showToast(data.message || 'Export request submitted', 'success');
    },
    onError: () => {
      showToast('Failed to request data export', 'error');
    },
  });
}

/**
 * Hook for account deletion (Right to Erasure)
 */
export function useAccountDeletion() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: AccountDeletionRequest) => PrivacyAPI.deleteAccount(data),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message || 'Failed to delete account';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook for privacy request history
 */
export function usePrivacyRequests() {
  return useQuery({
    queryKey: privacyKeys.privacyRequests(),
    queryFn: PrivacyAPI.getPrivacyRequests,
    staleTime: 60 * 1000, // 1 minute
  });
}

// =============================================================================
// SESSION HOOKS
// =============================================================================

/**
 * Hook for active sessions
 */
export function useSessions() {
  return useQuery({
    queryKey: privacyKeys.sessions(),
    queryFn: PrivacyAPI.getSessions,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for session management
 */
export function useSessionManagement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const revokeMutation = useMutation({
    mutationFn: PrivacyAPI.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: privacyKeys.sessions() });
      showToast('Session revoked', 'success');
    },
    onError: () => {
      showToast('Failed to revoke session', 'error');
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: PrivacyAPI.revokeAllSessions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: privacyKeys.sessions() });
      showToast(`Revoked ${data.revoked_count} sessions`, 'success');
    },
    onError: () => {
      showToast('Failed to revoke sessions', 'error');
    },
  });

  return {
    revokeSession: revokeMutation.mutate,
    revokeAllSessions: revokeAllMutation.mutate,
    isRevoking: revokeMutation.isPending,
    isRevokingAll: revokeAllMutation.isPending,
  };
}

// =============================================================================
// NOTE: Profile hooks (useUpdateProfile, useChangePassword) are in useAuth.ts
// =============================================================================
