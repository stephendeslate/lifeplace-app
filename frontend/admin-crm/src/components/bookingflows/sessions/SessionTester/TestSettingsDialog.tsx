// frontend/admin-crm/src/components/bookingflows/sessions/SessionTester/TestSettingsDialog.tsx

import React from 'react';
import {
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { TestMode, TestSpeed } from './types';

interface TestSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  testMode: TestMode;
  testSpeed: TestSpeed;
  isRunning: boolean;
  onTestModeChange: (mode: TestMode) => void;
  onTestSpeedChange: (speed: TestSpeed) => void;
}

export const TestSettingsDialog: React.FC<TestSettingsDialogProps> = ({
  open,
  onClose,
  testMode,
  testSpeed,
  isRunning,
  onTestModeChange,
  onTestSpeedChange,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Test Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Test Mode</InputLabel>
            <Select
              value={testMode}
              label="Test Mode"
              onChange={(e) => onTestModeChange(e.target.value as TestMode)}
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
                onChange={(e) => onTestSpeedChange(e.target.value as TestSpeed)}
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
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
