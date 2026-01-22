// frontend/admin-crm/src/types/walkthrough.types.ts

import type { SvgIconComponent } from '@mui/icons-material';

/**
 * Tour identifier - unique ID for each tour
 */
export type TourId =
  | 'welcome'
  | 'dashboard'
  | 'events'
  | 'clients'
  | 'payments'
  | 'settings'
  | 'analytics';

/**
 * Step placement relative to target element
 */
export type StepPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/**
 * Individual step in a tour
 */
export interface WalkthroughStep {
  /** Unique identifier for the step */
  id: string;
  /** Title displayed in the tooltip */
  title: string;
  /** Content/description for the step */
  content: string;
  /** CSS selector for the target element (e.g., '[data-tour="nav"]') */
  target: string;
  /** Tooltip placement relative to target (default: 'bottom') */
  placement?: StepPlacement;
  /** Padding around the spotlight cutout in pixels (default: 8) */
  spotlightPadding?: number;
  /** Border radius for the spotlight cutout in pixels (default: 8) */
  spotlightBorderRadius?: number;
  /** Wait for target element to appear in DOM before showing step */
  waitForElement?: boolean;
  /** Allow clicking through the overlay to interact with the target */
  allowClickThrough?: boolean;
}

/**
 * Tour definition
 */
export interface Tour {
  /** Unique identifier for the tour */
  id: TourId;
  /** Display name of the tour */
  name: string;
  /** Description of what the tour covers */
  description: string;
  /** Icon component for the tour */
  icon?: SvgIconComponent;
  /** Array of steps in the tour */
  steps: WalkthroughStep[];
  /** Path where tour must start (will navigate if not on this path) */
  requiredPath?: string;
  /** Whether to auto-trigger this tour for first-time users */
  autoTrigger?: boolean;
  /** Category for grouping tours */
  category?: 'onboarding' | 'feature' | 'advanced';
}

/**
 * Progress tracking for a completed tour
 */
export interface TourProgress {
  tourId: TourId;
  completed: boolean;
  completedAt?: string;
  skipped?: boolean;
  lastStepSeen?: number;
}

/**
 * User walkthrough preferences stored in localStorage
 */
export interface WalkthroughPreferences {
  /** Whether to automatically show tours for new features */
  autoShowTours: boolean;
  /** Whether to show welcome tour for new users */
  showWelcomeTour: boolean;
  /** Array of completed/skipped tours */
  completedTours: TourProgress[];
  /** Tour IDs that user has permanently dismissed */
  dismissedTours: TourId[];
}

/**
 * Walkthrough state for the current session
 */
export interface WalkthroughState {
  /** Whether a tour is currently active */
  isActive: boolean;
  /** The currently running tour */
  currentTour: Tour | null;
  /** Index of the current step in the tour */
  currentStepIndex: number;
  /** Whether the tour is paused */
  isPaused: boolean;
  /** Reference to the target DOM element */
  targetElement: HTMLElement | null;
  /** Bounding rect of the target element */
  targetRect: DOMRect | null;
}

/**
 * Walkthrough context API
 */
export interface WalkthroughContextType {
  // State
  state: WalkthroughState;
  preferences: WalkthroughPreferences;

  // Tour control
  startTour: (tourId: TourId) => Promise<void>;
  endTour: (completed?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  skipTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;

  // Preferences
  setAutoShowTours: (enabled: boolean) => void;
  resetTourProgress: (tourId?: TourId) => void;
  resetAllTours: () => void;
  dismissTour: (tourId: TourId) => void;

  // Queries
  isTourCompleted: (tourId: TourId) => boolean;
  isTourDismissed: (tourId: TourId) => boolean;
  getAvailableTours: () => Tour[];
  shouldAutoTrigger: (tourId: TourId) => boolean;
}

/**
 * Props for the WalkthroughTooltip component
 */
export interface WalkthroughTooltipProps {
  step: WalkthroughStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  targetRect: DOMRect | null;
}

/**
 * Props for the WalkthroughOverlay component
 */
export interface WalkthroughOverlayProps {
  targetRect: DOMRect | null;
  padding?: number;
  borderRadius?: number;
  onClick?: () => void;
  allowClickThrough?: boolean;
}
