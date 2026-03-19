// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester/SessionTester.tsx

import React from 'react';
import { Box, Typography, Alert, Chip, IconButton, Tooltip } from '@mui/material';
import {
  BugReport as TestIcon,
  Close as CloseIcon,
  Settings as ConfigIcon,
} from '@mui/icons-material';
import type { SessionTesterProps } from './types';
import { useSessionTesterLogic } from './useSessionTesterLogic';
import { TestControls } from './TestControls';
import { TestResultsStepper } from './TestResultsStepper';
import { TestSettingsDialog } from './TestSettingsDialog';

export const SessionTester: React.FC<SessionTesterProps> = ({ flow, onClose }) => {
  const {
    testSession,
    isRunning,
    testResults,
    testMode,
    testSpeed,
    settingsOpen,
    enabledSteps,
    isCreatingSession,
    isUpdatingSessionData,
    isCompletingBooking,
    isAbandoningSession,
    setTestMode,
    setTestSpeed,
    setSettingsOpen,
    handleStartTest,
    handleStopTest,
    handleNextStep,
    handlePreviousStep,
    handleCompleteTest,
    getProgressPercentage,
  } = useSessionTesterLogic(flow);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <TestIcon color="primary" />
          <Typography variant="h6">Test Booking Flow: {flow.name}</Typography>
          {testSession && (
            <Chip
              label={testSession.status}
              size="small"
              color={
                testSession.status === 'completed'
                  ? 'success'
                  : testSession.status === 'error'
                    ? 'error'
                    : testSession.status === 'abandoned'
                      ? 'warning'
                      : 'primary'
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

      {/* Flow Status Alerts */}
      {!flow.is_active && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This booking flow is currently inactive. Testing may not reflect the actual client
          experience.
        </Alert>
      )}

      {enabledSteps.length === 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          No enabled steps found in this booking flow. Please configure and enable at least one step
          before testing.
        </Alert>
      )}

      {/* Test Controls */}
      <TestControls
        testSession={testSession}
        isRunning={isRunning}
        testMode={testMode}
        enabledStepsCount={enabledSteps.length}
        isCreatingSession={isCreatingSession}
        isUpdatingSessionData={isUpdatingSessionData}
        isCompletingBooking={isCompletingBooking}
        isAbandoningSession={isAbandoningSession}
        progressPercentage={getProgressPercentage()}
        onStart={handleStartTest}
        onStop={handleStopTest}
        onNext={handleNextStep}
        onPrevious={handlePreviousStep}
        onComplete={handleCompleteTest}
      />

      {/* Test Results */}
      <TestResultsStepper testResults={testResults} testSession={testSession} />

      {/* Test Settings Dialog */}
      <TestSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        testMode={testMode}
        testSpeed={testSpeed}
        isRunning={isRunning}
        onTestModeChange={setTestMode}
        onTestSpeedChange={setTestSpeed}
      />
    </Box>
  );
};
