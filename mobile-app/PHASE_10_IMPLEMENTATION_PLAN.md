# Phase 10: Profile & Settings - Implementation Plan

> **Phase Status:** Ready for Implementation
> **Dependencies:** Phases 1-9 Complete
> **Reference:** [ROADMAP.md](./ROADMAP.md), [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
> **Compliance:** [CONSENT_MANAGEMENT_UI.md](../docs/compliance/CONSENT_MANAGEMENT_UI.md), [DATA_SUBJECT_RIGHTS_API.md](../docs/compliance/DATA_SUBJECT_RIGHTS_API.md)

---

## Overview

Phase 10 implements the complete Profile & Settings experience for the LifePlace mobile app, including:
- Enhanced Profile Screen with user information and settings navigation
- Edit Profile functionality
- Change Password functionality
- Privacy Dashboard with DPA compliance features (Philippines Data Privacy Act)
- Consent management and history
- Data access, export, and deletion capabilities

### Current State

| Component | Current State | Target State |
|-----------|---------------|--------------|
| Profile Screen | Basic placeholder with menu | Full user info, settings sections |
| Edit Profile | Not implemented | Form with validation |
| Change Password | Not implemented | Password requirements, validation |
| Privacy Dashboard | Not implemented | Full DPA compliance UI |
| Notifications | Already implemented (Phase 9) | Link from profile |

### Backend API Endpoints (Already Available)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/me/` | GET | Get current user profile |
| `/api/users/me/` | PUT/PATCH | Update user profile |
| `/api/users/me/change-password/` | PATCH | Change password |
| `/api/users/me/consents/` | GET | List consent statuses |
| `/api/users/me/consents/{type}/withdraw/` | POST | Withdraw consent |
| `/api/users/me/consents/{type}/grant/` | POST | Grant consent |
| `/api/users/me/data/` | GET | Right to Access (view all data) |
| `/api/users/me/export/` | GET | Right to Portability (download data) |
| `/api/users/me/` | DELETE | Right to Erasure (delete account) |
| `/api/users/me/correct/` | PATCH | Right to Correction |
| `/api/users/me/object/` | POST | Right to Object |
| `/api/users/me/privacy-requests/` | GET | View privacy request history |
| `/api/users/sessions/` | GET | Get active sessions |

---

## Implementation Tasks

### 10.1 Type Definitions

**File:** `src/types/privacy.types.ts`

```typescript
/**
 * Privacy & Consent Types
 *
 * Type definitions for DPA compliance features matching backend models.
 */

// =============================================================================
// CONSENT TYPES
// =============================================================================

/**
 * Consent type codes matching backend ConsentRecord.CONSENT_TYPE_CHOICES
 */
export type ConsentType =
  | 'MARKETING_EMAIL'
  | 'MARKETING_SMS'
  | 'MARKETING_PUSH'
  | 'ANALYTICS'
  | 'THIRD_PARTY_SHARING'
  | 'SENSITIVE_DATA'
  | 'PRIVACY_POLICY'
  | 'TERMS_OF_SERVICE';

/**
 * Consent actions matching backend ConsentRecord.ACTION_CHOICES
 */
export type ConsentAction = 'GRANT' | 'WITHDRAW' | 'UPDATE';

/**
 * Consent sources matching backend ConsentRecord.SOURCE_CHOICES
 */
export type ConsentSource =
  | 'REGISTRATION'
  | 'SETTINGS'
  | 'PRIVACY_DASHBOARD'
  | 'API'
  | 'ADMIN';

/**
 * Individual consent record from backend
 */
export interface ConsentRecord {
  id: string;
  consent_type: ConsentType;
  action: ConsentAction;
  consent_text: string;
  privacy_policy_version: string;
  source: ConsentSource;
  ip_address: string | null;
  user_agent: string;
  device_type: 'ios' | 'android' | 'web' | '';
  created_at: string;
}

/**
 * Consent status for UI display (derived from most recent ConsentRecord)
 */
export interface ConsentStatus {
  consent_type: ConsentType;
  purpose: string;
  status: 'granted' | 'not_granted';
  granted_at: string | null;
  can_withdraw: boolean;
}

/**
 * Response from GET /api/users/me/consents/
 */
export interface ConsentsResponse {
  consents: ConsentStatus[];
}

/**
 * Response from POST /api/users/me/consents/{type}/withdraw/
 */
export interface ConsentWithdrawResponse {
  status: 'withdrawn';
  consent_type: ConsentType;
  withdrawn_at: string;
  effective_immediately: boolean;
}

// =============================================================================
// PRIVACY REQUEST TYPES
// =============================================================================

/**
 * Privacy request types matching backend PrivacyRequest.REQUEST_TYPES
 */
export type PrivacyRequestType =
  | 'ACCESS'
  | 'EXPORT'
  | 'DELETION'
  | 'CORRECTION'
  | 'OBJECTION';

/**
 * Privacy request status matching backend
 */
export type PrivacyRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

/**
 * Privacy request item
 */
export interface PrivacyRequest {
  id: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  submitted_at: string;
  completed_at: string | null;
  estimated_completion?: string;
  download_url?: string;
}

/**
 * Response from GET /api/users/me/privacy-requests/
 */
export interface PrivacyRequestsResponse {
  requests: PrivacyRequest[];
}

// =============================================================================
// DATA ACCESS TYPES
// =============================================================================

/**
 * Response from GET /api/users/me/data/
 */
export interface DataAccessResponse {
  request_id: string;
  generated_at: string;
  data_subject: {
    id: number;
    email: string;
  };
  personal_data: {
    account: {
      email: string;
      first_name: string;
      last_name: string;
      date_joined: string;
      last_login: string;
    };
    profile: {
      phone?: string;
      company?: string;
      timezone?: string;
    };
    events: Array<{
      id: number;
      name: string;
      status: string;
      start_date: string;
      venue?: string;
    }>;
    contracts: Array<{
      id: number;
      event_id: number;
      status: string;
      signed_at: string | null;
    }>;
    payments: Array<{
      id: number;
      amount: string;
      currency: string;
      status: string;
      paid_at: string | null;
    }>;
    notification_preferences: Record<string, boolean>;
    devices: Array<{
      device_type: string;
      device_name: string;
      registered_at: string;
      last_used: string;
    }>;
  };
  processing_purposes: Record<string, string>;
  data_retention: Record<string, string>;
  third_party_sharing: Array<{
    recipient: string;
    purpose: string;
    data_shared: string[];
  }>;
}

// =============================================================================
// ACCOUNT DELETION TYPES
// =============================================================================

/**
 * Request body for DELETE /api/users/me/
 */
export interface AccountDeletionRequest {
  confirmation: string; // Must be "DELETE MY ACCOUNT"
  reason?: string;
  password: string;
}

/**
 * Successful deletion response
 */
export interface AccountDeletionSuccessResponse {
  status: 'processing';
  request_id: string;
  message: string;
  actions: {
    deleted: string[];
    anonymized: string[];
    retained: Array<{
      data: string;
      reason: string;
      retention_until: string;
    }>;
  };
  appeal_contact: string;
}

/**
 * Blocked deletion response
 */
export interface AccountDeletionBlockedResponse {
  status: 'blocked';
  message: string;
  blocking_reasons: Array<{
    type: string;
    description: string;
    resolution: string;
  }>;
}

export type AccountDeletionResponse =
  | AccountDeletionSuccessResponse
  | AccountDeletionBlockedResponse;

// =============================================================================
// SESSION TYPES
// =============================================================================

/**
 * Active session item
 */
export interface Session {
  id: string;
  device: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
}

/**
 * Response from GET /api/users/sessions/
 */
export type SessionsResponse = Session[];
```

**Verification Checklist:**
- [ ] Types match backend API responses
- [ ] Types align with ConsentRecord model
- [ ] All fields properly typed (no `any`)

---

### 10.2 Privacy API Layer

**File:** `src/apis/privacy.api.ts`

```typescript
/**
 * Privacy API
 *
 * All privacy and consent-related API calls for DPA compliance.
 */

import api from '@/utils/api';
import type {
  ConsentsResponse,
  ConsentWithdrawResponse,
  ConsentType,
  ConsentRecord,
  DataAccessResponse,
  PrivacyRequestsResponse,
  AccountDeletionRequest,
  AccountDeletionResponse,
  SessionsResponse,
} from '@/types/privacy.types';

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
): Promise<ConsentWithdrawResponse> => {
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
}): Promise<{
  results: ConsentRecord[];
  count: number;
  next: string | null;
  previous: string | null;
}> => {
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
 * Right to Portability - Export data as JSON or CSV
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
export const correctData = async (data: {
  corrections: Array<{
    field: string;
    current_value: string;
    corrected_value: string;
    reason?: string;
  }>;
}): Promise<{
  status: string;
  corrections_applied: Array<{
    field: string;
    old_value: string;
    new_value: string;
    applied_at: string;
  }>;
  corrections_pending: Array<{
    field: string;
    reason: string;
  }>;
}> => {
  const response = await api.patch('/users/me/correct/', data);
  return response.data;
};

/**
 * Right to Object - Object to processing
 */
export const objectToProcessing = async (data: {
  objection_type: 'marketing' | 'profiling' | 'analytics' | 'all_non_essential';
  reason?: string;
}): Promise<{
  status: string;
  objection_id: string;
  changes_applied: Record<string, boolean>;
  cannot_object: Array<{
    processing: string;
    reason: string;
  }>;
}> => {
  const response = await api.post('/users/me/object/', data);
  return response.data;
};

/**
 * Right to Erasure - Delete account
 */
export const deleteAccount = async (
  data: AccountDeletionRequest
): Promise<AccountDeletionResponse> => {
  const response = await api.delete('/users/me/', { data });
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
```

---

### 10.3 Privacy Hooks

**File:** `src/hooks/usePrivacy.ts`

```typescript
/**
 * Privacy Hooks
 *
 * React Query hooks for privacy and consent management.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import * as PrivacyAPI from '@/apis/privacy.api';
import type { ConsentType } from '@/types/privacy.types';
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
 * Hook for account deletion (Right to Erasure)
 */
export function useAccountDeletion() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: PrivacyAPI.deleteAccount,
    onError: (error: any) => {
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
```

---

### 10.4 Enhanced Profile Screen

**File:** `app/(tabs)/profile.tsx` (Update)

Replace the existing placeholder with a full profile screen.

**Features:**
- User avatar with initials or photo
- User information header (name, email)
- Member since date
- Settings navigation sections:
  - Account: Edit Profile, Change Password
  - Preferences: Notifications (existing from Phase 9)
  - Privacy: Privacy & Data
  - Support: Help & Support
  - Legal: Privacy Policy, Terms of Service
- Sign Out button with confirmation dialog
- App version in footer

**Key Implementation:**

```typescript
const menuSections = [
  {
    title: 'Account',
    items: [
      {
        icon: UserCircle,
        label: 'Edit Profile',
        route: '/settings/edit-profile',
      },
      {
        icon: Lock,
        label: 'Change Password',
        route: '/settings/change-password',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        icon: Bell,
        label: 'Notifications',
        route: '/settings/notifications',
      },
    ],
  },
  {
    title: 'Privacy',
    items: [
      {
        icon: Shield,
        label: 'Privacy & Data',
        route: '/settings/privacy',
        description: 'Manage consents, download data',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        icon: Question,
        label: 'Help & Support',
        route: '/settings/help',
      },
    ],
  },
  {
    title: 'Legal',
    items: [
      {
        icon: FileText,
        label: 'Privacy Policy',
        onPress: () => Linking.openURL(PRIVACY_POLICY_URL),
        external: true,
      },
      {
        icon: FileText,
        label: 'Terms of Service',
        onPress: () => Linking.openURL(TERMS_URL),
        external: true,
      },
    ],
  },
];
```

---

### 10.5 Edit Profile Screen

**File:** `app/settings/edit-profile.tsx`

**Features:**
- Pre-filled form with current user data
- Editable fields:
  - First Name (required)
  - Last Name (required)
  - Phone Number (optional, PH format validation)
  - Company/Organization (optional)
- Form validation with react-hook-form + zod
- Save changes with loading state
- Discard changes confirmation
- Success/error toast notifications

**Validation Schema:**

```typescript
import { z } from 'zod';

const editProfileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+63|0)?[0-9]{10,11}$/.test(val.replace(/\s/g, '')),
      'Invalid Philippine phone number'
    ),
  company: z.string().max(100, 'Company name too long').optional(),
});
```

---

### 10.6 Change Password Screen

**File:** `app/settings/change-password.tsx`

**Features:**
- Current password field (required)
- New password field with requirements display
- Confirm new password field
- Password strength indicator
- Show/hide password toggles
- Form validation with zod
- API error handling (wrong current password)
- Success redirect to profile with toast

**Password Requirements Display:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Validation Schema:**

```typescript
const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });
```

---

### 10.7 Privacy Dashboard Screen

**File:** `app/settings/privacy.tsx`

Central hub for privacy controls (DPA compliance).

**Sections:**

1. **Your Consents**
   - Marketing Email toggle with last updated timestamp
   - Marketing SMS toggle with last updated timestamp
   - Marketing Push toggle with last updated timestamp
   - Usage Analytics toggle (opt-out)
   - Link to consent history

2. **Your Data**
   - View My Data button -> Data Access Screen
   - Download My Data button -> Triggers export
   - Request My Data button -> For async export

3. **Account**
   - Delete My Account button -> Account Deletion Flow

4. **Legal**
   - Privacy Policy link (opens in-app browser)
   - Terms of Service link (opens in-app browser)

**Reference UI:** See CONSENT_MANAGEMENT_UI.md Section 4.2

---

### 10.8 Consent History Screen

**File:** `app/settings/consent-history.tsx`

**Features:**
- Chronological list of consent changes
- Grouped by month/year
- Each record shows:
  - Date and time
  - Consent type name
  - Action (Granted/Withdrawn)
  - Change indicator (OFF -> ON or ON -> OFF)
  - Source (Mobile App, Web, Registration, etc.)
- Pull-to-refresh
- Infinite scroll pagination

**Reference UI:** See CONSENT_MANAGEMENT_UI.md Section 4.3

---

### 10.9 Data Access Screen

**File:** `app/settings/my-data.tsx`

**Features:**
- Display all personal data categories:
  - Account Information
  - Profile Information
  - Events History
  - Contracts
  - Payments
  - Notification Preferences
  - Registered Devices
- Collapsible sections (accordion)
- Processing purposes explanation
- Data retention information
- Third-party sharing disclosure
- Download Data button (JSON or CSV)
- Loading state for data fetch
- Error handling with retry

**Reference:** See DATA_SUBJECT_RIGHTS_API.md Section 1

---

### 10.10 Data Download Screen

**File:** `app/settings/download-data.tsx`

**Features:**
- Explain what's included in export:
  - Account information
  - Booking history
  - Event details
  - Payment records
  - Questionnaire responses
  - Signed contracts
  - Communication preferences
- Format selection (JSON / CSV)
- Processing time notice (up to 15 days per DPA)
- Request Download button
- Previous requests history with:
  - Status (Processing, Completed, Expired)
  - Download link (if available)
  - Expiry countdown (7 days after generation)

**Reference UI:** See CONSENT_MANAGEMENT_UI.md Section 4.5

---

### 10.11 Account Deletion Flow

**File:** `app/settings/delete-account.tsx`

Multi-step flow with three stages:

**Step 1: Initial Warning**
- Warning about permanent action
- What will be deleted:
  - Account and profile
  - Device registrations
  - Notification preferences
  - Communication history
- What must be retained (legal requirements):
  - Financial records (10 years - BIR)
  - Signed contracts (10 years - legal)
  - Transaction history (anonymized)
- Active bookings warning (if any)
- Continue/Cancel buttons

**Step 2: Identity Verification**
- Password confirmation field
- Alternative: Email verification code (6 digits)
- Resend code option
- Timer for code expiry

**Step 3: Final Confirmation**
- Type "DELETE" to confirm
- Checkboxes for understanding:
  - [ ] This action is permanent
  - [ ] I will lose access immediately
  - [ ] Some data must be retained legally
- Permanently Delete Account button (red)
- Go Back link

**Reference UI:** See CONSENT_MANAGEMENT_UI.md Section 4.6

---

### 10.12 Consent Withdrawal Dialog

**File:** `src/components/privacy/WithdrawalDialog.tsx`

Modal dialog shown when toggling OFF a marketing consent.

**Features:**
- Clear explanation of what will change
- List of things that won't be affected:
  - Booking confirmations
  - Payment receipts
  - Account notifications
- "Turn Off" primary action (red)
- "Keep On" secondary action

**Reference UI:** See CONSENT_MANAGEMENT_UI.md Section 4.4

---

### 10.13 Privacy Components

**Directory:** `src/components/privacy/`

**Components to create:**

1. **ConsentToggle.tsx** - Toggle with label and last updated
2. **WithdrawalDialog.tsx** - Confirmation dialog
3. **DataCategoryCard.tsx** - Collapsible data category
4. **PrivacyRequestCard.tsx** - Privacy request status card
5. **DeletionStepIndicator.tsx** - Progress through deletion steps

---

### 10.14 Settings Layout

**File:** `app/settings/_layout.tsx` (Update)

Update the existing layout to include all new screens:

```typescript
import { Stack } from 'expo-router';
import { colors, typeScale } from '@/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.neutral.cream,
        },
        headerTintColor: colors.primary.black,
        headerTitleStyle: {
          ...typeScale.titleMedium,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="edit-profile"
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: 'Privacy & Data' }}
      />
      <Stack.Screen
        name="consent-history"
        options={{ title: 'Consent History' }}
      />
      <Stack.Screen
        name="my-data"
        options={{ title: 'My Data' }}
      />
      <Stack.Screen
        name="download-data"
        options={{ title: 'Download Data' }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          title: 'Delete Account',
          headerTintColor: colors.semantic.error,
        }}
      />
      <Stack.Screen
        name="help"
        options={{ title: 'Help & Support' }}
      />
    </Stack>
  );
}
```

---

## File Structure Summary

```
mobile-app/
├── src/
│   ├── types/
│   │   └── privacy.types.ts               # NEW
│   │
│   ├── apis/
│   │   └── privacy.api.ts                 # NEW
│   │
│   ├── hooks/
│   │   └── usePrivacy.ts                  # NEW
│   │
│   └── components/
│       └── privacy/
│           ├── index.ts                   # NEW - exports
│           ├── ConsentToggle.tsx          # NEW
│           ├── WithdrawalDialog.tsx       # NEW
│           ├── DataCategoryCard.tsx       # NEW
│           ├── PrivacyRequestCard.tsx     # NEW
│           └── DeletionStepIndicator.tsx  # NEW
│
├── app/
│   ├── (tabs)/
│   │   └── profile.tsx                    # UPDATE - Enhanced
│   │
│   └── settings/
│       ├── _layout.tsx                    # UPDATE - Add new screens
│       ├── notifications.tsx              # EXISTS (Phase 9)
│       ├── edit-profile.tsx               # NEW
│       ├── change-password.tsx            # NEW
│       ├── privacy.tsx                    # NEW
│       ├── consent-history.tsx            # NEW
│       ├── my-data.tsx                    # NEW
│       ├── download-data.tsx              # NEW
│       ├── delete-account.tsx             # NEW
│       └── help.tsx                       # NEW (placeholder)
│
└── PHASE_10_IMPLEMENTATION_PLAN.md        # THIS FILE
```

---

## Testing Checklist

### 10.1 Profile Screen
- [ ] User info displays correctly
- [ ] Avatar shows initials
- [ ] Member since date shows
- [ ] All menu items navigate correctly
- [ ] Sign out shows confirmation
- [ ] Sign out clears auth state
- [ ] Pull-to-refresh syncs user data
- [ ] App version displays in footer

### 10.2 Edit Profile
- [ ] Form pre-fills with current data
- [ ] Validation works for all fields
- [ ] Phone number validates PH format
- [ ] Save updates user data
- [ ] Error handling works
- [ ] Success shows toast and navigates back
- [ ] Cancel prompts if changes made

### 10.3 Change Password
- [ ] Current password validates against backend
- [ ] New password requirements display
- [ ] Requirements check off as met
- [ ] Password strength indicator works
- [ ] Passwords must match
- [ ] Show/hide toggles work
- [ ] Wrong current password shows error
- [ ] Success navigates back with toast

### 10.4 Privacy Dashboard
- [ ] All consent toggles load correctly
- [ ] Last updated timestamps display
- [ ] Toggle updates persist to backend
- [ ] Withdrawal dialog appears for marketing
- [ ] Navigation to all sub-screens works
- [ ] Legal links open in browser

### 10.5 Consent History
- [ ] History loads correctly
- [ ] Grouped by month
- [ ] Shows all record details
- [ ] Infinite scroll works
- [ ] Pull-to-refresh works

### 10.6 Data Access
- [ ] All data categories load
- [ ] Sections expand/collapse
- [ ] Processing purposes shown
- [ ] Third-party sharing disclosed
- [ ] Loading state shows
- [ ] Error state with retry

### 10.7 Data Download
- [ ] Format selection works
- [ ] Request initiates correctly
- [ ] Previous requests display
- [ ] Status indicators correct
- [ ] Download links work (if available)

### 10.8 Account Deletion
- [ ] Step 1 shows all warnings
- [ ] Active bookings warning if applicable
- [ ] Step 2 password verification works
- [ ] Step 3 requires "DELETE" text
- [ ] All checkboxes required
- [ ] Deletion processes correctly
- [ ] Blocked response shows reasons
- [ ] User logged out after deletion

---

## Security Considerations

1. **Password Change:** Current password verified server-side
2. **Account Deletion:** Multi-step verification required
3. **Data Export:** Rate limited (1 per day)
4. **Sessions:** Allow users to view and revoke
5. **Consent Audit:** All changes logged with device info

---

## Performance Considerations

1. **Profile Data:** Cached with 5-minute stale time
2. **Consent Status:** Cached with 5-minute stale time
3. **Consent History:** Paginated (20 items per page)
4. **Data Access:** Fetched on-demand only
5. **Sessions:** Refreshed every 30 seconds when viewing

---

## Accessibility Requirements

Following WCAG 2.1 AA:

1. **Touch Targets:** Minimum 44x44px
2. **Focus States:** Visible focus on all inputs
3. **Screen Reader:** Accessible labels on all elements
4. **Color Contrast:** 4.5:1 minimum
5. **Error Messages:** Clear, accessible announcements

---

## Implementation Order

1. **Types & API** (10.1, 10.2)
2. **Hooks** (10.3)
3. **Privacy Components** (10.13)
4. **Settings Layout Update** (10.14)
5. **Profile Screen Update** (10.4)
6. **Edit Profile** (10.5)
7. **Change Password** (10.6)
8. **Privacy Dashboard** (10.7)
9. **Consent History** (10.8)
10. **Data Access** (10.9)
11. **Data Download** (10.10)
12. **Account Deletion** (10.11)
13. **Withdrawal Dialog** (10.12)
14. **Testing**

---

## DPA Compliance Summary

| DPA Section | Requirement | Implementation |
|-------------|-------------|----------------|
| Sec. 12 | Consent requirements | Consent toggles with audit trail |
| Sec. 16 | Right to Access | Data access screen |
| Sec. 16 | Right to Portability | Data download (JSON/CSV) |
| Sec. 16 | Right to Erasure | Account deletion flow |
| Sec. 16 | Right to Correction | (Via edit profile) |
| Sec. 16 | Right to Object | Via consent toggles |
| Sec. 17 | Transparency | Processing purposes displayed |
| Sec. 18 | Notice requirements | Privacy policy accessible |

---

## Notes

- This phase builds on notification preferences from Phase 9
- Account deletion requires backend support for verification
- Photo upload for profile can be added as enhancement
- Sessions screen can be expanded in Phase 13 (Security)
- Help & Support is a placeholder for future implementation
