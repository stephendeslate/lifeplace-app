import React from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Send as SendTestIcon } from '@mui/icons-material';
interface SendTestSectionProps {
  channel: 'EMAIL' | 'SMS';
  isSendingTest: boolean;
  testRecipient: string;
  showTestSend: boolean;
  onTestRecipientChange: (value: string) => void;
  onShowTestSend: (show: boolean) => void;
  onSendTest: () => void;
}

export const SendTestSection: React.FC<SendTestSectionProps> = ({
  channel,
  isSendingTest,
  testRecipient,
  showTestSend,
  onTestRecipientChange,
  onShowTestSend,
  onSendTest,
}) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Send Test</Typography>
        {!showTestSend && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<SendTestIcon />}
            onClick={() => onShowTestSend(true)}
          >
            Send Test {channel === 'EMAIL' ? 'Email' : 'SMS'}
          </Button>
        )}
      </Box>
      {showTestSend && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Send a real {channel === 'EMAIL' ? 'email' : 'SMS'} using this template with sample data
            to verify delivery and rendering.
          </Typography>
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              label={channel === 'EMAIL' ? 'Recipient Email' : 'Recipient Phone'}
              value={testRecipient}
              onChange={(e) => onTestRecipientChange(e.target.value)}
              placeholder={channel === 'EMAIL' ? 'test@example.com' : '+1234567890'}
              size="small"
              sx={{ flex: 1 }}
              type={channel === 'EMAIL' ? 'email' : 'tel'}
            />
            <Button
              variant="contained"
              startIcon={
                isSendingTest ? <CircularProgress size={16} color="inherit" /> : <SendTestIcon />
              }
              onClick={onSendTest}
              disabled={!testRecipient.trim() || isSendingTest}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {isSendingTest ? 'Sending...' : 'Send Test'}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                onShowTestSend(false);
                onTestRecipientChange('');
              }}
            >
              Cancel
            </Button>
          </Box>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <Typography variant="caption">
              Test sends use sample data for template variables and bypass preference checks.
            </Typography>
          </Alert>
        </Stack>
      )}
    </Box>
  );
};
