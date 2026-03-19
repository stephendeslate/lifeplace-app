// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester/types.ts

import type { BookingFlowDetail, BookingSession } from '@/types/bookingflows';

export interface SessionTesterProps {
  flow: BookingFlowDetail;
  onClose?: () => void;
}

export interface TestSession {
  sessionId: string;
  currentStepIndex: number;
  stepData: Record<number, Record<string, unknown>>;
  errors: Record<number, string[]>;
  startedAt: Date;
  status: 'running' | 'completed' | 'abandoned' | 'error';
  bookingSession?: BookingSession;
}

export interface StepTestResult {
  stepId: number;
  stepName: string;
  stepType: string;
  status: 'pending' | 'testing' | 'passed' | 'failed' | 'skipped';
  errors: string[];
  warnings: string[];
  testData: Record<string, unknown>;
  duration?: number;
}

export type TestMode = 'manual' | 'automated';
export type TestSpeed = 'slow' | 'normal' | 'fast';
