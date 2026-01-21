/**
 * Privacy API
 *
 * All privacy and consent-related API calls for DPA compliance.
 * Reference: CONSENT_MANAGEMENT_UI.md, DATA_SUBJECT_RIGHTS_API.md
 */

import api from '@/utils/api';
import type {
  ConsentsResponse,
  ConsentGrantResponse,
  ConsentWithdrawResponse,
  ConsentType,
  ConsentHistoryResponse,
  DataAccessResponse,
  DataCorrectionRequest,
  DataCorrectionResponse,
  ProcessingObjectionRequest,
  ProcessingObjectionResponse,
  PrivacyRequestsResponse,
  AccountDeletionRequest,
  AccountDeletionResponse,
  SessionsResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from '@/types/privacy.types';
import type { User } from '@/types/auth.types';

// =============================================================================
// CONSENT MANAGEMENT
// =============================================================================

/**
 * Get current consent status for all types
 */
export const getConsents = async (): Promise<ConsentsResponse> => {
  const response = await api.get('/users/me/consents/');
  return response.data;
};

/**
 * Grant consent for a specific type
 */
export const grantConsent = async (
  consentType: ConsentType,
  data?: { consent_text?: string }
): Promise<ConsentGrantResponse> => {
  const response = await api.post(
    `/users/me/consents/${consentType}/grant/`,
    data || {}
  );
  return response.data;
};

/**
 * Withdraw consent for a specific type
 */
export const withdrawConsent = async (
  consentType: ConsentType
): Promise<ConsentWithdrawResponse> => {
  const response = await api.post(`/users/me/consents/${consentType}/withdraw/`);
  return response.data;
};

/**
 * Get consent history (audit trail)
 */
export const getConsentHistory = async (params?: {
  consent_type?: ConsentType;
  limit?: number;
  offset?: number;
}): Promise<ConsentHistoryResponse> => {
  const response = await api.get('/users/me/consents/history/', { params });
  return response.data;
};

// =============================================================================
// DATA SUBJECT RIGHTS
// =============================================================================

/**
 * Right to Access - View all personal data
 */
export const getDataAccess = async (): Promise<DataAccessResponse> => {
  const response = await api.get('/users/me/data/');
  return response.data;
};

/**
 * Right to Portability - Export data as JSON or CSV (direct download)
 */
export const exportData = async (
  format: 'json' | 'csv' = 'json'
): Promise<Blob> => {
  const response = await api.get('/users/me/export/', {
    params: { format },
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Request data export (for large datasets - async processing)
 */
export const requestDataExport = async (
  format: 'json' | 'csv' = 'json'
): Promise<{
  request_id: string;
  message: string;
  estimated_completion: string;
}> => {
  const response = await api.post('/users/me/export/request/', { format });
  return response.data;
};

/**
 * Right to Correction - Correct personal data
 */
export const correctData = async (
  data: DataCorrectionRequest
): Promise<DataCorrectionResponse> => {
  const response = await api.patch('/users/me/correct/', data);
  return response.data;
};

/**
 * Right to Object - Object to processing
 */
export const objectToProcessing = async (
  data: ProcessingObjectionRequest
): Promise<ProcessingObjectionResponse> => {
  const response = await api.post('/users/me/object/', data);
  return response.data;
};

/**
 * Right to Erasure - Delete account
 *
 * Backend endpoint: DELETE /users/me/delete/
 */
export const deleteAccount = async (
  data: AccountDeletionRequest
): Promise<AccountDeletionResponse> => {
  const response = await api.delete('/users/me/delete/', { data });
  return response.data;
};

/**
 * Get privacy request history
 */
export const getPrivacyRequests = async (): Promise<PrivacyRequestsResponse> => {
  const response = await api.get('/users/me/privacy-requests/');
  return response.data;
};

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * Get all active sessions
 */
export const getSessions = async (): Promise<SessionsResponse> => {
  const response = await api.get('/users/sessions/');
  return response.data;
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (
  sessionId: string
): Promise<{ detail: string }> => {
  const response = await api.delete(`/users/sessions/${sessionId}/`);
  return response.data;
};

/**
 * Revoke all sessions except current
 */
export const revokeAllSessions = async (): Promise<{
  detail: string;
  revoked_count: number;
}> => {
  const response = await api.post('/users/logout-all/');
  return response.data;
};

// =============================================================================
// PROFILE MANAGEMENT
// =============================================================================

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileRequest): Promise<User> => {
  const response = await api.patch('/users/me/', data);
  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
  const response = await api.patch('/users/me/change-password/', data);
  return response.data;
};
