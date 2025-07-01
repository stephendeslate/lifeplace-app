// frontend/client-portal/src/contexts/BookingSessionContext.tsx

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useToastActions } from './ToastContext';
import { bookingSessionStorage } from '../utils/sessionStorage';
import { stepValidation } from '../utils/stepValidation';
import type {
  BookingFlow,
  BookingFlowStep,
  SessionStepData,
  StepValidationResult,
  BookingSession,
} from '../types/bookingflow.types';

// Session state interface
interface BookingSessionState {
  // Session identification
  sessionId: string | null;
  bookingFlow: BookingFlow | null;
  
  // Current state
  currentStep: BookingFlowStep | null;
  currentStepIndex: number;
  totalSteps: number;
  
  // Data and validation
  currentStepData: SessionStepData;
  validationErrors: Record<string, string[]>;
  
  // Progress tracking
  completedStepIds: number[];
  progressPercentage: number;
  
  // Session status
  isSessionValid: boolean;
  isSessionLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  sessionExpiry: string | null;
  
  // Navigation state
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  isNavigating: boolean;
  
  // Auto-save
  isAutoSaving: boolean;
  autoSaveEnabled: boolean;
}

// Action types
type BookingSessionAction =
  | { type: 'INITIALIZE_SESSION'; payload: { sessionId: string; bookingFlow: BookingFlow } }
  | { type: 'UPDATE_CURRENT_SESSION'; payload: BookingSession }
  | { type: 'UPDATE_STEP_DATA'; payload: { data: SessionStepData; skipValidation?: boolean } }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string[]> }
  | { type: 'SET_CURRENT_STEP'; payload: { step: BookingFlowStep; index: number } }
  | { type: 'MARK_STEP_COMPLETED'; payload: number }
  | { type: 'SET_NAVIGATION_STATE'; payload: { isNavigating: boolean; canBack?: boolean; canForward?: boolean } }
  | { type: 'SET_AUTO_SAVE_STATE'; payload: { isAutoSaving: boolean; enabled?: boolean } }
  | { type: 'UPDATE_SAVED_STATE'; payload: { timestamp: string; hasChanges: boolean } }
  | { type: 'SET_SESSION_VALIDITY'; payload: boolean }
  | { type: 'CLEAR_SESSION' };

// Context interface
interface BookingSessionContextType {
  state: BookingSessionState;
  
  // Session management
  initializeSession: (sessionId: string, bookingFlow: BookingFlow) => void;
  updateSessionFromAPI: (session: BookingSession) => void;
  clearSession: () => void;
  
  // Step data management
  updateStepData: (data: SessionStepData, skipValidation?: boolean) => void;
  validateCurrentStep: () => StepValidationResult;
  
  // Navigation
  canNavigateToStep: (stepIndex: number) => boolean;
  navigateToStep: (stepIndex: number) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  
  // Step completion
  markStepCompleted: (stepId: number) => void;
  saveCurrentStep: () => Promise<boolean>;
  
  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  
  // Session validation
  isSessionExpired: () => boolean;
  recoverSession: () => Promise<boolean>;
  abandonSession: (reason?: string) => Promise<void>;
}

// Initial state
const initialState: BookingSessionState = {
  sessionId: null,
  bookingFlow: null,
  currentStep: null,
  currentStepIndex: 0,
  totalSteps: 0,
  currentStepData: {},
  validationErrors: {},
  completedStepIds: [],
  progressPercentage: 0,
  isSessionValid: false,
  isSessionLoading: false,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  sessionExpiry: null,
  canNavigateBack: false,
  canNavigateForward: false,
  isNavigating: false,
  isAutoSaving: false,
  autoSaveEnabled: true,
};

