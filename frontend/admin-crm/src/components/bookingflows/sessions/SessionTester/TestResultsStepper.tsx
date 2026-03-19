// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester/TestResultsStepper.tsx

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { StepTestResult, TestSession } from './types';

interface TestResultsStepperProps {
  testResults: StepTestResult[];
  testSession: TestSession | null;
}

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

export const TestResultsStepper: React.FC<TestResultsStepperProps> = ({
  testResults,
  testSession,
}) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Test Results ({testResults.filter((r) => r.status === 'passed').length}/
          {testResults.length} passed)
        </Typography>

        <Stepper orientation="vertical" nonLinear>
          {testResults.map((result, index) => {
            const isActive = testSession?.currentStepIndex === index;

            return (
              <Step key={result.stepId} expanded={isActive}>
                <StepLabel icon={getStepIcon(result)} error={result.status === 'failed'}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight={isActive ? 'bold' : 'normal'}>
                      {result.stepName}
                    </Typography>
                    <Chip label={result.stepType} size="small" variant="outlined" color="primary" />
                  </Box>
                </StepLabel>

                <StepContent>
                  <Box sx={{ pb: 2 }}>
                    {result.errors.length > 0 && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Validation Errors:
                        </Typography>
                        {result.errors.map((error, idx) => (
                          <Typography key={idx} variant="body2">
                            - {error}
                          </Typography>
                        ))}
                      </Alert>
                    )}

                    {result.warnings.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Warnings:
                        </Typography>
                        {result.warnings.map((warning, idx) => (
                          <Typography key={idx} variant="body2">
                            - {warning}
                          </Typography>
                        ))}
                      </Alert>
                    )}

                    {Object.keys(result.testData).length > 0 && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'grey.50',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Test Data:
                        </Typography>
                        <pre
                          style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                          }}
                        >
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
    </Box>
  );
};
