// frontend/client-portal/src/hooks/useBookingSession.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBookingSessionContext } from '../contexts/BookingSessionContext';
import { useToastActions } from '../contexts/ToastContext';
import { bookingSessionStorage } from '../utils/sessionStorage';
import { stepValidation } from '../utils/stepValidation';
import { bookingFlowKeys, useUpdateBookingSession, useAbandonSession } from './useBookingFlow';
import type {
  BookingFlow,
  SessionStepData,
  StepValidationResult,
} from '../types/bookingflow.types';

/**
 * Enhanced hook for managing booking session operations at a higher level
 * Provides convenient methods that integrate with the BookingSessionContext
 */
export const useBookingSession = () => {
  const context = useBookingSessionContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo, showWarning } = useToastActions();

  // API mutations
  const updateSessionMutation = useUpdateBookingSession();
  const abandonSessionMutation = useAbandonSession();

  // Session initialization
  const initializeBookingSession = useMutation({
    mutationFn: async ({ 
      sessionId, 
      bookingFlow 
    }: { 
      sessionId: string; 
      bookingFlow: BookingFlow; 
    }) => {
      // Initialize the session context
      context.initializeSession(sessionId, bookingFlow);
      
      // Store session metadata in browser storage
      bookingSessionStorage.saveSessionMetadata(sessionId, {
        flowId: bookingFlow.id,
        flowName: bookingFlow.name,
        startedAt: new Date().toISOString(),
      });
      
      return { sessionId, bookingFlow };
    },
    onSuccess: ({ sessionId, bookingFlow }) => {
      showSuccess(
        'Booking Started',
        `Your ${bookingFlow.name} booking has been started successfully.`
      );
      
      // Prefetch session data
      queryClient.prefetchQuery({
        queryKey: bookingFlowKeys.session(sessionId),
        staleTime: 30 * 1000,
      });
    },
    onError: (error) => {
      console.error('Failed to initialize booking session:', error);
      showError('Initialization Failed', 'Unable to start your booking session. Please try again.');
    },
  });

  // Session completion
  const completeBookingSession = useMutation({
    mutationFn: async () => {
      if (!context.state.sessionId) {
        throw new Error('No active session to complete');
      }

      // Validate all required steps are completed
      const { bookingFlow } = context.state;
      if (bookingFlow) {
        const stepDataMap: Record<number, SessionStepData> = {};
        
        // Collect all step data from storage
        // @ts-ignore
        bookingFlow.enabled_steps.forEach((step, index) => {
          const stepData = bookingSessionStorage.getStepData(context.state.sessionId!, index) || {};
          stepDataMap[index] = stepData;
        });

        const validationSummary = stepValidation.getValidationSummary(
          bookingFlow.enabled_steps,
          stepDataMap
        );

        if (!validationSummary.overallValid) {
          const requiredSteps = bookingFlow.enabled_steps.filter(step => step.is_required);
          const incompleteSteps = requiredSteps.filter((step, index) => {
            const validation = stepValidation.validateStep(step, stepDataMap[index] || {});
            return !validation.isValid;
          });

          throw new Error(
            `Please complete all required steps: ${incompleteSteps.map(s => s.name).join(', ')}`
          );
        }
      }

      // This would trigger the completion API call
      // The actual completion logic would be handled by useCompleteBooking hook
      return context.state.sessionId;
    },
    // @ts-ignore
    onSuccess: (sessionId) => {
      showSuccess('Booking Complete!', 'Your event has been successfully booked.');
      
      // Clear session data
      context.clearSession();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: bookingFlowKeys.sessions() });
      
      // Navigate to confirmation or dashboard
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Failed to complete booking:', error);
      showError('Completion Failed', error.message || 'Unable to complete your booking. Please try again.');
    },
  });

  // Session abandonment with confirmation
  const abandonBookingSession = useMutation({
    mutationFn: async (reason?: string) => {
      if (!context.state.sessionId) {
        return;
      }

      // Call API to abandon session
      await abandonSessionMutation.mutateAsync({
        sessionId: context.state.sessionId,
        reason: reason || 'User cancelled booking process',
      });

      // Clear local session data
      await context.abandonSession(reason);
    },
    onSuccess: () => {
      showInfo('Booking Cancelled', 'Your booking session has been cancelled.');
      navigate('/booking');
    },
    onError: (error) => {
      console.error('Failed to abandon session:', error);
      showError('Cancellation Failed', 'Unable to cancel your booking session properly.');
    },
  });

  // Session recovery
  const recoverBookingSession = useMutation({
    mutationFn: async (sessionId: string) => {
      // Attempt to recover session data from context
      const recovered = await context.recoverSession();
      
      if (!recovered) {
        // Try to load session metadata from storage
        const metadata = bookingSessionStorage.getSessionMetadata(sessionId);
        if (!metadata) {
          throw new Error('No session data found to recover');
        }
        
        // Validate session data integrity
        const validation = bookingSessionStorage.validateSessionData(sessionId);
        if (!validation.isValid) {
          throw new Error(`Session data is corrupted: ${validation.issues.join(', ')}`);
        }
        
        throw new Error('Session recovery not fully available - please start a new booking');
      }
      
      return recovered;
    },
    onSuccess: () => {
      showSuccess('Session Recovered', 'Your previous progress has been restored successfully.');
    },
    onError: (error: any) => {
      console.error('Failed to recover session:', error);
      showError('Recovery Failed', error.message || 'Unable to recover your session. Please start a new booking.');
      
      // Navigate to booking selection
      navigate('/booking');
    },
  });

  // Save current step with API integration
  const saveCurrentStepMutation = useMutation({
    mutationFn: async (markCompleted: boolean = false) => {
      if (!context.state.sessionId || !context.state.currentStep) {
        throw new Error('No active session or current step');
      }

      // Validate current step data
      const validation = context.validateCurrentStep();
      if (!validation.isValid && markCompleted) {
        throw new Error('Cannot save incomplete step as completed');
      }

      // Save to API
      await updateSessionMutation.mutateAsync({
        sessionId: context.state.sessionId,
        stepId: context.state.currentStep.id,
        stepData: context.state.currentStepData,
        markCompleted,
      });

      // Mark step as completed in context if requested
      if (markCompleted) {
        context.markStepCompleted(context.state.currentStep.id);
      }

      // Save to browser storage
      bookingSessionStorage.saveStepData(
        context.state.sessionId,
        context.state.currentStepIndex,
        context.state.currentStepData
      );

      // Update navigation state
      bookingSessionStorage.saveNavigationState(context.state.sessionId, {
        currentStepIndex: context.state.currentStepIndex,
        completedStepIds: context.state.completedStepIds,
        lastNavigatedAt: new Date().toISOString(),
      });

      return true;
    },
    onSuccess: (_, markCompleted) => {
      if (markCompleted) {
        showSuccess('Step Completed', 'Your progress has been saved successfully.');
      }
    },
    onError: (error: any) => {
      console.error('Failed to save step:', error);
      if (error?.response?.status === 422) {
        // Validation errors will be shown by the step component
        showWarning('Validation Required', 'Please complete all required fields before proceeding.');
      } else {
        showError('Save Failed', 'Unable to save your progress. Please try again.');
      }
    },
  });

  // Bulk session operations
  const clearAllSessions = useMutation({
    mutationFn: async () => {
      // Clear all session data from browser storage
      bookingSessionStorage.clearAllSessions();
      
      // Clear current session context
      context.clearSession();
    },
    onSuccess: () => {
      showInfo('Sessions Cleared', 'All booking session data has been cleared.');
    },
  });

  // Enhanced step navigation with validation
  const navigateToStepWithValidation = useMutation({
    mutationFn: async ({ stepIndex, skipValidation = false }: { stepIndex: number; skipValidation?: boolean }) => {
      // Check if navigation is allowed
      if (!context.canNavigateToStep(stepIndex)) {
        throw new Error('Cannot navigate to this step. Please complete the current step first.');
      }

      // Validate current step before moving (unless skipping validation)
      if (!skipValidation && context.state.currentStep?.is_required) {
        const validation = context.validateCurrentStep();
        if (!validation.isValid) {
          throw new Error('Please complete the current step before proceeding.');
        }
      }

      // Save current step progress
      if (context.state.hasUnsavedChanges) {
        await saveCurrentStepMutation.mutateAsync(false);
      }

      // Navigate to target step
      context.navigateToStep(stepIndex);

      return stepIndex;
    },
    onError: (error: any) => {
      showWarning('Navigation Blocked', error.message || 'Unable to navigate to the selected step.');
    },
  });

  // Auto-save management with debouncing
  const configureAutoSave = (enabled: boolean) => {
    if (enabled) {
      context.enableAutoSave();
      showInfo('Auto-save Enabled', 'Your progress will be saved automatically.');
    } else {
      context.disableAutoSave();
      showInfo('Auto-save Disabled', 'You will need to save your progress manually.');
    }
  };

  // Session data export (for debugging or support)
  const exportSessionData = () => {
    const { state } = context;
    
    if (!state.sessionId) {
      showWarning('No Session', 'No active session to export.');
      return;
    }

    const exportData = bookingSessionStorage.exportSessionData(state.sessionId);

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-session-${state.sessionId}-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('Session Exported', 'Session data has been downloaded successfully.');
  };

  // Session health check
  const performHealthCheck = () => {
    const { state } = context;
    
    if (!state.sessionId) {
      return {
        sessionValid: false,
        issues: ['No active session'],
        sessionAge: 0,
        hasUnsavedChanges: false,
        isAutoSaving: false,
        sessionExpiry: null,
        timeUntilExpiry: null,
      };
    }

    const validation = bookingSessionStorage.validateSessionData(state.sessionId);
    const storageInfo = bookingSessionStorage.getStorageInfo();

    const healthData = {
      sessionValid: validation.isValid && state.isSessionValid,
      issues: validation.issues,
      sessionAge: state.sessionId && validation.metadata?.lastAccessedAt
        ? Math.round((Date.now() - new Date(validation.metadata.lastAccessedAt).getTime()) / 1000 / 60)
        : 0, // minutes
      hasUnsavedChanges: state.hasUnsavedChanges,
      isAutoSaving: state.isAutoSaving,
      sessionExpiry: state.sessionExpiry,
      timeUntilExpiry: state.sessionExpiry 
        ? Math.round((new Date(state.sessionExpiry).getTime() - Date.now()) / 1000 / 60)
        : null, // minutes
      storageInfo,
    };

    return healthData;
  };

  // Advanced step data management
  const updateStepDataBatch = (updates: Record<string, any>) => {
    // Batch multiple updates to prevent excessive re-renders
    const sanitizedUpdates = stepValidation.sanitizeStepData(updates);
    context.updateStepData(sanitizedUpdates, true);
  };

  const resetStepData = () => {
    context.updateStepData({}, false);
    context.validateCurrentStep();
    showInfo('Step Reset', 'Current step data has been cleared.');
  };

  const validateAllSteps = (): Record<number, StepValidationResult> => {
    const { bookingFlow, sessionId } = context.state;
    const results: Record<number, StepValidationResult> = {};

    if (bookingFlow && sessionId) {
      bookingFlow.enabled_steps.forEach((step, index) => {
        const stepData = bookingSessionStorage.getStepData(sessionId, index) || {};
        results[step.id] = stepValidation.validateStep(step, stepData);
      });
    }

    return results;
  };

  // Session debugging helpers (development only)
  const debugSessionState = () => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    console.group('🔍 Booking Session Debug Info');
    console.log('Session State:', context.state);
    console.log('Navigation Info:', getNavigationInfo());
    console.log('Health Check:', performHealthCheck());
    console.log('Validation State:', validateSessionState());
    if (context.state.sessionId) {
      console.log('Storage Summary:', bookingSessionStorage.getSessionSummary(context.state.sessionId));
    }
    console.groupEnd();
  };

  // Validation helpers
  const validateSessionState = (): {
    isValid: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];
    const { state } = context;

    if (!state.sessionId) {
      issues.push('No active session');
    }

    if (!state.bookingFlow) {
      issues.push('No booking flow configured');
    }

    if (!state.isSessionValid) {
      issues.push('Session is invalid or expired');
    }

    if (context.isSessionExpired()) {
      issues.push('Session has expired');
    }

    if (state.validationErrors && Object.keys(state.validationErrors).length > 0) {
      issues.push('Current step has validation errors');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  };

  // Step navigation helpers
  const getNavigationInfo = () => {
    const { state } = context;
    
    return {
      currentStepIndex: state.currentStepIndex,
      totalSteps: state.totalSteps,
      currentStepName: state.currentStep?.name || '',
      progressPercentage: state.progressPercentage,
      canGoBack: state.canNavigateBack,
      canGoForward: state.canNavigateForward,
      isLastStep: state.currentStepIndex === state.totalSteps - 1,
      isFirstStep: state.currentStepIndex === 0,
      completedSteps: state.completedStepIds.length,
      remainingSteps: state.totalSteps - state.completedStepIds.length,
    };
  };

  // Return the hook interface
  return {
    // Context state and methods
    state: context.state,
    updateStepData: context.updateStepData,
    validateCurrentStep: context.validateCurrentStep,
    navigateNext: context.navigateNext,
    navigatePrevious: context.navigatePrevious,
    canNavigateToStep: context.canNavigateToStep,

    // Session management mutations
    initializeSession: initializeBookingSession,
    completeSession: completeBookingSession,
    abandonSession: abandonBookingSession,
    recoverSession: recoverBookingSession,
    clearAllSessions,

    // Step management
    saveCurrentStep: saveCurrentStepMutation,
    navigateToStepWithValidation,

    // Utility methods
    validateSessionState,
    getNavigationInfo,
    configureAutoSave,
    exportSessionData,
    performHealthCheck,
    updateStepDataBatch,
    resetStepData,
    validateAllSteps,
    debugSessionState,

    // Session status checks
    isSessionValid: context.state.isSessionValid,
    isSessionExpired: context.isSessionExpired(),
    hasUnsavedChanges: context.state.hasUnsavedChanges,
    isAutoSaving: context.state.isAutoSaving,
    isNavigating: context.state.isNavigating,
    isSessionLoading: context.state.isSessionLoading,

    // Mutation states
    isInitializing: initializeBookingSession.isPending,
    isCompleting: completeBookingSession.isPending,
    isAbandoning: abandonBookingSession.isPending,
    isRecovering: recoverBookingSession.isPending,
    isSaving: saveCurrentStepMutation.isPending,
    isNavigatingTo: navigateToStepWithValidation.isPending,

    // Quick access to common state
    sessionId: context.state.sessionId,
    currentStep: context.state.currentStep,
    currentStepIndex: context.state.currentStepIndex,
    totalSteps: context.state.totalSteps,
    progressPercentage: context.state.progressPercentage,
    validationErrors: context.state.validationErrors,
  };
};