// Reducer function
function bookingSessionReducer(state: BookingSessionState, action: BookingSessionAction): BookingSessionState {
  switch (action.type) {
    case 'INITIALIZE_SESSION': {
      const { sessionId, bookingFlow } = action.payload;
      const enabledSteps = bookingFlow.enabled_steps || [];
      
      return {
        ...state,
        sessionId,
        bookingFlow,
        currentStep: enabledSteps[0] || null,
        currentStepIndex: 0,
        totalSteps: enabledSteps.length,
        isSessionValid: true,
        sessionExpiry: null, // Will be set when session data is loaded
        canNavigateBack: false,
        canNavigateForward: enabledSteps.length > 1,
        completedStepIds: [],
        progressPercentage: 0,
      };
    }

    case 'UPDATE_CURRENT_SESSION': {
      const session = action.payload;
      const currentStepIndex = session.current_step_details 
        ? state.bookingFlow?.enabled_steps.findIndex(step => step.id === session.current_step_details!.id) || 0
        : 0;

      return {
        ...state,
        currentStep: session.current_step_details,
        currentStepIndex,
        progressPercentage: session.progress_percentage,
        sessionExpiry: session.expires_at,
        isSessionValid: !session.is_expired,
        lastSavedAt: session.updated_at,
        hasUnsavedChanges: false,
        // Update current step data from session
        currentStepData: {
          ...state.currentStepData,
          ...session.booking_data,
        },
      };
    }

    case 'UPDATE_STEP_DATA': {
      const { data, skipValidation = false } = action.payload;
      let validationErrors = state.validationErrors;
      
      if (!skipValidation && state.currentStep) {
        const validation = stepValidation.validateStep(state.currentStep, data);
        validationErrors = validation.errors;
      }

      return {
        ...state,
        currentStepData: { ...state.currentStepData, ...data },
        validationErrors,
        hasUnsavedChanges: true,
      };
    }

    case 'SET_VALIDATION_ERRORS': {
      return {
        ...state,
        validationErrors: action.payload,
      };
    }

    case 'SET_CURRENT_STEP': {
      const { step, index } = action.payload;
      const totalSteps = state.totalSteps;
      
      return {
        ...state,
        currentStep: step,
        currentStepIndex: index,
        canNavigateBack: index > 0,
        canNavigateForward: index < totalSteps - 1,
        validationErrors: {}, // Clear validation errors when changing steps
      };
    }

    case 'MARK_STEP_COMPLETED': {
      const stepId = action.payload;
      const completedStepIds = [...state.completedStepIds];
      
      if (!completedStepIds.includes(stepId)) {
        completedStepIds.push(stepId);
      }

      // Recalculate progress percentage
      const progressPercentage = state.totalSteps > 0 
        ? (completedStepIds.length / state.totalSteps) * 100 
        : 0;

      return {
        ...state,
        completedStepIds,
        progressPercentage: Math.min(progressPercentage, 100),
      };
    }

    case 'SET_NAVIGATION_STATE': {
      const { isNavigating, canBack, canForward } = action.payload;
      
      return {
        ...state,
        isNavigating,
        ...(canBack !== undefined && { canNavigateBack: canBack }),
        ...(canForward !== undefined && { canNavigateForward: canForward }),
      };
    }

    case 'SET_AUTO_SAVE_STATE': {
      const { isAutoSaving, enabled } = action.payload;
      
      return {
        ...state,
        isAutoSaving,
        ...(enabled !== undefined && { autoSaveEnabled: enabled }),
      };
    }

    case 'UPDATE_SAVED_STATE': {
      const { timestamp, hasChanges } = action.payload;
      
      return {
        ...state,
        lastSavedAt: timestamp,
        hasUnsavedChanges: hasChanges,
      };
    }

    case 'SET_SESSION_VALIDITY': {
      return {
        ...state,
        isSessionValid: action.payload,
      };
    }

    case 'CLEAR_SESSION': {
      return {
        ...initialState,
      };
    }

    default:
      return state;
  }
}

// Create context
const BookingSessionContext = createContext<BookingSessionContextType | undefined>(undefined);

// Provider component
interface BookingSessionProviderProps {
  children: React.ReactNode;
}

