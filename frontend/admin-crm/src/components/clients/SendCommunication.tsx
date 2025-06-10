// frontend/admin-crm/src/components/clients/SendCommunication.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import {
  Send as SendIcon,
  Preview as PreviewIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import type { Client, SendCommunicationData } from '../../types/clients.types';

interface SendCommunicationProps {
  client: Client;
  open: boolean;
  onClose: () => void;
}

export const SendCommunication: React.FC<SendCommunicationProps> = ({
  client,
  open,
  onClose,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [customRecipient, setCustomRecipient] = useState('');
  const [useCustomRecipient, setUseCustomRecipient] = useState(false);
  const [contextData, setContextData] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ subject?: string; body: string } | null>(null);

  const {
    useTemplates,
    useSendManual,
    usePreviewTemplate,
  } = useCommunications();

  const { data: templates = [], isLoading: templatesLoading } = useTemplates({
    category: 'MANUAL' // Only show manual templates for sending
  });

  const { mutate: sendCommunication, isPending: isSending } = useSendManual();
  // @ts-ignore
  const { mutate: previewTemplate, isPending: isPreviewing } = usePreviewTemplate();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Initialize context data when client or template changes
  useEffect(() => {
    if (client) {
      setContextData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        company: client.profile?.company || '',
        phone: client.profile?.phone || '',
        site_name: 'LifePlace',
        current_date: new Date().toLocaleDateString(),
        support_email: 'support@lifeplace.com',
      });
    }
  }, [client]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedTemplateId('');
      setCustomRecipient('');
      setUseCustomRecipient(false);
      setPreviewData(null);
    }
  }, [open]);

  const handleContextDataChange = (key: string, value: string) => {
    setContextData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePreview = () => {
    if (!selectedTemplateId) return;
    return
  };

  const handleSend = () => {
    if (!selectedTemplateId) return;

    const recipient = useCustomRecipient ? customRecipient : client.email;
    
    const sendData: SendCommunicationData = {
      template_id: selectedTemplateId as number,
      recipient,
      client_id: client.id,
      context_data: contextData,
    };

    sendCommunication(sendData, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon /> : <SmsIcon />;
  };

  const getRecipientLabel = () => {
    if (!selectedTemplate) return '';
    return selectedTemplate.channel === 'EMAIL' ? 'Email Address' : 'Phone Number';
  };

  const getRecipientPlaceholder = () => {
    if (!selectedTemplate) return '';
    return selectedTemplate.channel === 'EMAIL' ? 'client@example.com' : '+1234567890';
  };

  const isFormValid = () => {
    if (!selectedTemplateId) return false;
    if (useCustomRecipient && !customRecipient.trim()) return false;
    return true;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <SendIcon color="primary" />
            Send Communication to {client.first_name} {client.last_name}
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Template Selection */}
            <FormControl fullWidth>
              <InputLabel>Select Template</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Select Template"
                onChange={(e) => setSelectedTemplateId(e.target.value as number)}
                disabled={templatesLoading}
              >
                {templatesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading templates...
                  </MenuItem>
                ) : (
                  templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      <Box display="flex" alignItems="center" gap={1} width="100%">
                        {getChannelIcon(template.channel)}
                        <Typography variant="body2">{template.name}</Typography>
                        <Chip 
                          label={template.channel} 
                          size="small" 
                          sx={{ ml: 'auto' }} 
                        />
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* Recipient Selection */}
            {selectedTemplate && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recipient
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Default: {client.first_name} {client.last_name}
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {selectedTemplate.channel === 'EMAIL' ? client.email : client.profile?.phone || 'No phone number'}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setUseCustomRecipient(!useCustomRecipient)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {useCustomRecipient ? 'Use Default' : 'Use Custom Recipient'}
                    </Button>

                    {useCustomRecipient && (
                      <TextField
                        label={getRecipientLabel()}
                        value={customRecipient}
                        onChange={(e) => setCustomRecipient(e.target.value)}
                        placeholder={getRecipientPlaceholder()}
                        fullWidth
                        size="small"
                      />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Context Variables */}
            {selectedTemplate && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Message Variables
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Customize the data that will be used in your message template.
                  </Typography>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {Object.entries(contextData).map(([key, value]) => (
                      <TextField
                        key={key}
                        label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        value={value}
                        onChange={(e) => handleContextDataChange(key, e.target.value)}
                        size="small"
                        fullWidth
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Template Info */}
            {selectedTemplate && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Channel:</strong> {selectedTemplate.channel} | 
                  <strong> Template:</strong> {selectedTemplate.name}
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handlePreview}
            variant="outlined"
            startIcon={<PreviewIcon />}
            disabled={!selectedTemplateId || isPreviewing}
          >
            {isPreviewing ? 'Loading...' : 'Preview'}
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!isFormValid() || isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <PreviewIcon color="primary" />
              Message Preview
            </Box>
            <Button
              onClick={() => setPreviewOpen(false)}
              startIcon={<CloseIcon />}
              size="small"
            >
              Close
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent>
          {previewData && (
            <Stack spacing={3}>
              {previewData.subject && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Subject
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{previewData.subject}</Typography>
                  </Paper>
                </Box>
              )}

              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedTemplate?.channel === 'EMAIL' ? 'Email Body' : 'SMS Message'}
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                  {selectedTemplate?.channel === 'EMAIL' ? (
                    <Box 
                      dangerouslySetInnerHTML={{ __html: previewData.body }}
                      sx={{ '& *': { maxWidth: '100%' }, wordBreak: 'break-word' }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {previewData.body}
                    </Typography>
                  )}
                </Paper>
              </Box>

              {selectedTemplate?.channel === 'SMS' && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Character count:</strong> {previewData.body.length}
                    {previewData.body.length > 160 && (
                      <span> - This message will be sent as multiple SMS parts.</span>
                    )}
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};