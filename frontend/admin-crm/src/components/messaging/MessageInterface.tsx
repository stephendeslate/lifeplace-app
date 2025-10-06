import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
} from '@mui/icons-material';

// Local types (simplified for integration)
interface MessageThreadListItem {
  id: string;
  subject: string;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessageInterfaceProps {
  clientId?: string;
  eventId?: string;
  className?: string;
}

export const MessageInterface: React.FC<MessageInterfaceProps> = ({
  clientId,
  eventId,
  className,
}) => {
  const [_selectedThread, _setSelectedThread] = useState<string | null>(null);

  // For now, using placeholder data until shared hooks are verified working
  const threads: MessageThreadListItem[] = [];
  const isLoading = false;
  const error = null;

  return (
    <Box
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <MessageIcon color="primary" />
        <Typography variant="h6" component="h1">
          Messages
        </Typography>
        {(clientId || eventId) && (
          <Typography variant="body2" color="text.secondary">
            {clientId && `Client: ${clientId}`}
            {eventId && `Event: ${eventId}`}
          </Typography>
        )}
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Thread List */}
        <Paper
          sx={{
            width: 320,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1">Threads</Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              fullWidth
            >
              New Thread
            </Button>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {isLoading && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Loading threads...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ m: 2 }}>
                Error loading threads
              </Alert>
            )}

            {!isLoading && !error && threads.length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No messages yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Start a conversation with your team
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {_selectedThread ? (
            <>
              {/* Messages Area */}
              <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
                <Typography variant="body2" color="text.secondary">
                  Select a thread to view messages
                </Typography>
              </Box>

              {/* Message Input */}
              <Divider />
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Message input area
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    endIcon={<SendIcon />}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                p: 4,
              }}
            >
              <Box>
                <MessageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select a conversation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a thread from the sidebar to start messaging
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};