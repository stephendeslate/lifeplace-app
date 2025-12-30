/**
 * Biometrics Hook
 *
 * React Query-based hook for biometric authentication.
 * Provides state management for biometric capabilities and settings.
 *
 * Phase 13: Security Hardening
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  BiometricService,
  getBiometricName,
  type BiometricCapability,
  type BiometricAuthResult,
} from '@/services/biometrics';

// =============================================================================
// QUERY KEYS
// =============================================================================

const QUERY_KEYS = {
  capability: ['biometrics', 'capability'] as const,
  enabled: ['biometrics', 'enabled'] as const,
};

// =============================================================================
// TYPES
// =============================================================================

interface UseBiometricsReturn {
  /** Whether biometrics are available on this device */
  isAvailable: boolean;
  /** Whether the user has enabled biometric authentication */
  isEnabled: boolean;
  /** Whether capability/enabled checks are loading */
  isLoading: boolean;
  /** Detailed biometric capabilities */
  capabilities: BiometricCapability | null;
  /** User-friendly name for the biometric type (e.g., "Face ID") */
  biometricName: string;
  /** Enable biometric authentication */
  enable: () => Promise<BiometricAuthResult>;
  /** Disable biometric authentication */
  disable: () => Promise<BiometricAuthResult>;
  /** Toggle biometric authentication */
  toggle: () => Promise<BiometricAuthResult>;
  /** Perform biometric authentication */
  authenticate: (promptMessage?: string) => Promise<BiometricAuthResult>;
  /** Whether enable/disable mutation is in progress */
  isToggling: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBiometrics(): UseBiometricsReturn {
  const queryClient = useQueryClient();

  // Query biometric capabilities
  const capabilityQuery = useQuery({
    queryKey: QUERY_KEYS.capability,
    queryFn: () => BiometricService.getCapabilities(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query whether biometrics are enabled
  const enabledQuery = useQuery({
    queryKey: QUERY_KEYS.enabled,
    queryFn: () => BiometricService.isEnabled(),
    staleTime: 0, // Always check fresh
  });

  // Mutation for enabling/disabling biometrics
  const toggleMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const result = await BiometricService.setEnabled(enable);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate the enabled query to refresh state
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enabled });
    },
  });

  // Enable biometrics
  const enable = useCallback(async (): Promise<BiometricAuthResult> => {
    try {
      await toggleMutation.mutateAsync(true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable',
      };
    }
  }, [toggleMutation]);

  // Disable biometrics
  const disable = useCallback(async (): Promise<BiometricAuthResult> => {
    try {
      await toggleMutation.mutateAsync(false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable',
      };
    }
  }, [toggleMutation]);

  // Toggle biometrics
  const toggle = useCallback(async (): Promise<BiometricAuthResult> => {
    const currentlyEnabled = enabledQuery.data ?? false;
    return currentlyEnabled ? disable() : enable();
  }, [enabledQuery.data, enable, disable]);

  // Perform authentication
  const authenticate = useCallback(
    async (promptMessage?: string): Promise<BiometricAuthResult> => {
      return BiometricService.authenticate(promptMessage);
    },
    []
  );

  // Get the biometric name
  const biometricName = capabilityQuery.data
    ? getBiometricName(capabilityQuery.data.biometricTypes)
    : 'Biometrics';

  return {
    isAvailable: capabilityQuery.data?.isAvailable ?? false,
    isEnabled: enabledQuery.data ?? false,
    isLoading: capabilityQuery.isLoading || enabledQuery.isLoading,
    capabilities: capabilityQuery.data ?? null,
    biometricName,
    enable,
    disable,
    toggle,
    authenticate,
    isToggling: toggleMutation.isPending,
  };
}

export default useBiometrics;
