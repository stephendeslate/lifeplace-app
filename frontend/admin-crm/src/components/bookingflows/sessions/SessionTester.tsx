// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
// Modern Design System imports
import { ModernCard, ModernDialog, createStandardActions } from '../../common';
import {
  PlayArrow as StartIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Stop as StopIcon,
  BugReport as TestIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Settings as ConfigIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowDetail, 
  BookingFlowStep,
  BookingSession,
  CreateBookingSessionData,
  UpdateBookingSessionData
} from '../../../types/bookingflows.types';
import { useBookingSessions } from '../../../hooks/useBookingFlows';

interface SessionTesterProps {
  flow: BookingFlowDetail;
  onClose?: () => void;
}

interface TestSession {
  sessionId: string;
  currentStepIndex: number;
  stepData: Record<number, Record<string, unknown>>;
  errors: Record<number, string[]>;
  startedAt: Date;
  status: 'running' | 'completed' | 'abandoned' | 'error';
  bookingSession?: BookingSession;
}

interface StepTestResult {
  stepId: number;
  stepName: string;
  stepType: string;
  status: 'pending' | 'testing' | 'passed' | 'failed' | 'skipped';
  errors: string[];
  warnings: string[];
  testData: Record<string, unknown>;
  duration?: number;
}

export const SessionTester: React.FC<SessionTesterProps> = ({
  flow,
  onClose,
}) => {
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<StepTestResult[]>([]);
  const [testMode, setTestMode] = useState<'manual' | 'automated'>('manual');
  const [testSpeed, setTestSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
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

  // Get enabled steps only
  const enabledSteps = useMemo(() => 
    flow.steps?.filter(step => step.is_enabled).sort((a, b) => a.order - b.order) || [],
    [flow.steps]
  );

  useEffect(() => {
    // Initialize test results
    setTestResults(enabledSteps.map(step => ({
      stepId: step.id,
      stepName: step.name,
      stepType: step.step_type_display,
      status: 'pending',
      errors: [],
      warnings: [],
      testData: {},
    })));
  }, [enabledSteps]);

  const handleStartTest = async () => {
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

    // Create actual booking session for testing
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

      setTestSession(prev => prev ? { ...prev, bookingSession } : null);

      if (testMode === 'automated') {
        runAutomatedTest(newSession, bookingSession);
      }
    } catch (error) {
      console.error('Failed to create test session:', error);
      setTestSession(prev => prev ? { ...prev, status: 'error' } : null);
      setIsRunning(false);
    }
  };

  const handleStopTest = () => {
    if (testSession?.bookingSession) {
      abandonSession({ 
        id: testSession.bookingSession.id, 
        reason: 'Test stopped by user' 
      });
    }
    
    if (testSession) {
      setTestSession(prev => prev ? { ...prev, status: 'abandoned' } : null);
      setIsRunning(false);
    }
  };

  const handleNextStep = async () => {
    if (!testSession || !testSession.bookingSession || testSession.currentStepIndex >= enabledSteps.length - 1) return;

    const currentStep = enabledSteps[testSession.currentStepIndex];
    const testData = generateTestDataForStep(currentStep);
    
    // Validate current step
    const validationResult = validateStepData(currentStep, testData);
    
    setTestResults(prev => prev.map(result => 
      result.stepId === currentStep.id 
        ? {
            ...result,
            status: 'testing',
            testData,
          }
        : result
    ));

    if (validationResult.isValid) {
      try {
        const updateData: UpdateBookingSessionData = {
          session_id: testSession.bookingSession.session_id,
          step_id: currentStep.id,
          step_data: testData,
          mark_completed: true,
        };

        await new Promise<void>((resolve, reject) => {
          updateSessionData({ id: testSession.bookingSession!.id, data: updateData }, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          });
        });

        // Mark step as passed
        setTestResults(prev => prev.map(result => 
          result.stepId === currentStep.id 
            ? {
                ...result,
                status: 'passed',
                errors: validationResult.errors,
                warnings: validationResult.warnings,
              }
            : result
        ));

        // Move to next step
        setTestSession(prev => prev ? {
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1,
          stepData: { ...prev.stepData, [currentStep.id]: testData },
        } : null);

      } catch (error) {
        console.error('Failed to update session data:', error);
        setTestResults(prev => prev.map(result => 
          result.stepId === currentStep.id 
            ? {
                ...result,
                status: 'failed',
                errors: [...validationResult.errors, 'Failed to update session data'],
                warnings: validationResult.warnings,
              }
            : result
        ));
      }
    } else {
      setTestResults(prev => prev.map(result => 
        result.stepId === currentStep.id 
          ? {
              ...result,
              status: 'failed',
              errors: validationResult.errors,
              warnings: validationResult.warnings,
            }
          : result
      ));
    }
  };

  const handlePreviousStep = () => {
    if (!testSession || testSession.currentStepIndex <= 0) return;

    setTestSession(prev => prev ? {
      ...prev,
      currentStepIndex: prev.currentStepIndex - 1,
    } : null);
  };

  const handleCompleteTest = async () => {
    if (!testSession?.bookingSession) return;

    try {
      await new Promise<void>((resolve, reject) => {
        completeBooking(testSession.bookingSession!.id, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });

      setTestSession(prev => prev ? { ...prev, status: 'completed' } : null);
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to complete booking:', error);
      setTestSession(prev => prev ? { ...prev, status: 'error' } : null);
      setIsRunning(false);
    }
  };

  // @ts-expect-error - Legacy code requiring type fix
  const runAutomatedTest = async (session: TestSession, bookingSession: BookingSession) => {
    const delay = testSpeed === 'fast' ? 500 : testSpeed === 'normal' ? 1500 : 3000;

    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      
      // Update current step
      setTestSession(prev => prev ? { ...prev, currentStepIndex: i } : null);
      
      // Mark step as testing
      setTestResults(prev => prev.map(result => 
        result.stepId === step.id ? { ...result, status: 'testing' } : result
      ));

      await new Promise(resolve => setTimeout(resolve, delay));

      // Generate and validate test data
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
            updateSessionData({ id: bookingSession.id, data: updateData }, {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            });
          });

          // Update test results
          setTestResults(prev => prev.map(result => 
            result.stepId === step.id 
              ? {
                  ...result,
                  status: 'passed',
                  errors: validationResult.errors,
                  warnings: validationResult.warnings,
                  testData,
                }
              : result
          ));

          // Update session data
          setTestSession(prev => prev ? {
            ...prev,
            stepData: { ...prev.stepData, [step.id]: testData },
          } : null);

        } catch (error) {
          console.error('Failed to update session data:', error);
          setTestResults(prev => prev.map(result => 
            result.stepId === step.id 
              ? {
                  ...result,
                  status: 'failed',
                  errors: [...validationResult.errors, 'Failed to update session data'],
                  warnings: validationResult.warnings,
                  testData,
                }
              : result
          ));
          
          setTestSession(prev => prev ? { ...prev, status: 'error' } : null);
          setIsRunning(false);
          return;
        }
      } else {
        // Update test results with validation errors
        setTestResults(prev => prev.map(result => 
          result.stepId === step.id 
            ? {
                ...result,
                status: 'failed',
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                testData,
              }
            : result
        ));

        setTestSession(prev => prev ? { ...prev, status: 'error' } : null);
        setIsRunning(false);
        return;
      }
    }

    // Complete the test
    await handleCompleteTest();
  };

  const generateTestDataForStep = (step: BookingFlowStep): Record<string, unknown> => {
    const baseData = {
      step_id: step.id,
      timestamp: new Date().toISOString(),
    };

    switch (step.step_type) {
      case 'introduction':
        return { ...baseData, acknowledged: true };
      
      case 'date_time': {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 30); // 30 days from now
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
            'dietary_restrictions': 'None',
            'special_requests': 'Test special request',
            'music_preference': 'Background music',
          },
        };
      
      case 'package_selection':
        return {
          ...baseData,
          selected_packages: [
            {
              id: 1,
              name: 'Test Package',
              quantity: 1,
              price: '1000.00',
            }
          ],
        };
      
      case 'addon_selection':
        return {
          ...baseData,
          selected_addons: [
            {
              id: 2,
              name: 'Test Addon 1',
              quantity: 1,
              price: '200.00',
            },
            {
              id: 3,
              name: 'Test Addon 2',
              quantity: 1,
              price: '150.00',
            }
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
          gateway_id: 1, // Test gateway ID
          payment_method_token: 'test_token_123',
          billing_address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'TC',
            zip: '12345',
            country: 'US',
          },
        };
      
      case 'review_booking':
        return {
          ...baseData,
          booking_reviewed: true,
          changes_requested: false,
        };
      
      case 'confirmation':
        return {
          ...baseData,
          terms_accepted: true,
          marketing_consent: false,
        };
      
      default:
        return baseData;
    }
  };

  const validateStepData = (step: BookingFlowStep, data: Record<string, unknown>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { isValid: false, errors, warnings };
    }

    // Step-specific validation based on actual step types from backend
    switch (step.step_type) {
      case 'date_time':
        if (!data.start_date) {
          errors.push('Start date is required');
        } else {
          const eventDate = new Date(data.start_date);
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + (flow.min_advance_booking_days || 1));
          
          if (eventDate < minDate) {
            errors.push(`Event date must be at least ${flow.min_advance_booking_days || 1} days in advance`);
          }
        }
        break;
      
      case 'contact_info':
        if (!data.email) {
          errors.push('Email address is required');
        }
        if (!data.full_name) {
          errors.push('Full name is required');
        }
        break;
      
      case 'payment_info':
        if (!data.gateway_id) {
          errors.push('Payment gateway is required');
        }
        if (!data.payment_method_token && !data.payment_method_id) {
          errors.push('Payment method is required');
        }
        break;
      
      case 'package_selection':
        if (!data.selected_packages || !Array.isArray(data.selected_packages) || data.selected_packages.length === 0) {
          if (step.is_required) {
            errors.push('At least one package must be selected');
          } else {
            warnings.push('No packages selected');
          }
        }
        break;
    }

    // Check for required fields based on step configuration
    if (step.is_required && Object.keys(data).length <= 2) { // Only step_id and timestamp
      warnings.push('This is a required step but appears to have minimal data');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const getStepIcon = (result: StepTestResult) => {
    switch (result.status) {
      case 'testing':
        return <CircularProgress size={20} />;
      case 'passed':
        return <CompleteIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'skipped':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    if (!testSession) return 0;
    return Math.round(((testSession.currentStepIndex + 1) / enabledSteps.length) * 100);
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <TestIcon color="primary" />
          <Typography variant="h6">
            Test Booking Flow: {flow.name}
          </Typography>
          {testSession && (
            <Chip
              label={testSession.status}
              size="small"
              color={
                testSession.status === 'completed' ? 'success' :
                testSession.status === 'error' ? 'error' :
                testSession.status === 'abandoned' ? 'warning' : 'primary'
              }
            />
          )}
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Test Settings">
            <IconButton onClick={() => setSettingsOpen(true)} size="small">
              <ConfigIcon />
            </IconButton>
          </Tooltip>
          
          {onClose && (
            <Tooltip title="Close Tester">
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Flow Status */}
      {!flow.is_active && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This booking flow is currently inactive. Testing may not reflect the actual client experience.
        </Alert>
      )}

      {enabledSteps.length === 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          No enabled steps found in this booking flow. Please configure and enable at least one step before testing.
        </Alert>
      )}

      {/* Test Controls */}
      <ModernCard variant="glass" size="medium" animation="none" sx={{ mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">Test Controls</Typography>
            
            <Box display="flex" gap={1}>
              {!isRunning ? (
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={handleStartTest}
                  disabled={enabledSteps.length === 0 || isCreatingSession}
                >
                  {isCreatingSession ? 'Starting...' : 'Start Test'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<StopIcon />}
                    onClick={handleStopTest}
                    color="error"
                    disabled={isAbandoningSession}
                  >
                    {isAbandoningSession ? 'Stopping...' : 'Stop Test'}
                  </Button>
                  
                  {testMode === 'manual' && testSession && (
                    <>
                      <Button
                        startIcon={<BackIcon />}
                        onClick={handlePreviousStep}
                        disabled={testSession.currentStepIndex === 0}
                        size="small"
                      >
                        Previous
                      </Button>
                      
                      {testSession.currentStepIndex < enabledSteps.length - 1 ? (
                        <Button
                          variant="contained"
                          endIcon={<NextIcon />}
                          onClick={handleNextStep}
                          disabled={isUpdatingSessionData}
                          size="small"
                        >
                          {isUpdatingSessionData ? 'Processing...' : 'Next Step'}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CompleteIcon />}
                          onClick={handleCompleteTest}
                          disabled={isCompletingBooking}
                          size="small"
                        >
                          {isCompletingBooking ? 'Completing...' : 'Complete'}
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </Box>
          </Box>

          {/* Progress */}
          {testSession && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Step {testSession.currentStepIndex + 1} of {enabledSteps.length}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {getProgressPercentage()}% Complete
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getProgressPercentage()}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </Box>
      </ModernCard>

      {/* Test Results */}
      <ModernCard variant="glass" size="medium" animation="none">
        <Box sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Test Results ({testResults.filter(r => r.status === 'passed').length}/{testResults.length} passed)
          </Typography>
          
          <Stepper orientation="vertical" nonLinear>
            {testResults.map((result, index) => {
              const isActive = testSession?.currentStepIndex === index;
              
              return (
                <Step key={result.stepId} expanded={isActive}>
                  <StepLabel
                    icon={getStepIcon(result)}
                    error={result.status === 'failed'}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={isActive ? 'bold' : 'normal'}>
                        {result.stepName}
                      </Typography>
                      <Chip
                        label={result.stepType}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  </StepLabel>
                  
                  <StepContent>
                    <Box sx={{ pb: 2 }}>
                      {/* Errors */}
                      {result.errors.length > 0 && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Validation Errors:
                          </Typography>
                          {result.errors.map((error, idx) => (
                            <Typography key={idx} variant="body2">
                              • {error}
                            </Typography>
                          ))}
                        </Alert>
                      )}
                      
                      {/* Warnings */}
                      {result.warnings.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Warnings:
                          </Typography>
                          {result.warnings.map((warning, idx) => (
                            <Typography key={idx} variant="body2">
                              • {warning}
                            </Typography>
                          ))}
                        </Alert>
                      )}
                      
                      {/* Test Data Preview */}
                      {Object.keys(result.testData).length > 0 && (
                        <Box 
                          sx={{ 
                            mt: 1, 
                            p: 1.5, 
                            border: 1, 
                            borderColor: 'divider', 
                            borderRadius: 1,
                            backgroundColor: 'grey.50'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Test Data:
                          </Typography>
                          <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto' }}>
                            {JSON.stringify(result.testData, null, 2)}
                          </pre>
                        </Box>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </Box>
      </ModernCard>

      {/* Test Settings Dialog */}
      <ModernDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Test Settings"
        maxWidth="sm"
        actions={createStandardActions.close(() => setSettingsOpen(false))}
      >
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Test Mode</InputLabel>
            <Select
              value={testMode}
              label="Test Mode"
              onChange={(e) => setTestMode(e.target.value as 'manual' | 'automated')}
              disabled={isRunning}
            >
              <MenuItem value="manual">Manual - Step through each step manually</MenuItem>
              <MenuItem value="automated">Automated - Run through all steps automatically</MenuItem>
            </Select>
          </FormControl>

          {testMode === 'automated' && (
            <FormControl fullWidth>
              <InputLabel>Test Speed</InputLabel>
              <Select
                value={testSpeed}
                label="Test Speed"
                onChange={(e) => setTestSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                disabled={isRunning}
              >
                <MenuItem value="slow">Slow (3s per step)</MenuItem>
                <MenuItem value="normal">Normal (1.5s per step)</MenuItem>
                <MenuItem value="fast">Fast (0.5s per step)</MenuItem>
              </Select>
            </FormControl>
          )}
        </Stack>
      </ModernDialog>
    </Box>
  );
};