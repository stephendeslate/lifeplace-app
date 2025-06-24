// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Refresh as RefreshIcon,
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
  BookingSession,
  BookingFlowStep 
} from '../../../types/bookingflows.types';
import { useBookingSessions } from '../../../hooks/useBookingFlows';

interface SessionTesterProps {
  flow: BookingFlowDetail;
  onClose?: () => void;
}

interface TestSession {
  id: string;
  currentStepIndex: number;
  stepData: Record<number, any>;
  errors: Record<number, string[]>;
  startedAt: Date;
  status: 'running' | 'completed' | 'abandoned' | 'error';
}

interface StepTestResult {
  stepId: number;
  stepName: string;
  status: 'pending' | 'testing' | 'passed' | 'failed' | 'skipped';
  errors: string[];
  warnings: string[];
  testData: any;
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
  } = useBookingSessions();

  // Get enabled steps only
  const enabledSteps = flow.steps?.filter(step => step.is_enabled).sort((a, b) => a.order - b.order) || [];

  useEffect(() => {
    // Initialize test results
    setTestResults(enabledSteps.map(step => ({
      stepId: step.id,
      stepName: step.name,
      status: 'pending',
      errors: [],
      warnings: [],
      testData: {},
    })));
  }, [enabledSteps]);

  const handleStartTest = () => {
    if (!flow.is_active) {
      alert('Cannot test inactive booking flow. Please activate the flow first.');
      return;
    }

    const newSession: TestSession = {
      id: `test-${Date.now()}`,
      currentStepIndex: 0,
      stepData: {},
      errors: {},
      startedAt: new Date(),
      status: 'running',
    };

    setTestSession(newSession);
    setIsRunning(true);

    // Create actual booking session for testing
    createSession({
      booking_flow: flow.id,
      ip_address: '127.0.0.1',
      user_agent: 'SessionTester/1.0',
      referrer_url: window.location.href,
    });

    if (testMode === 'automated') {
      runAutomatedTest(newSession);
    }
  };

  const handleStopTest = () => {
    if (testSession) {
      setTestSession(prev => prev ? { ...prev, status: 'abandoned' } : null);
      setIsRunning(false);
    }
  };

  const handleNextStep = () => {
    if (!testSession || testSession.currentStepIndex >= enabledSteps.length - 1) return;

    const currentStep = enabledSteps[testSession.currentStepIndex];
    const testData = generateTestDataForStep(currentStep);
    
    // Validate current step
    const validationResult = validateStepData(currentStep, testData);
    
    setTestResults(prev => prev.map(result => 
      result.stepId === currentStep.id 
        ? {
            ...result,
            status: validationResult.isValid ? 'passed' : 'failed',
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            testData,
          }
        : result
    ));

    if (validationResult.isValid) {
      setTestSession(prev => prev ? {
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        stepData: { ...prev.stepData, [currentStep.id]: testData },
      } : null);
    }
  };

  const handlePreviousStep = () => {
    if (!testSession || testSession.currentStepIndex <= 0) return;

    setTestSession(prev => prev ? {
      ...prev,
      currentStepIndex: prev.currentStepIndex - 1,
    } : null);
  };

  const handleCompleteTest = () => {
    if (!testSession) return;

    setTestSession(prev => prev ? { ...prev, status: 'completed' } : null);
    setIsRunning(false);
    
    // Mark session as completed
    // completeBooking would be called here in real implementation
  };

  const runAutomatedTest = async (session: TestSession) => {
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
      
      // Update test results
      setTestResults(prev => prev.map(result => 
        result.stepId === step.id 
          ? {
              ...result,
              status: validationResult.isValid ? 'passed' : 'failed',
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              testData,
            }
          : result
      ));

      // If validation fails, stop automated test
      if (!validationResult.isValid) {
        setTestSession(prev => prev ? { ...prev, status: 'error' } : null);
        setIsRunning(false);
        return;
      }

      // Update session data
      setTestSession(prev => prev ? {
        ...prev,
        stepData: { ...prev.stepData, [step.id]: testData },
      } : null);
    }

    // Complete the test
    handleCompleteTest();
  };

  const generateTestDataForStep = (step: BookingFlowStep): any => {
    const baseData = {
      step_id: step.id,
      timestamp: new Date().toISOString(),
    };

    switch (step.step_type) {
      case 'introduction':
        return { ...baseData, acknowledged: true };
      
      case 'event_details':
        return {
          ...baseData,
          event_name: 'Test Event',
          description: 'This is a test event for validation purposes',
          guest_count: 50,
          venue_preference: 'Indoor venue with parking',
        };
      
      case 'date_time':
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 30); // 30 days from now
        return {
          ...baseData,
          event_date: eventDate.toISOString().split('T')[0],
          start_time: '14:00',
          end_time: '18:00',
          duration: 4,
        };
      
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
          selected_packages: [1], // Would use actual package IDs
          package_customizations: {},
        };
      
      case 'addon_selection':
        return {
          ...baseData,
          selected_addons: [2, 3], // Would use actual addon IDs
          addon_notes: 'Test addon selections',
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
          payment_method: 'credit_card',
          billing_address: 'Same as contact address',
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

  const validateStepData = (step: BookingFlowStep, data: any): {
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

    // Step-specific validation
    switch (step.step_type) {
      case 'event_details':
        if (step.configuration?.require_event_name && !data.event_name) {
          errors.push('Event name is required');
        }
        if (step.configuration?.require_guest_count && (!data.guest_count || data.guest_count < 1)) {
          errors.push('Valid guest count is required');
        }
        break;
      
      case 'date_time':
        if (!data.event_date) {
          errors.push('Event date is required');
        } else {
          const eventDate = new Date(data.event_date);
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + (flow.min_advance_booking_days || 1));
          
          if (eventDate < minDate) {
            errors.push(`Event date must be at least ${flow.min_advance_booking_days || 1} days in advance`);
          }
        }
        break;
      
      case 'contact_info':
        if (step.configuration?.require_email && !data.email) {
          errors.push('Email address is required');
        }
        if (step.configuration?.require_phone && !data.phone) {
          errors.push('Phone number is required');
        }
        break;
      
      case 'payment_info':
        if (!data.payment_option || !data.payment_method) {
          errors.push('Payment option and method are required');
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

  const getCurrentStep = () => {
    if (!testSession || !enabledSteps[testSession.currentStepIndex]) return null;
    return enabledSteps[testSession.currentStepIndex];
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
      <Card sx={{ mb: 3 }}>
        <CardContent>
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
                  >
                    Stop Test
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
                          Next Step
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CompleteIcon />}
                          onClick={handleCompleteTest}
                          size="small"
                        >
                          Complete
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
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Test Results ({testResults.filter(r => r.status === 'passed').length}/{testResults.length} passed)
          </Typography>
          
          <Stepper orientation="vertical" nonLinear>
            {testResults.map((result, index) => {
              const step = enabledSteps.find(s => s.id === result.stepId);
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
                        label={step?.step_type_display}
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
        </CardContent>
      </Card>

      {/* Test Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Settings</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};