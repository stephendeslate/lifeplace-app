// frontend/client-portal/src/components/communications/SendMessageDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Autocomplete,
  Stack,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Person as PersonIcon,
  Description as TemplateIcon,
  Edit as ComposeIcon,
  Check as ReviewIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import TemplateSelector from './TemplateSelector';
import MessageComposer from './MessageComposer';
import { useCommunications } from '../../hooks/useCommunications';
import type { 
  CommunicationTemplate,
  MessageComposition,
  MessageValidation,
  SendCommunicationData,
  RecipientSuggestion
} from '../../types/communications.types';

interface SendMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSendComplete?: (success: boolean, message?: string) => void;
  defaultRecipient?: string;
  defaultChannel?: 'EMAIL' | 'SMS';
}

type SendStep = 'recipient' | 'template' | 'compose' | 'review' | 'sending';

const STEPS = [
  { key: 'recipient', label: 'Recipient', icon: <PersonIcon /> },
  { key: 'template', label: 'Template', icon: <TemplateIcon /> },
  { key: 'compose', label: 'Compose', icon: <ComposeIcon /> },
  { key: 'review', label: 'Review & Send', icon: <ReviewIcon /> },
];

export const SendMessageDialog: React.FC<SendMessageDialogProps> = ({
  open,
  onClose,
  onSendComplete,
  defaultRecipient = '',
  defaultChannel = 'EMAIL',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [currentStep, setCurrentStep] = useState<SendStep>('recipient');
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>(defaultChannel);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [composition, setComposition] = useState<MessageComposition | null>(null);
  const [validation, setValidation] = useState<MessageValidation | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Hooks
  const { useSendManual } = useCommunications();
  const sendMessageMutation = useSendManual();

  // Mock recipient suggestions (in real implementation, this would come from an API)
  const recipientSuggestions: RecipientSuggestion[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      type: 'client',
      recent_interaction: true,
    },
    {
      id: '2', 
      name: 'Jane Smith',
      email: 'jane@example.com',
      type: 'client',
      recent_interaction: false,
    },
  ];

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('recipient');
      setRecipient(defaultRecipient);
      setChannel(defaultChannel);
      setSelectedTemplate(null);
      setComposition(null);
      setValidation(null);
      setSendError(null);
    }
  }, [open, defaultRecipient, defaultChannel]);

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  const getStepIndex = (step: SendStep): number => {
    return STEPS.findIndex(s => s.key === step);
  };

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 'recipient':
        return recipient.trim().length > 0;
      case 'template':
        return true; // Can proceed with or without template
      case 'compose':
        return validation?.is_valid === true;
      case 'review':
        return validation?.is_valid === true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNext()) return;

    switch (currentStep) {
      case 'recipient':
        setCurrentStep('template');
        break;
      case 'template':
        setCurrentStep('compose');
        break;
      case 'compose':
        setCurrentStep('review');
        break;
      case 'review':
        handleSend();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'template':
        setCurrentStep('recipient');
        break;
      case 'compose':
        setCurrentStep('template');
        break;
      case 'review':
        setCurrentStep('compose');
        break;
    }
  };

  const handleSend = async () => {
    if (!composition || !validation?.is_valid) return;

    setCurrentStep('sending');
    setIsSending(true);
    setSendError(null);

    try {
      const request: SendCommunicationData = {
        template_id: composition.template_id!,
        recipient: composition.recipient,
        client_id: composition.client_id,
        context_data: composition.context_data,
      };

      const response = await sendMessageMutation.mutateAsync(request);
      
      if (response) {
        onSendComplete?.(true, 'Message sent successfully!');
        onClose();
      } else {
        setSendError('Failed to send message');
        setCurrentStep('review');
      }
    } catch (error: any) {
      setSendError(error.message || 'An error occurred while sending the message');
      setCurrentStep('review');
    } finally {
      setIsSending(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'recipient':
        return (
          <AnimatedElement animation="slideUp">
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Select Recipient
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose who you want to send the message to
                </Typography>

                <Autocomplete
                  freeSolo
                  value={recipient}
                  onChange={(_, value) => setRecipient(value as string || '')}
                  inputValue={recipient}
                  onInputChange={(_, value) => setRecipient(value)}
                  options={recipientSuggestions}
                  getOptionLabel={(option) => 
                    typeof option === 'string' ? option : option.email
                  }
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                        <PersonIcon color="action" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.email} • {option.type}
                          </Typography>
                        </Box>
                        {option.recent_interaction && (
                          <Chip label="Recent" size="small" color="primary" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Recipient Email"
                      placeholder="Enter email address"
                      fullWidth
                    />
                  )}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Message Channel
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={channel === 'EMAIL' ? 'contained' : 'outlined'}
                    startIcon={<EmailIcon />}
                    onClick={() => setChannel('EMAIL')}
                  >
                    Email
                  </Button>
                  <Button
                    variant={channel === 'SMS' ? 'contained' : 'outlined'}
                    startIcon={<SmsIcon />}
                    onClick={() => setChannel('SMS')}
                  >
                    SMS
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </AnimatedElement>
        );

      case 'template':
        return (
          <AnimatedElement animation="slideUp">
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
              channel={channel}
              compact={false}
              maxHeight={400}
              showChannelSelector={false}
            />
          </AnimatedElement>
        );

      case 'compose':
        return (
          <AnimatedElement animation="slideUp">
            <MessageComposer
              template={selectedTemplate}
              channel={channel}
              onCompositionChange={setComposition}
              onValidationChange={setValidation}
              recipient={recipient}
              showVariables={true}
              compact={false}
            />
          </AnimatedElement>
        );

      case 'review':
        return (
          <AnimatedElement animation="slideUp">
            <Stack spacing={3}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Review Message
              </Typography>

              {/* Recipient Info */}
              <GlassCard variant="light" intensity="medium" sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      To:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {recipient}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip
                      label={channel}
                      color={channel === 'EMAIL' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Box>
                </Stack>
              </GlassCard>

              {/* Template Info */}
              {selectedTemplate && (
                <GlassCard variant="light" intensity="medium" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TemplateIcon color="info" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Template:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedTemplate.name}
                      </Typography>
                    </Box>
                  </Stack>
                </GlassCard>
              )}

              {/* Message Preview */}
              <GlassCard variant="light" intensity="medium" sx={{ p: 3 }}>
                {channel === 'EMAIL' && composition?.subject && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Subject:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                      {composition.subject}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </>
                )}

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Message:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {composition?.body || 'No message content'}
                </Typography>
              </GlassCard>

              {/* Send Error */}
              {sendError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {sendError}
                </Alert>
              )}
            </Stack>
          </AnimatedElement>
        );

      case 'sending':
        return (
          <AnimatedElement animation="fadeIn">
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Sending Message...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we send your message
              </Typography>
            </Box>
          </AnimatedElement>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          backgroundColor: alpha('#fff', 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.2)}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
          borderRadius: isMobile ? 0 : 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {channel === 'EMAIL' ? (
            <EmailIcon color="primary" sx={{ fontSize: 32 }} />
          ) : (
            <SmsIcon color="secondary" sx={{ fontSize: 32 }} />
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Send {channel === 'EMAIL' ? 'Email' : 'SMS'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {STEPS.find(s => s.key === currentStep)?.label || 'Compose and send message'}
            </Typography>
          </Box>
        </Box>
        
        <IconButton
          onClick={handleClose}
          disabled={isSending}
          sx={{
            backgroundColor: alpha(theme.palette.grey[500], 0.1),
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[500], 0.2),
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Progress Stepper */}
        {!isMobile && currentStep !== 'sending' && (
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Stepper activeStep={getStepIndex(currentStep)} alternativeLabel>
              {STEPS.map((step, index) => (
                <Step key={step.key}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: index <= getStepIndex(currentStep)
                            ? theme.palette.primary.main
                            : alpha(theme.palette.grey[400], 0.3),
                          color: index <= getStepIndex(currentStep)
                            ? 'white'
                            : theme.palette.grey[400],
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {step.icon}
                      </Box>
                    )}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: index === getStepIndex(currentStep) ? 600 : 400,
                        color: index === getStepIndex(currentStep)
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                      }}
                    >
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Step Content */}
        <Box sx={{ p: 3, minHeight: 400 }}>
          {renderStepContent()}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {currentStep !== 'recipient' && currentStep !== 'sending' && (
            <Button
              startIcon={<BackIcon />}
              onClick={handleBack}
              disabled={isSending}
            >
              Back
            </Button>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleClose}
            disabled={isSending}
            color="inherit"
          >
            Cancel
          </Button>

          {currentStep === 'review' ? (
            <Button
              variant="contained"
              startIcon={isSending ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleSend}
              disabled={!canProceedToNext() || isSending}
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          ) : currentStep !== 'sending' && (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNext}
              disabled={!canProceedToNext()}
            >
              Next
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default SendMessageDialog;