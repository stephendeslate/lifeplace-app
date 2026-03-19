import React from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import DOMPurify from 'dompurify';

interface PreviewSectionProps {
  channel: 'EMAIL' | 'SMS';
  isEditing: boolean;
  isPreviewing: boolean;
  livePreview: { subject: string; body: string };
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
  channel,
  isEditing,
  isPreviewing,
  livePreview,
}) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Live Preview</Typography>
          {isPreviewing && <CircularProgress size={16} />}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {isEditing ? 'Server-rendered preview' : 'Using sample data'}
        </Typography>
      </Box>

      {channel === 'EMAIL' && livePreview.subject && (
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Subject:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2">{livePreview.subject}</Typography>
          </Paper>
        </Box>
      )}

      <Typography variant="subtitle2" gutterBottom>
        {channel === 'SMS' ? 'Message:' : 'Body:'}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          bgcolor: 'background.default',
          minHeight: 100,
          maxHeight: '400px',
          overflow: 'auto',
        }}
      >
        {livePreview.body ? (
          channel === 'EMAIL' ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(livePreview.body),
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {livePreview.body}
            </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            Start typing to see preview...
          </Typography>
        )}
      </Paper>

      {channel === 'SMS' && livePreview.body && (
        <Alert severity={livePreview.body.length > 160 ? 'warning' : 'info'} sx={{ mt: 2 }}>
          <Typography variant="body2">
            Character count: {livePreview.body.length}/160
            {livePreview.body.length > 160 && <span> - Will be sent as multiple SMS parts</span>}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};
