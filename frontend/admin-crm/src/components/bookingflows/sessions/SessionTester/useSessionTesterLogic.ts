// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester/useSessionTesterLogic.ts

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBookingSessions } from '@/hooks/useBookingFlows';
import type {
  BookingFlowDetail,
  BookingFlowStep,
  BookingSession,
  CreateBookingSessionData,
  UpdateBookingSessionData,
} from '@/types/bookingflows';
import type { TestSession, StepTestResult, TestMode, TestSpeed } from './types';

export function useSessionTesterLogic(flow: BookingFlowDetail) {
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<StepTestResult[]>([]);
  const [testMode, setTestMode] = useState<TestMode>('manual');
  const [testSpeed, setTestSpeed] = useState<TestSpeed>('normal');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    createSession,
    updateSessionData,
    completeBooking,
    abandonSession,
    isCreatingSession,
    isUpdatingSessionData,
    isCompletingBooking,
    isAbandoningSession,
  } = useBookingSessions();

  const enabledSteps = useMemo(
    () => flow.steps?.filter((step) => step.is_enabled).sort((a, b) => a.order - b.order) || [],
    [flow.steps],
  );

  useEffect(() => {
    setTestResults(
      enabledSteps.map((step) => ({
        stepId: step.id,
        stepName: step.step_type_display,
        stepType: step.step_type_display,
        status: 'pending',
        errors: [],
        warnings: [],
        testData: {},
      })),
    );
  }, [enabledSteps]);

  const generateTestDataForStep = useCallback((step: BookingFlowStep): Record<string, unknown> => {
    const baseData = {
      step_id: step.id,
      timestamp: new Date().toISOString(),
    };

    switch (step.step_type) {
      case 'introduction':
        return { ...baseData, acknowledged: true };

      case 'date_time': {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 30);
        return {
          ...baseData,
          start_date: eventDate.toISOString().split('T')[0],
          start_time: '14:00',
          end_time: '18:00',
          duration: 4,
        };
      }

      case 'questionnaire':
        return {
          ...baseData,
          responses: {
            dietary_restrictions: 'None',
            special_requests: 'Test special request',
            music_preference: 'Background music',
          },
        };

      case 'package_selection':
        return {
          ...baseData,
          selected_packages: [{ id: 1, name: 'Test Package', quantity: 1, price: '1000.00' }],
        };

      case 'addon_selection':
        return {
          ...baseData,
          selected_addons: [
            { id: 2, name: 'Test Addon 1', quantity: 1, price: '200.00' },
            { id: 3, name: 'Test Addon 2', quantity: 1, price: '150.00' },
          ],
        };

      case 'contact_info':
        return {
          ...baseData,
          full_name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          address: '123 Test Street, Test City, TC 12345',
          create_account: false,
        };

      case 'payment_info':
        return {
          ...baseData,
          payment_option: 'deposit',
          gateway_id: 1,
          payment_method_token: 'test_token_123',
          billing_address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'TC',
            zip: '12345',
            country: 'US',
          },
        };

      case 'confirmation':
        return { ...baseData, terms_accepted: true, marketing_consent: false };

      default:
        return baseData;
    }
  }, []);

  const validateStepData = useCallback(
    (
      step: BookingFlowStep,
      data: Record<string, unknown>,
    ): { isValid: boolean; errors: string[]; warnings: string[] } => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!data || typeof data !== 'object') {
        errors.push('Invalid data format');
        return { isValid: false, errors, warnings };
      }

      switch (step.step_type) {
        case 'date_time':
          if (!data.start_date) {
            errors.push('Start date is required');
          } else {
            const eventDate = new Date(data.start_date as string | number | Date);
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + (flow.min_advance_booking_days || 1));
            if (eventDate < minDate) {
              errors.push(
                `Event date must be at least ${flow.min_advance_booking_days || 1} days in advance`,
              );
            }
          }
          break;

        case 'contact_info':
          if (!data.email) errors.push('Email address is required');
          if (!data.full_name) errors.push('Full name is required');
          break;

        case 'payment_info':
          if (!data.gateway_id) errors.push('Payment gateway is required');
          if (!data.payment_method_token && !data.payment_method_id)
            errors.push('Payment method is required');
          break;

        case 'package_selection':
          if (
            !data.selected_packages ||
            !Array.isArray(data.selected_packages) ||
            data.selected_packages.length === 0
          ) {
            if (step.is_required) {
              errors.push('At least one package must be selected');
            } else {
              warnings.push('No packages selected');
            }
          }
          break;
      }

      if (step.is_required && Object.keys(data).length <= 2) {
        warnings.push('This is a required step but appears to have minimal data');
      }

      return { isValid: errors.length === 0, errors, warnings };
    },
    [flow.min_advance_booking_days],
  );

  const updateStepResult = useCallback((stepId: number, update: Partial<StepTestResult>) => {
    setTestResults((prev) =>
      prev.map((result) => (result.stepId === stepId ? { ...result, ...update } : result)),
    );
  }, []);

  const handleCompleteTest = useCallback(async () => {
    if (!testSession?.bookingSession) return;

    try {
      await new Promise<void>((resolve, reject) => {
        completeBooking(testSession.bookingSession!.id, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });

      setTestSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to complete booking:', error);
      setTestSession((prev) => (prev ? { ...prev, status: 'error' } : null));
      setIsRunning(false);
    }
  }, [testSession, completeBooking]);

  const runAutomatedTest = useCallback(
    async (_session: TestSession, bookingSession: BookingSession) => {
      const delay = testSpeed === 'fast' ? 500 : testSpeed === 'normal' ? 1500 : 3000;

      for (let i = 0; i < enabledSteps.length; i++) {
        const step = enabledSteps[i];

        setTestSession((prev) => (prev ? { ...prev, currentStepIndex: i } : null));
        updateStepResult(step.id, { status: 'testing' });

        await new Promise((resolve) => setTimeout(resolve, delay));

        const testData = generateTestDataForStep(step);
        const validationResult = validateStepData(step, testData);

        if (validationResult.isValid) {
          try {
            const updateData: UpdateBookingSessionData = {
              session_id: bookingSession.session_id,
              step_id: step.id,
              step_data: testData,
              mark_completed: true,
            };

            await new Promise<void>((resolve, reject) => {
              updateSessionData(
                { id: bookingSession.id, data: updateData },
                {
                  onSuccess: () => resolve(),
                  onError: (error) => reject(error),
                },
              );
            });

            updateStepResult(step.id, {
              status: 'passed',
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              testData,
            });

            setTestSession((prev) =>
              prev ? { ...prev, stepData: { ...prev.stepData, [step.id]: testData } } : null,
            );
          } catch (error) {
            console.error('Failed to update session data:', error);
            updateStepResult(step.id, {
              status: 'failed',
              errors: [...validationResult.errors, 'Failed to update session data'],
              warnings: validationResult.warnings,
              testData,
            });

            setTestSession((prev) => (prev ? { ...prev, status: 'error' } : null));
            setIsRunning(false);
            return;
          }
        } else {
          updateStepResult(step.id, {
            status: 'failed',
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            testData,
          });

          setTestSession((prev) => (prev ? { ...prev, status: 'error' } : null));
          setIsRunning(false);
          return;
        }
      }

      // Complete the test — inline instead of calling handleCompleteTest to avoid stale closure
      if (testSession?.bookingSession) {
        try {
          await new Promise<void>((resolve, reject) => {
            completeBooking(testSession.bookingSession!.id, {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            });
          });
          setTestSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
          setIsRunning(false);
        } catch (error) {
          console.error('Failed to complete booking:', error);
          setTestSession((prev) => (prev ? { ...prev, status: 'error' } : null));
          setIsRunning(false);
        }
      }
    },
    [
      enabledSteps,
      testSpeed,
      testSession,
      generateTestDataForStep,
      validateStepData,
      updateStepResult,
      updateSessionData,
      completeBooking,
    ],
  );

  const handleStartTest = useCallback(async () => {
    if (!flow.is_active) {
      alert('Cannot test inactive booking flow. Please activate the flow first.');
      return;
    }

    const newSession: TestSession = {
      sessionId: `test-${Date.now()}`,
      currentStepIndex: 0,
      stepData: {},
      errors: {},
      startedAt: new Date(),
      status: 'running',
    };

    setTestSession(newSession);
    setIsRunning(true);

    const sessionData: CreateBookingSessionData = {
      booking_flow: flow.id,
      ip_address: '127.0.0.1',
      user_agent: 'SessionTester/1.0',
      referrer_url: window.location.href,
    };

    try {
      const bookingSession = await new Promise<BookingSession>((resolve, reject) => {
        createSession(sessionData, {
          onSuccess: (session) => resolve(session),
          onError: (error) => reject(error),
        });
      });

      setTestSession((prev) => (prev ? { ...prev, bookingSession } : null));

      if (testMode === 'automated') {
        runAutomatedTest(newSession, bookingSession);
      }
    } catch (error) {
      console.error('Failed to create test session:', error);
      setTestSession((prev) => (prev ? { ...prev, status: 'error' } : null));
      setIsRunning(false);
    }
  }, [flow, testMode, createSession, runAutomatedTest]);

  const handleStopTest = useCallback(() => {
    if (testSession?.bookingSession) {
      abandonSession({
        id: testSession.bookingSession.id,
        reason: 'Test stopped by user',
      });
    }

    if (testSession) {
      setTestSession((prev) => (prev ? { ...prev, status: 'abandoned' } : null));
      setIsRunning(false);
    }
  }, [testSession, abandonSession]);

  const handleNextStep = useCallback(async () => {
    if (
      !testSession ||
      !testSession.bookingSession ||
      testSession.currentStepIndex >= enabledSteps.length - 1
    )
      return;

    const currentStep = enabledSteps[testSession.currentStepIndex];
    const testData = generateTestDataForStep(currentStep);
    const validationResult = validateStepData(currentStep, testData);

    updateStepResult(currentStep.id, { status: 'testing', testData });

    if (validationResult.isValid) {
      try {
        const updateData: UpdateBookingSessionData = {
          session_id: testSession.bookingSession.session_id,
          step_id: currentStep.id,
          step_data: testData,
          mark_completed: true,
        };

        await new Promise<void>((resolve, reject) => {
          updateSessionData(
            { id: testSession.bookingSession!.id, data: updateData },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            },
          );
        });

        updateStepResult(currentStep.id, {
          status: 'passed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });

        setTestSession((prev) =>
          prev
            ? {
                ...prev,
                currentStepIndex: prev.currentStepIndex + 1,
                stepData: { ...prev.stepData, [currentStep.id]: testData },
              }
            : null,
        );
      } catch (error) {
        console.error('Failed to update session data:', error);
        updateStepResult(currentStep.id, {
          status: 'failed',
          errors: [...validationResult.errors, 'Failed to update session data'],
          warnings: validationResult.warnings,
        });
      }
    } else {
      updateStepResult(currentStep.id, {
        status: 'failed',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }
  }, [
    testSession,
    enabledSteps,
    generateTestDataForStep,
    validateStepData,
    updateStepResult,
    updateSessionData,
  ]);

  const handlePreviousStep = useCallback(() => {
    if (!testSession || testSession.currentStepIndex <= 0) return;

    setTestSession((prev) =>
      prev ? { ...prev, currentStepIndex: prev.currentStepIndex - 1 } : null,
    );
  }, [testSession]);

  const getProgressPercentage = useCallback(() => {
    if (!testSession) return 0;
    return Math.round(((testSession.currentStepIndex + 1) / enabledSteps.length) * 100);
  }, [testSession, enabledSteps.length]);

  return {
    // State
    testSession,
    isRunning,
    testResults,
    testMode,
    testSpeed,
    settingsOpen,
    enabledSteps,

    // Mutation loading states
    isCreatingSession,
    isUpdatingSessionData,
    isCompletingBooking,
    isAbandoningSession,

    // Setters
    setTestMode,
    setTestSpeed,
    setSettingsOpen,

    // Handlers
    handleStartTest,
    handleStopTest,
    handleNextStep,
    handlePreviousStep,
    handleCompleteTest,
    getProgressPercentage,
  };
}
