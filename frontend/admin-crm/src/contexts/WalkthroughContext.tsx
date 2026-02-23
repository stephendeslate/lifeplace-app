// frontend/admin-crm/src/contexts/WalkthroughContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { Portal } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { storage } from '../utils/storage';
import { tourRegistry } from '../config/walkthrough-tours';
import { WalkthroughOverlay } from '../components/walkthrough/WalkthroughOverlay';
import { WalkthroughTooltip } from '../components/walkthrough/WalkthroughTooltip';
import type {
  WalkthroughContextType,
  WalkthroughState,
  WalkthroughPreferences,
  TourId,
  Tour,
} from '../types/walkthrough.types';

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

const INITIAL_STATE: WalkthroughState = {
  isActive: false,
  currentTour: null,
  currentStepIndex: 0,
  isPaused: false,
  targetElement: null,
  targetRect: null,
};

const INITIAL_PREFERENCES: WalkthroughPreferences = {
  autoShowTours: true,
  showWelcomeTour: true,
  completedTours: [],
  dismissedTours: [],
};

interface WalkthroughProviderProps {
  children: React.ReactNode;
}

export const WalkthroughProvider: React.FC<WalkthroughProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<WalkthroughState>(INITIAL_STATE);
  const [preferences, setPreferences] = useState<WalkthroughPreferences>(() => {
    const stored = storage.getWalkthroughPreferences();
    return stored || INITIAL_PREFERENCES;
  });

  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);
  const hasTriggeredWelcome = useRef(false);

  // Persist preferences to storage
  useEffect(() => {
    storage.setWalkthroughPreferences(preferences);
  }, [preferences]);

  // Update target rect when element position changes
  const updateTargetRect = useCallback(() => {
    if (state.targetElement) {
      const rect = state.targetElement.getBoundingClientRect();
      setState((prev) => {
        // Only update if rect has changed to avoid unnecessary re-renders
        if (
          prev.targetRect?.top !== rect.top ||
          prev.targetRect?.left !== rect.left ||
          prev.targetRect?.width !== rect.width ||
          prev.targetRect?.height !== rect.height
        ) {
          return { ...prev, targetRect: rect };
        }
        return prev;
      });
    }
  }, [state.targetElement]);

  // Setup observers for target element position tracking
  useEffect(() => {
    if (!state.targetElement) return;

    // ResizeObserver for element size changes
    resizeObserverRef.current = new ResizeObserver(updateTargetRect);
    resizeObserverRef.current.observe(state.targetElement);

    // Scroll and resize handlers
    scrollHandlerRef.current = updateTargetRect;
    window.addEventListener('scroll', scrollHandlerRef.current, true);
    window.addEventListener('resize', scrollHandlerRef.current);

    // Initial rect calculation
    updateTargetRect();

    return () => {
      resizeObserverRef.current?.disconnect();
      if (scrollHandlerRef.current) {
        window.removeEventListener('scroll', scrollHandlerRef.current, true);
        window.removeEventListener('resize', scrollHandlerRef.current);
      }
    };
  }, [state.targetElement, updateTargetRect]);

  // Find target element by selector with optional wait
  const findTargetElement = useCallback(
    async (selector: string, waitFor: boolean = false): Promise<HTMLElement | null> => {
      const find = () => document.querySelector<HTMLElement>(selector);

      if (!waitFor) {
        return find();
      }

      // Wait up to 3 seconds for element to appear
      return new Promise((resolve) => {
        const element = find();
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const el = find();
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(find());
        }, 3000);
      });
    },
    [],
  );

  // Navigate to a specific step, auto-skipping if target not found
  const goToStepInternal = useCallback(
    async (tour: Tour, stepIndex: number, direction: 'forward' | 'backward' = 'forward') => {
      const step = tour.steps[stepIndex];
      if (!step) return;

      const targetElement = await findTargetElement(step.target, step.waitForElement);

      // If target element not found, auto-skip to next available step
      if (!targetElement) {
        console.warn(`Tour step "${step.id}" target "${step.target}" not found, skipping...`);

        // Find next step with a valid target
        const increment = direction === 'forward' ? 1 : -1;
        let nextIndex = stepIndex + increment;

        while (nextIndex >= 0 && nextIndex < tour.steps.length) {
          const nextStep = tour.steps[nextIndex];
          const nextTarget = await findTargetElement(nextStep.target, false);

          if (nextTarget) {
            // Found a valid step, go to it
            await goToStepInternal(tour, nextIndex, direction);
            return;
          }
          nextIndex += increment;
        }

        // No more valid steps found
        if (direction === 'forward') {
          // Complete the tour if going forward and no more steps
          setState(INITIAL_STATE);
          return;
        } else {
          // Stay on current step if going backward
          return;
        }
      }

      // Scroll target into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      setState((prev) => ({
        ...prev,
        currentStepIndex: stepIndex,
        targetElement,
        targetRect: targetElement.getBoundingClientRect(),
      }));
    },
    [findTargetElement],
  );

  // Start a tour
  const startTour = useCallback(
    async (tourId: TourId) => {
      const tour = tourRegistry.get(tourId);
      if (!tour || tour.steps.length === 0) {
        console.warn(`Tour "${tourId}" not found or has no steps`);
        return;
      }

      // Navigate to required path if needed
      if (tour.requiredPath && location.pathname !== tour.requiredPath) {
        navigate(tour.requiredPath);
        // Wait for navigation and DOM to settle
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Find the first step with a valid target
      let firstValidStepIndex = -1;
      for (let i = 0; i < tour.steps.length; i++) {
        const targetElement = await findTargetElement(
          tour.steps[i].target,
          tour.steps[i].waitForElement,
        );
        if (targetElement) {
          firstValidStepIndex = i;
          break;
        }
      }

      // If no valid steps found, don't start the tour
      if (firstValidStepIndex === -1) {
        console.warn(`Tour "${tourId}" has no steps with valid targets, cannot start`);
        return;
      }

      // Set tour as active
      setState((prev) => ({
        ...prev,
        isActive: true,
        currentTour: tour,
        currentStepIndex: 0,
        isPaused: false,
        targetElement: null,
        targetRect: null,
      }));

      // Navigate to first valid step
      await goToStepInternal(tour, firstValidStepIndex, 'forward');
    },
    [location.pathname, navigate, goToStepInternal, findTargetElement],
  );

  // End the current tour
  const endTour = useCallback(
    (completed: boolean = false) => {
      if (state.currentTour) {
        const tourId = state.currentTour.id;

        setPreferences((prev) => ({
          ...prev,
          completedTours: [
            ...prev.completedTours.filter((t) => t.tourId !== tourId),
            {
              tourId,
              completed,
              completedAt: new Date().toISOString(),
              skipped: !completed,
              lastStepSeen: state.currentStepIndex,
            },
          ],
        }));
      }

      setState(INITIAL_STATE);
    },
    [state.currentTour, state.currentStepIndex],
  );

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (!state.currentTour) return;

    const nextIndex = state.currentStepIndex + 1;

    if (nextIndex >= state.currentTour.steps.length) {
      endTour(true);
      return;
    }

    goToStepInternal(state.currentTour, nextIndex, 'forward');
  }, [state.currentTour, state.currentStepIndex, goToStepInternal, endTour]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (!state.currentTour || state.currentStepIndex === 0) return;

    const prevIndex = state.currentStepIndex - 1;
    goToStepInternal(state.currentTour, prevIndex, 'backward');
  }, [state.currentTour, state.currentStepIndex, goToStepInternal]);

  // Go to specific step
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (!state.currentTour) return;
      if (stepIndex < 0 || stepIndex >= state.currentTour.steps.length) return;

      const direction = stepIndex > state.currentStepIndex ? 'forward' : 'backward';
      goToStepInternal(state.currentTour, stepIndex, direction);
    },
    [state.currentTour, state.currentStepIndex, goToStepInternal],
  );

  // Skip tour (marks as not completed)
  const skipTour = useCallback(() => {
    endTour(false);
  }, [endTour]);

  // Pause tour
  const pauseTour = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  // Resume tour
  const resumeTour = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  // Check if tour is completed (finished all steps)
  const isTourCompleted = useCallback(
    (tourId: TourId): boolean => {
      return preferences.completedTours.some((t) => t.tourId === tourId && t.completed);
    },
    [preferences.completedTours],
  );

  // Check if tour has been seen (completed or skipped)
  const isTourSeen = useCallback(
    (tourId: TourId): boolean => {
      return preferences.completedTours.some((t) => t.tourId === tourId);
    },
    [preferences.completedTours],
  );

  // Check if tour is dismissed
  const isTourDismissed = useCallback(
    (tourId: TourId): boolean => {
      return preferences.dismissedTours.includes(tourId);
    },
    [preferences.dismissedTours],
  );

  // Check if tour should auto-trigger
  const shouldAutoTrigger = useCallback(
    (tourId: TourId): boolean => {
      if (!preferences.autoShowTours) return false;

      const tour = tourRegistry.get(tourId);
      if (!tour?.autoTrigger) return false;

      // Check if already seen (completed or skipped) or dismissed
      if (isTourSeen(tourId)) return false;
      if (isTourDismissed(tourId)) return false;

      return true;
    },
    [preferences.autoShowTours, isTourSeen, isTourDismissed],
  );

  // Get all available tours
  const getAvailableTours = useCallback((): Tour[] => {
    return Array.from(tourRegistry.values());
  }, []);

  // Set auto-show tours preference
  const setAutoShowTours = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, autoShowTours: enabled }));
  }, []);

  // Reset progress for a specific tour
  const resetTourProgress = useCallback((tourId?: TourId) => {
    if (tourId) {
      setPreferences((prev) => ({
        ...prev,
        completedTours: prev.completedTours.filter((t) => t.tourId !== tourId),
        dismissedTours: prev.dismissedTours.filter((id) => id !== tourId),
      }));
    }
  }, []);

  // Reset all tours
  const resetAllTours = useCallback(() => {
    setPreferences(INITIAL_PREFERENCES);
  }, []);

  // Dismiss a tour permanently
  const dismissTour = useCallback(
    (tourId: TourId) => {
      setPreferences((prev) => ({
        ...prev,
        dismissedTours: [...new Set([...prev.dismissedTours, tourId])],
      }));
      if (state.currentTour?.id === tourId) {
        endTour(false);
      }
    },
    [state.currentTour, endTour],
  );

  // First-login detection for welcome tour
  useEffect(() => {
    if (!user || hasTriggeredWelcome.current) return;
    if (!preferences.showWelcomeTour || !preferences.autoShowTours) return;
    if (state.isActive) return;

    // Check if welcome tour should auto-trigger
    if (!shouldAutoTrigger('welcome')) return;

    const dateJoined = new Date(user.date_joined);
    const now = new Date();
    const hoursSinceJoin = (now.getTime() - dateJoined.getTime()) / (1000 * 60 * 60);

    // Show welcome tour if user joined within last 24 hours
    if (hoursSinceJoin < 24) {
      hasTriggeredWelcome.current = true;
      // Delay to let UI render first
      const timer = setTimeout(() => {
        startTour('welcome');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [
    user,
    preferences.showWelcomeTour,
    preferences.autoShowTours,
    state.isActive,
    shouldAutoTrigger,
    startTour,
  ]);

  // Context value
  const value = useMemo<WalkthroughContextType>(
    () => ({
      state,
      preferences,
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      pauseTour,
      resumeTour,
      setAutoShowTours,
      resetTourProgress,
      resetAllTours,
      dismissTour,
      isTourCompleted,
      isTourDismissed,
      getAvailableTours,
      shouldAutoTrigger,
    }),
    [
      state,
      preferences,
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      pauseTour,
      resumeTour,
      setAutoShowTours,
      resetTourProgress,
      resetAllTours,
      dismissTour,
      isTourCompleted,
      isTourDismissed,
      getAvailableTours,
      shouldAutoTrigger,
    ],
  );

  const currentStep = state.currentTour?.steps[state.currentStepIndex];

  return (
    <WalkthroughContext.Provider value={value}>
      {children}

      {/* Walkthrough UI rendered via Portal - follows ToastContext pattern */}
      {state.isActive && !state.isPaused && currentStep && (
        <Portal>
          <WalkthroughOverlay
            targetRect={state.targetRect}
            padding={currentStep.spotlightPadding}
            borderRadius={currentStep.spotlightBorderRadius}
            allowClickThrough={currentStep.allowClickThrough}
            onClick={() => {
              // Clicking outside advances to next step or closes
              if (state.currentStepIndex === (state.currentTour?.steps.length || 1) - 1) {
                endTour(true);
              } else {
                nextStep();
              }
            }}
          />
          <WalkthroughTooltip
            step={currentStep}
            stepIndex={state.currentStepIndex}
            totalSteps={state.currentTour?.steps.length || 0}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
            onClose={() => endTour(false)}
            isFirstStep={state.currentStepIndex === 0}
            isLastStep={state.currentStepIndex === (state.currentTour?.steps.length || 1) - 1}
            targetRect={state.targetRect}
          />
        </Portal>
      )}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};

export default WalkthroughContext;
