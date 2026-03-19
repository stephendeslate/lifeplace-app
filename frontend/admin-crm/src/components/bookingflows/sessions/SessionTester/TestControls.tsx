// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester/TestControls.tsx

import React from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import {
  PlayArrow as StartIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Stop as StopIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import type { TestSession, TestMode } from './types';

interface TestControlsProps {
  testSession: TestSession | null;
  isRunning: boolean;
  testMode: TestMode;
  enabledStepsCount: number;
  isCreatingSession: boolean;
  isUpdatingSessionData: boolean;
  isCompletingBooking: boolean;
  isAbandoningSession: boolean;
  progressPercentage: number;
  onStart: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
}

export const TestControls: React.FC<TestControlsProps> = ({
  testSession,
  isRunning,
  testMode,
  enabledStepsCount,
  isCreatingSession,
  isUpdatingSessionData,
  isCompletingBooking,
  isAbandoningSession,
  progressPercentage,
  onStart,
  onStop,
  onNext,
  onPrevious,
  onComplete,
}) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', mb: 3 }}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1">Test Controls</Typography>

          <Box display="flex" gap={1}>
            {!isRunning ? (
              <Button
                variant="contained"
                startIcon={<StartIcon />}
                onClick={onStart}
                disabled={enabledStepsCount === 0 || isCreatingSession}
              >
                {isCreatingSession ? 'Starting...' : 'Start Test'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={onStop}
                  color="error"
                  disabled={isAbandoningSession}
                >
                  {isAbandoningSession ? 'Stopping...' : 'Stop Test'}
                </Button>

                {testMode === 'manual' && testSession && (
                  <>
                    <Button
                      startIcon={<BackIcon />}
                      onClick={onPrevious}
                      disabled={testSession.currentStepIndex === 0}
                      size="small"
                    >
                      Previous
                    </Button>

                    {testSession.currentStepIndex < enabledStepsCount - 1 ? (
                      <Button
                        variant="contained"
                        endIcon={<NextIcon />}
                        onClick={onNext}
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
                        onClick={onComplete}
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

        {testSession && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Step {testSession.currentStepIndex + 1} of {enabledStepsCount}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {progressPercentage}% Complete
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};