export const BookingSessionProvider: React.FC<BookingSessionProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingSessionReducer, initialState);
  const { showWarning, showError } = useToastActions();

  // Initialize session
  const initializeSession = useCallback((sessionId: string, bookingFlow: BookingFlow) => {
    dispatch({ 
      type: 'INITIALIZE_SESSION', 
      payload: { sessionId, bookingFlow } 
    });
    
    // Store session metadata
    sessionStorage.saveSessionMetadata(sessionId, {
      flowId: bookingFlow.id,
      flowName: bookingFlow.name,
      startedAt: new Date().toISOString(),
    });
  }, []);

  // Update session from API response
  const updateSessionFromAPI = useCallback((session: BookingSession) => {
    dispatch({ 
      type: 'UPDATE_CURRENT_SESSION', 
      payload: session 
    });
  }, []);

  // Clear session
  const clearSession = useCallback(() => {
    if (state.sessionId) {
      bookingSessionStorage.clearSession(state.sessionId);
    }
    dispatch({ type: 'CLEAR_SESSION' });
  }, [state.sessionId]);

  // Update step data
  const updateStepData = useCallback((data: SessionStepData, skipValidation = false) => {
    dispatch({ 
      type: 'UPDATE_STEP_DATA', 
      payload: { data, skipValidation } 
    });

    // Auto-save to browser storage
    if (state.sessionId) {
      bookingSessionStorage.saveStepData(state.sessionId, state.currentStepIndex, {
        ...state.currentStepData,
        ...data,
      });
    }
  }, [state.sessionId, state.currentStepIndex, state.currentStepData]);

  // Validate current step
  const validateCurrentStep = useCallback((): StepValidationResult => {
    if (!state.currentStep) {
      return { isValid: true, errors: {} };
    }

    const validation = stepValidation.validateStep(state.currentStep, state.currentStepData);
    
    dispatch({
      type: 'SET_VALIDATION_ERRORS',
      payload: validation.errors,
    });

    return validation;
  }, [state.currentStep, state.currentStepData]);

  // Check if can navigate to specific step
  const canNavigateToStep = useCallback((stepIndex: number): boolean => {
    if (!state.bookingFlow) return false;
    
    const steps = state.bookingFlow.enabled_steps;
    if (stepIndex < 0 || stepIndex >= steps.length) return false;

    // Can always go back to completed steps
    if (stepIndex <= state.currentStepIndex) return true;

    // Can only go forward if current step is completed or optional
    const currentStep = state.currentStep;
    if (!currentStep) return false;

    if (currentStep.is_required) {
      const validation = stepValidation.validateStep(currentStep, state.currentStepData);
      return validation.isValid;
    }

    return true;
  }, [state.bookingFlow, state.currentStepIndex, state.currentStep, state.currentStepData]);

  // Navigate to specific step
  const navigateToStep = useCallback((stepIndex: number) => {
    if (!state.bookingFlow || !canNavigateToStep(stepIndex)) return;

    const steps = state.bookingFlow.enabled_steps;
    const targetStep = steps[stepIndex];

    if (targetStep) {
      dispatch({
        type: 'SET_CURRENT_STEP',
        payload: { step: targetStep, index: stepIndex },
      });

      // Load step data from storage if available
      if (state.sessionId) {
        const savedData = bookingSessionStorage.getStepData(state.sessionId, stepIndex);
        if (savedData && Object.keys(savedData).length > 0) {
          dispatch({
            type: 'UPDATE_STEP_DATA',
            payload: { data: savedData, skipValidation: true },
          });
        }
      }
    }
  }, [state.bookingFlow, state.sessionId, canNavigateToStep]);

  // Navigate to next step
  const navigateNext = useCallback(() => {
    if (state.canNavigateForward) {
      navigateToStep(state.currentStepIndex + 1);
    }
  }, [state.canNavigateForward, state.currentStepIndex, navigateToStep]);

  // Navigate to previous step
  const navigatePrevious = useCallback(() => {
    if (state.canNavigateBack) {
      navigateToStep(state.currentStepIndex - 1);
    }
  }, [state.canNavigateBack, state.currentStepIndex, navigateToStep]);

  // Mark step as completed
  const markStepCompleted = useCallback((stepId: number) => {
    dispatch({
      type: 'MARK_STEP_COMPLETED',
      payload: stepId,
    });
  }, []);

  // Save current step (placeholder for API integration)
  const saveCurrentStep = useCallback(async (): Promise<boolean> => {
    try {
      dispatch({
        type: 'SET_AUTO_SAVE_STATE',
        payload: { isAutoSaving: true },
      });

      // This will be integrated with the API hooks
      // For now, just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 500));

      dispatch({
        type: 'UPDATE_SAVED_STATE',
        payload: {
          timestamp: new Date().toISOString(),
          hasChanges: false,
        },
      });

      return true;
    } catch (error) {
      showError('Save Failed', 'Unable to save your progress. Please try again.');
      return false;
    } finally {
      dispatch({
        type: 'SET_AUTO_SAVE_STATE',
        payload: { isAutoSaving: false },
      });
    }
  }, [showError]);

  // Enable auto-save
  const enableAutoSave = useCallback(() => {
    dispatch({
      type: 'SET_AUTO_SAVE_STATE',
      payload: { isAutoSaving: false, enabled: true },
    });
  }, []);

  // Disable auto-save
  const disableAutoSave = useCallback(() => {
    dispatch({
      type: 'SET_AUTO_SAVE_STATE',
      payload: { isAutoSaving: false, enabled: false },
    });
  }, []);

  // Check if session is expired
  const isSessionExpired = useCallback((): boolean => {
    if (!state.sessionExpiry) return false;
    return new Date() > new Date(state.sessionExpiry);
  }, [state.sessionExpiry]);

  // Recover session from storage
  const recoverSession = useCallback(async (): Promise<boolean> => {
    if (!state.sessionId) return false;

    try {
      const metadata = bookingSessionStorage.getSessionMetadata(state.sessionId);
      if (!metadata) return false;

      // Attempt to recover session data
      const stepData = bookingSessionStorage.getAllStepData(state.sessionId);
      if (stepData && Object.keys(stepData).length > 0) {
        // Merge recovered data
        const mergedData = Object.values(stepData).reduce((acc, data) => ({ ...acc, ...data }), {});
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: { data: mergedData, skipValidation: true },
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to recover session:', error);
      return false;
    }
  }, [state.sessionId]);

  // Abandon session
  const abandonSession = useCallback(async (reason?: string): Promise<void> => {
    try {
      if (state.sessionId) {
        // Clear browser storage
        bookingSessionStorage.clearSession(state.sessionId);
        
        // This will be integrated with the API hooks to call abandon endpoint
        console.log('Session abandoned:', reason);
      }
      
      clearSession();
    } catch (error) {
      showError('Session Error', 'Unable to properly end the session.');
      // Still clear the session locally
      clearSession();
    }
  }, [state.sessionId, clearSession, showError]);

  // Auto-save effect
  useEffect(() => {
    if (!state.autoSaveEnabled || !state.hasUnsavedChanges || state.isAutoSaving) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      saveCurrentStep();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [state.autoSaveEnabled, state.hasUnsavedChanges, state.isAutoSaving, saveCurrentStep]);

  // Session expiry check effect
  useEffect(() => {
    if (!state.sessionExpiry) return;

    const checkExpiry = () => {
      if (isSessionExpired()) {
        dispatch({ type: 'SET_SESSION_VALIDITY', payload: false });
        showWarning('Session Expired', 'Your booking session has expired. Please start a new booking.');
      }
    };

    // Check immediately and then every minute
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);

    return () => clearInterval(interval);
  }, [state.sessionExpiry, isSessionExpired, showWarning]);

  // Context value
  const contextValue: BookingSessionContextType = {
    state,
    initializeSession,
    updateSessionFromAPI,
    clearSession,
    updateStepData,
    validateCurrentStep,
    canNavigateToStep,
    navigateToStep,
    navigateNext,
    navigatePrevious,
    markStepCompleted,
    saveCurrentStep,
    enableAutoSave,
    disableAutoSave,
    isSessionExpired,
    recoverSession,
    abandonSession,
  };

  return (
    <BookingSessionContext.Provider value={contextValue}>
      {children}
    </BookingSessionContext.Provider>
  );
};

// Hook to use the booking session context
export const useBookingSessionContext = (): BookingSessionContextType => {
  const context = useContext(BookingSessionContext);
  if (context === undefined) {
    throw new Error('useBookingSessionContext must be used within a BookingSessionProvider');
  }
  return context;
};