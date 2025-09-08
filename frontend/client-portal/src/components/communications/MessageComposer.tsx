// frontend/client-portal/src/components/communications/MessageComposer.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Chip,
  Button,
  useTheme,
  alpha,
  FormControlLabel,
  Switch,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Code as VariableIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Check as ValidIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import VariableInserter from './VariableInserter';
import type { 
  CommunicationTemplate, 
  MessageComposition,
  MessageValidation
} from '../../types/communications.types';

interface MessageComposerProps {
  template?: CommunicationTemplate | null;
  channel: 'EMAIL' | 'SMS';
  initialSubject?: string;
  initialBody?: string;
  onCompositionChange: (composition: MessageComposition) => void;
  onValidationChange?: (validation: MessageValidation) => void;
  recipient?: string;
  showVariables?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

// SMS character limits
const SMS_SINGLE_LIMIT = 160;
const SMS_MULTI_LIMIT = 1600;
const SMS_SEGMENT_SIZE = 153; // For multi-part SMS

export const MessageComposer: React.FC<MessageComposerProps> = ({
  template,
  channel,
  initialSubject = '',
  initialBody = '',
  onCompositionChange,
  onValidationChange,
  recipient = '',
  showVariables = true,
  compact = false,
  disabled = false,
}) => {
  const theme = useTheme();
  
  // State
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [useTemplate, setUseTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);

  // References for text areas
  const subjectRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLInputElement>(null);

  // Character count and validation for SMS
  const smsStats = useMemo(() => {
    if (channel !== 'SMS') return null;

    const length = body.length;
    const segments = Math.ceil(length / SMS_SEGMENT_SIZE) || 1;
    const remaining = segments === 1 
      ? SMS_SINGLE_LIMIT - length 
      : (segments * SMS_SEGMENT_SIZE) - length;
    const isOverLimit = length > SMS_MULTI_LIMIT;

    return {
      length,
      segments,
      remaining,
      isOverLimit,
      limit: segments === 1 ? SMS_SINGLE_LIMIT : SMS_MULTI_LIMIT,
    };
  }, [body, channel]);

  // Message validation
  const validation = useMemo((): MessageValidation => {
    const errors: MessageValidation['errors'] = [];
    const warnings: MessageValidation['warnings'] = [];

    // Subject validation for emails
    if (channel === 'EMAIL') {
      if (!subject.trim()) {
        errors.push({
          field: 'subject',
          message: 'Subject is required for email messages',
          code: 'SUBJECT_REQUIRED',
        });
      } else if (subject.length > 200) {
        warnings.push({
          field: 'subject',
          message: 'Subject is very long and may be truncated',
          code: 'SUBJECT_LONG',
        });
      }
    }

    // Body validation
    if (!body.trim()) {
      errors.push({
        field: 'body',
        message: 'Message body is required',
        code: 'BODY_REQUIRED',
      });
    }

    // SMS specific validation
    if (channel === 'SMS' && smsStats) {
      if (smsStats.isOverLimit) {
        errors.push({
          field: 'body',
          message: `Message exceeds SMS limit of ${SMS_MULTI_LIMIT} characters`,
          code: 'SMS_TOO_LONG',
        });
      } else if (smsStats.segments > 3) {
        warnings.push({
          field: 'body',
          message: `Message will be sent as ${smsStats.segments} separate SMS messages`,
          code: 'SMS_MULTIPART',
        });
      }
    }

    // Recipient validation
    if (!recipient.trim()) {
      errors.push({
        field: 'recipient',
        message: 'Recipient is required',
        code: 'RECIPIENT_REQUIRED',
      });
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      character_count: channel === 'SMS' && smsStats ? {
        body: smsStats.length,
        limit: smsStats.limit,
        remaining: smsStats.remaining,
      } : undefined,
    };
  }, [channel, subject, body, recipient, smsStats]);

  // Update composition when values change
  useEffect(() => {
    const composition: MessageComposition = {
      template_id: useTemplate ? template?.id : undefined,
      template: useTemplate ? template || undefined : undefined,
      recipient,
      channel,
      subject: channel === 'EMAIL' ? subject : undefined,
      body,
      custom_subject: !useTemplate ? subject : undefined,
      custom_body: !useTemplate ? body : undefined,
      use_template: useTemplate,
    };

    onCompositionChange(composition);
    onValidationChange?.(validation);
  }, [
    template, 
    recipient, 
    channel, 
    subject, 
    body, 
    useTemplate, 
    onCompositionChange, 
    onValidationChange, 
    validation
  ]);

  // Handle variable insertion
  const handleVariableInsert = useCallback((variable: string) => {
    const activeRef = document.activeElement === subjectRef.current ? subjectRef : bodyRef;
    const isSubject = activeRef === subjectRef;
    const currentValue = isSubject ? subject : body;
    const setValue = isSubject ? setSubject : setBody;
    const position = activeRef.current?.selectionStart || currentValue.length;

    const newValue = 
      currentValue.slice(0, position) + 
      variable + 
      currentValue.slice(position);

    setValue(newValue);

    // Reset cursor position after state update
    setTimeout(() => {
      if (activeRef.current) {
        const newPosition = position + variable.length;
        activeRef.current.setSelectionRange(newPosition, newPosition);
        activeRef.current.focus();
      }
    }, 0);
  }, [subject, body]);

  const handleUseTemplateToggle = (checked: boolean) => {
    setUseTemplate(checked);
    if (checked && template) {
      if (template.subject_template) {
        setSubject(template.subject_template);
      }
      setBody(template.body_template);
    }
  };

  const handleRefreshFromTemplate = () => {
    if (template) {
      if (template.subject_template) {
        setSubject(template.subject_template);
      }
      setBody(template.body_template);
    }
  };

  const getCharacterCountColor = () => {
    if (!smsStats) return 'text.secondary';
    
    if (smsStats.isOverLimit) return 'error.main';
    if (smsStats.remaining < 20) return 'warning.main';
    return 'text.secondary';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {channel === 'EMAIL' ? <EmailIcon color="primary" /> : <SmsIcon color="secondary" />}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Compose {channel === 'EMAIL' ? 'Email' : 'SMS'}
            </Typography>
          </Box>
          
          {validation.is_valid ? (
            <ValidIcon color="success" fontSize="small" />
          ) : (
            <WarningIcon color="error" fontSize="small" />
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          {template && (
            <FormControlLabel
              control={
                <Switch
                  checked={useTemplate}
                  onChange={(e) => handleUseTemplateToggle(e.target.checked)}
                  size="small"
                  disabled={disabled}
                />
              }
              label="Use Template"
              sx={{ m: 0 }}
            />
          )}

          {showVariables && template && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<VariableIcon />}
              onClick={() => setShowVariablesPanel(!showVariablesPanel)}
              disabled={disabled}
            >
              Variables
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setShowPreview(!showPreview)}
            disabled={disabled}
          >
            Preview
          </Button>
        </Stack>
      </Box>

      {/* Template Controls */}
      {template && useTemplate && (
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 2,
            p: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Using Template: {template.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {template.channel} • {template.category}
              </Typography>
            </Box>
            
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshFromTemplate}
              disabled={disabled}
            >
              Refresh from Template
            </Button>
          </Box>
        </GlassCard>
      )}

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 2,
            p: 2,
            backgroundColor: alpha(theme.palette.error.main, 0.05),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
          }}
        >
          <Stack spacing={1}>
            {validation.errors.map((error, index) => (
              <Typography key={index} variant="body2" color="error.main">
                • {error.message}
              </Typography>
            ))}
          </Stack>
        </GlassCard>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 2,
            p: 2,
            backgroundColor: alpha(theme.palette.warning.main, 0.05),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
          }}
        >
          <Stack spacing={1}>
            {validation.warnings.map((warning, index) => (
              <Typography key={index} variant="body2" color="warning.main">
                • {warning.message}
              </Typography>
            ))}
          </Stack>
        </GlassCard>
      )}

      <Stack spacing={2}>
        {/* Subject Field (Email only) */}
        {channel === 'EMAIL' && (
          <TextField
            ref={subjectRef}
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            disabled={disabled || Boolean(useTemplate && template?.subject_template)}
            error={validation.errors.some(e => e.field === 'subject')}
            helperText={
              validation.errors.find(e => e.field === 'subject')?.message ||
              (subject.length > 150 ? `${subject.length}/200 characters` : '')
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha('#fff', 0.7),
              },
            }}
          />
        )}

        {/* Message Body */}
        <Box>
          <TextField
            ref={bodyRef}
            label={channel === 'EMAIL' ? 'Message Body' : 'SMS Message'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            rows={channel === 'EMAIL' ? 8 : 4}
            fullWidth
            disabled={disabled || Boolean(useTemplate && template?.body_template)}
            error={validation.errors.some(e => e.field === 'body')}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha('#fff', 0.7),
              },
            }}
          />

          {/* Character Count for SMS */}
          {channel === 'SMS' && smsStats && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${smsStats.length} chars`}
                  size="small"
                  color={smsStats.isOverLimit ? 'error' : 'default'}
                  variant="outlined"
                />
                <Chip
                  label={`${smsStats.segments} message${smsStats.segments === 1 ? '' : 's'}`}
                  size="small"
                  color={smsStats.segments > 1 ? 'warning' : 'default'}
                  variant="outlined"
                />
              </Stack>
              
              <Typography
                variant="caption"
                sx={{
                  color: getCharacterCountColor(),
                  fontWeight: 600,
                }}
              >
                {smsStats.remaining >= 0 
                  ? `${smsStats.remaining} remaining`
                  : `${Math.abs(smsStats.remaining)} over limit`
                }
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>

      {/* Variables Panel */}
      <Collapse in={showVariablesPanel && showVariables} timeout="auto">
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <VariableInserter
            template={template}
            onVariableInsert={handleVariableInsert}
            compact={compact}
            maxHeight={300}
          />
        </Box>
      </Collapse>

      {/* Preview Panel */}
      <Collapse in={showPreview} timeout="auto">
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Message Preview
          </Typography>
          
          <Paper
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.grey[50], 0.8),
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          >
            {channel === 'EMAIL' && subject && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                  {subject}
                </Typography>
              </>
            )}
            
            <Typography variant="subtitle2" color="text.secondary">
              Message:
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {body || 'No message content'}
            </Typography>

            {channel === 'SMS' && smsStats && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="caption" color="text.secondary">
                  This SMS will be sent as {smsStats.segments} message{smsStats.segments === 1 ? '' : 's'}
                  {smsStats.segments > 1 && ` (${smsStats.length} characters total)`}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Collapse>
    </Box>
  );
};

export default MessageComposer;