// frontend/admin-crm/src/components/analytics/alerts/AlertTester.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  PlayArrow as TestIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { AlertRule } from '../../../types/analytics.types';

interface AlertTesterProps {
  open: boolean;
  onClose: () => void;
  alertRule: AlertRule | null;
  onTest: (ruleId: number, sendNotification: boolean) => void;
  isLoading: boolean;
  testResult?: {
    alert_rule: string;
    current_value: number;
    threshold_value: number;
    operator: string;
    threshold_met: boolean;
    test_time: string;
  } | null;
  error?: Error | string;
}

export const AlertTester: React.FC<AlertTesterProps> = ({
  open,
  onClose,
  alertRule,
  onTest,
  isLoading,
  testResult,
  error,
}) => {
  const [sendTestNotification, setSendTestNotification] = useState(false);

  const handleTest = () => {
    if (alertRule) {
      onTest(alertRule.id, sendTestNotification);
    }
  };

  const getOperatorDisplay = (operator: string) => {
    switch (operator) {
      case 'GT': return '>';
      case 'GTE': return '≥';
      case 'LT': return '<';
      case 'LTE': return '≤';
      case 'EQ': return '=';
      case 'NE': return '≠';
      case 'CHANGE_GT': return 'Change >';
      case 'CHANGE_LT': return 'Change <';
      default: return operator;
    }
  };

  if (!alertRule) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <TestIcon />
          Test Alert Rule: {alertRule.name}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* Rule Information */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Rule Configuration
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Metric
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {alertRule.metric_definition_name || 'Unknown Metric'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Condition
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  Value {getOperatorDisplay(alertRule.operator)} {alertRule.threshold_value}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Evaluation Period
                </Typography>
                <Typography variant="body1">
                  {alertRule.evaluation_period}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Notification Methods
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {alertRule.notification_methods.map((method) => (
                    <Chip
                      key={method}
                      label={method.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>

          {/* Test Options */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Test Options
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={sendTestNotification}
                  onChange={(e) => setSendTestNotification(e.target.checked)}
                />
              }
              label="Send test notification if threshold is met"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              When enabled, a real notification will be sent to configured recipients if the alert would trigger
            </Typography>
          </Paper>

          {/* Test Results */}
          {isLoading && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1">
                Testing alert rule...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Evaluating current metric value against threshold
              </Typography>
            </Paper>
          )}

          {error && (
            <Alert severity="error">
              <Typography variant="subtitle2" gutterBottom>
                Test Failed
              </Typography>
              <Typography variant="body2">
                {typeof error === 'string' 
                  ? error 
                  : (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail || (error as { message?: string }).message || 'An error occurred while testing the alert rule'}
              </Typography>
            </Alert>
          )}

          {testResult && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                {testResult.threshold_met ? (
                  <WarningIcon color="warning" />
                ) : (
                  <SuccessIcon color="success" />
                )}
                <Typography variant="h6">
                  Test Results
                </Typography>
              </Box>
              
              <Alert 
                severity={testResult.threshold_met ? 'warning' : 'success'} 
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {testResult.threshold_met ? 'Alert Would Trigger' : 'Alert Would Not Trigger'}
                </Typography>
                <Typography variant="body2">
                  The current metric value {testResult.threshold_met ? 'meets' : 'does not meet'} the configured threshold condition.
                </Typography>
              </Alert>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Value
                  </Typography>
                  <Typography variant="h5" color="primary" fontFamily="monospace">
                    {testResult.current_value}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Threshold Condition
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    Value {getOperatorDisplay(testResult.operator)} {testResult.threshold_value}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Evaluation Result
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {testResult.current_value} {getOperatorDisplay(testResult.operator)} {testResult.threshold_value} = {testResult.threshold_met ? 'TRUE' : 'FALSE'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Test Time
                  </Typography>
                  <Typography variant="body1">
                    {new Date(testResult.test_time).toLocaleString()}
                  </Typography>
                </Box>

                {testResult.threshold_met && sendTestNotification && (
                  <Alert severity="info">
                    <Typography variant="body2">
                      Test notifications have been sent to configured recipients.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </Paper>
          )}

          {/* Instructions */}
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              How Testing Works
            </Typography>
            <Typography variant="body2" component="div">
              • The test evaluates the alert rule using current metric data
              <br />
              • It checks if the current value meets the threshold condition
              <br />
              • No actual alert is recorded or stored
              <br />
              • Test notifications are only sent if explicitly enabled
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
        <Button 
          onClick={handleTest} 
          variant="contained" 
          disabled={isLoading}
          startIcon={<TestIcon />}
        >
          Run Test
        </Button>
      </DialogActions>
    </Dialog>
  );
};