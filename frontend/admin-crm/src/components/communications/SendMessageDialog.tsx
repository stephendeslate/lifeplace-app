// frontend/admin-crm/src/components/communications/SendMessageDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Stack,
  Chip,
  Paper,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
  ExpandMore,
  Email as EmailIcon,
  Sms as SmsIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { sanitizeHTML } from '../../utils/security';
import { VariableInserter } from './VariableInserter';
import type { Client } from '../../types/clients.types';

interface SendMessageDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client;
}

interface MessageFormData {
  templateId: number | '';
  channel: 'EMAIL' | 'SMS';
  subject: string;
  body: string;
  variables: Record<string, any>;
}

export const SendMessageDialog: React.FC<SendMessageDialogProps> = ({
  open,
  onClose,
  client
}) => {
  const [formData, setFormData] = useState<MessageFormData>({
    templateId: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
    variables: {}
  });
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [variablesExpanded, setVariablesExpanded] = useState(false);

  const { 
    useTemplates, 
    usePreviewTemplate, 
    useSendManual, 
    useVariableSchemas 
  } = useCommunications();

  // Get manual templates only
  const { data: templates, isLoading: isLoadingTemplates } = useTemplates({
    category: 'MANUAL'
  });

  const { data: variableSchemas } = useVariableSchemas();
  const { mutate: previewTemplate, isPending: isPreviewing, data: previewData } = usePreviewTemplate();
  const { mutate: sendMessage, isPending: isSending } = useSendManual();

  // Generate context variables for the client
  const clientVariables = {
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    email: client.email,
    company: client.profile?.company || '',
    phone: client.profile?.phone || '',
    full_name: `${client.first_name} ${client.last_name}`.trim(),
    // System variables
    site_name: 'LifePlace',
    current_date: new Date().toLocaleDateString(),
    support_email: 'support@lifeplace.com'
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        templateId: '',
        channel: 'EMAIL',
        subject: '',
        body: '',
        variables: clientVariables
      });
      setPreviewExpanded(false);
      setVariablesExpanded(false);
    }
  }, [open, client]);

  // Update variables when client changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      variables: { ...prev.variables, ...clientVariables }
    }));
  }, [client]);

  const handleInputChange = (field: keyof MessageFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateChange = (templateId: number | '') => {
    if (templateId && templates) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          templateId,
          channel: template.channel,
          // Don't auto-fill subject/body - let admin write their own
          subject: prev.subject || '',
          body: prev.body || ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        templateId: '',
        subject: '',
        body: ''
      }));
    }
  };

  const handleVariableInsert = (variable: string) => {
    const variableText = `{{ ${variable} }}`;
    
    // Insert into body at cursor position if possible
    const textarea = document.getElementById('message-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const newText = before + variableText + after;
      handleInputChange('body', newText);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variableText.length;
      }, 0);
    }
  };

  const handlePreview = () => {
    if (!formData.templateId || !formData.body) return;
    
    // Create a custom body that combines the template layout with user content
    const selectedTemplate = templates?.find(t => t.id === formData.templateId);
    if (!selectedTemplate) return;

    // Replace template body with user's custom content but keep template structure
    let customTemplate = selectedTemplate.body_template;
    
    // Look for main content area in template and replace with user content
    // This is a simple approach - you might want to make this more sophisticated
    const contentPlaceholders = [
      '{{content}}',
      '{{message}}', 
      '{{body}}',
      'YOUR_MESSAGE_HERE'
    ];
    
    let hasPlaceholder = false;
    for (const placeholder of contentPlaceholders) {
      if (customTemplate.includes(placeholder)) {
        customTemplate = customTemplate.replace(placeholder, formData.body);
        hasPlaceholder = true;
        break;
      }
    }
    
    // If no placeholder found, append to the template
    if (!hasPlaceholder) {
      // Insert before closing div or at the end
      if (customTemplate.includes('</div>')) {
        const parts = customTemplate.split('</div>');
        customTemplate = parts[0] + `<div style="margin: 16px 0;">${formData.body}</div></div>` + parts.slice(1).join('</div>');
      } else {
        customTemplate += `<div style="margin: 16px 0;">${formData.body}</div>`;
      }
    }

    previewTemplate({
      id: formData.templateId,
      data: {
        template_id: formData.templateId,
        context_data: {
          ...formData.variables,
          custom_subject: formData.subject,
          custom_body: formData.body,
          // Override template with custom content
          body_template: customTemplate,
          subject_template: formData.subject
        }
      }
    });
    setPreviewExpanded(true);
  };

  const handleSend = () => {
    if (!formData.templateId || !formData.subject || !formData.body) return;

    // Prepare the data with the correct field names expected by the backend
    const sendData = {
      template_id: formData.templateId,
      recipient: client.email,
      client_id: client.id,
      custom_subject: formData.subject,  // Make sure this field is included
      custom_body: formData.body,        // Make sure this field is included
      context_data: {
        ...formData.variables,
        custom_subject: formData.subject,
        custom_body: formData.body
      }
    };

    console.log('Sending message with data:', sendData); // Debug log

    sendMessage(sendData, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const selectedTemplate = templates?.find(t => t.id === formData.templateId);
  const canPreview = formData.templateId && formData.body;
  const canSend = formData.templateId && formData.subject && formData.body;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              Send Message to {client.first_name} {client.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {client.email}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
        <Stack spacing={3}>
          {/* Template Selection */}
          <Box>
            <FormControl fullWidth>
              <InputLabel>Email Layout Template</InputLabel>
              <Select
                value={formData.templateId}
                label="Email Layout Template"
                onChange={(e) => handleTemplateChange(e.target.value as number)}
                disabled={isLoadingTemplates}
              >
                <MenuItem value="">
                  <em>Select a layout template...</em>
                </MenuItem>
                {templates?.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                      {template.channel === 'EMAIL' ? <EmailIcon /> : <SmsIcon />}
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {template.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {template.channel} Layout
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedTemplate && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Using <strong>{selectedTemplate.name}</strong> as the email layout. 
                Your custom subject and message will be formatted with this template's styling.
              </Alert>
            )}
          </Box>

          {/* Subject Input */}
          <TextField
            label="Subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            required
            fullWidth
            disabled={!selectedTemplate}
            placeholder="Enter your email subject..."
            helperText="Write your custom subject line"
            autoComplete="off"
            data-form-type="other"
            inputProps={{
              'data-form-type': 'other',
              'autoComplete': 'off'
            }}
          />

          {/* Message Body */}
          <Box>
            <TextField
              id="message-body"
              label="Message"
              value={formData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              required
              fullWidth
              multiline
              rows={8}
              disabled={!selectedTemplate}
              placeholder="Write your message here... You can use variables like {{ first_name }} for personalization."
              helperText="Your message content will be formatted with the selected template's layout"
            />
            
            {formData.channel === 'SMS' && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Character count: {formData.body.length}/160
                {formData.body.length > 160 && (
                  <span style={{ color: 'orange' }}> (Will be sent as multiple messages)</span>
                )}
              </Typography>
            )}
          </Box>

          {/* Variables Helper */}
          {selectedTemplate && (
            <Accordion 
              expanded={variablesExpanded}
              onChange={(_, expanded) => setVariablesExpanded(expanded)}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2" fontWeight="medium">
                  📋 Insert Variables
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <VariableInserter
                  variableSchemas={variableSchemas}
                  onVariableInsert={handleVariableInsert}
                  channel={formData.channel}
                />
                
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Available for this client:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {Object.entries(clientVariables).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`{{ ${key} }} = "${value}"`}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => handleVariableInsert(key)}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Preview Section */}
          {canPreview && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  size="small"
                >
                  {isPreviewing ? <CircularProgress size={16} /> : 'Preview Message'}
                </Button>
                
                {previewData && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                  >
                    {previewExpanded ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                )}
              </Box>

              {previewExpanded && previewData && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Preview:
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Subject:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {formData.subject}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Message Preview:
                  </Typography>
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      p: 2,
                      bgcolor: 'background.paper',
                      maxHeight: 300,
                      overflow: 'auto'
                    }}
                  >
                    {formData.channel === 'EMAIL' ? (
                      <Box 
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewData.body, 'template') }}
                        sx={{ 
                          '& *': { maxWidth: '100%' },
                          wordBreak: 'break-word'
                        }}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {previewData.body}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={onClose}
          disabled={isSending}
        >
          Cancel
        </Button>
        
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleSend}
          disabled={!canSend || isSending}
        >
          {isSending ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Sending...
            </>
          ) : (
            `Send ${formData.channel === 'EMAIL' ? 'Email' : 'SMS'}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};