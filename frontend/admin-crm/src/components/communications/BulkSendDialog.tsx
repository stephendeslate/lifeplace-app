// Bulk Communication Sending Dialog
// Allows admins to send emails/SMS to multiple clients at once using templates

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Autocomplete,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { ModernDialog } from '../common';
import { useCommunications } from '../../hooks/useCommunications';
import { useClients } from '../../hooks/useClients';
import type { Client } from '../../types/clients.types';

interface BulkSendDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkSendDialog: React.FC<BulkSendDialogProps> = ({ open, onClose, onSuccess }) => {
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [searchQuery, setSearchQuery] = useState('');

  const { useTemplates, useSendBulk } = useCommunications();
  const { data: templateData } = useTemplates();
  const templates = templateData ?? [];
  const { mutate: sendBulk, isPending: isSending } = useSendBulk();

  // Fetch clients for autocomplete
  const { clients } = useClients({ search: searchQuery || undefined });

  // Filter templates by selected channel
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => t.channel === channel && t.category === 'MANUAL');
  }, [templates, channel]);

  const selectedTemplate = useMemo(() => {
    if (!templateId) return null;
    return templates.find((t) => t.id === templateId) || null;
  }, [templates, templateId]);

  const handleSend = () => {
    if (!templateId || selectedClients.length === 0) return;

    const recipients = selectedClients.map((client) => ({
      recipient: channel === 'EMAIL' ? client.email : client.profile?.phone || '',
      client_id: client.id,
      context_data: {
        first_name: client.first_name,
        last_name: client.last_name,
        full_name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        company: client.profile?.company || '',
        phone: client.profile?.phone || '',
      },
    }));

    sendBulk(
      { template_id: Number(templateId), recipients },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
      },
    );
  };

  const handleClose = () => {
    setSelectedClients([]);
    setTemplateId('');
    setChannel('EMAIL');
    setSearchQuery('');
    onClose();
  };

  const canSend = selectedClients.length > 0 && templateId !== '' && !isSending;

  // Warn about clients missing contact info for selected channel
  const clientsWithMissingInfo = useMemo(() => {
    if (channel === 'SMS') {
      return selectedClients.filter((c) => !c.profile?.phone);
    }
    return selectedClients.filter((c) => !c.email);
  }, [selectedClients, channel]);

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title="Bulk Send Communication"
      maxWidth="md"
      fullWidth
      actions={[
        { label: 'Cancel', onClick: handleClose, variant: 'outlined' as const },
        {
          label: isSending
            ? 'Sending...'
            : `Send to ${selectedClients.length} recipient${selectedClients.length !== 1 ? 's' : ''}`,
          onClick: handleSend,
          variant: 'contained' as const,
          disabled: !canSend,
        },
      ]}
    >
      <Stack spacing={3}>
        {/* Channel Selection */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Channel</InputLabel>
            <Select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value as 'EMAIL' | 'SMS');
                setTemplateId('');
              }}
              label="Channel"
            >
              <MenuItem value="EMAIL">Email</MenuItem>
              <MenuItem value="SMS">SMS</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Template</InputLabel>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as number)}
              label="Template"
            >
              {filteredTemplates.length === 0 && (
                <MenuItem disabled>No manual {channel.toLowerCase()} templates available</MenuItem>
              )}
              {filteredTemplates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Template Preview */}
        {selectedTemplate && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            <Typography variant="caption" fontWeight={600}>
              Template: {selectedTemplate.name}
            </Typography>
            {selectedTemplate.subject_template && (
              <Typography variant="caption" display="block" color="text.secondary">
                Subject: {selectedTemplate.subject_template}
              </Typography>
            )}
          </Alert>
        )}

        <Divider />

        {/* Client Selection */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Recipients
          </Typography>
          <Autocomplete
            multiple
            options={clients || []}
            value={selectedClients}
            onChange={(_, newValue) => setSelectedClients(newValue)}
            getOptionLabel={(option) =>
              `${option.first_name} ${option.last_name} (${option.email})`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onInputChange={(_, value) => setSearchQuery(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search and select clients"
                placeholder="Type to search..."
                size="small"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((client, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={`${client.first_name} ${client.last_name}`}
                    size="small"
                    {...tagProps}
                  />
                );
              })
            }
            renderOption={(props, option) => {
              const { key, ...restProps } = props;
              return (
                <Box component="li" key={key} {...restProps}>
                  <Box>
                    <Typography variant="body2">
                      {option.first_name} {option.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.email}
                      {option.profile?.phone && ` | ${option.profile.phone}`}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            noOptionsText="No clients found"
            loading={!clients}
            loadingText="Searching..."
          />
        </Box>

        {/* Selected Count Summary */}
        {selectedClients.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              bgcolor: 'primary.50',
              borderRadius: 1,
            }}
          >
            <SendIcon fontSize="small" color="primary" />
            <Typography variant="body2">
              <strong>{selectedClients.length}</strong> recipient
              {selectedClients.length !== 1 ? 's' : ''} selected
            </Typography>
          </Box>
        )}

        {/* Warning for missing contact info */}
        {clientsWithMissingInfo.length > 0 && (
          <Alert severity="warning" sx={{ py: 0.5 }}>
            <Typography variant="caption">
              {clientsWithMissingInfo.length} client
              {clientsWithMissingInfo.length !== 1 ? 's' : ''} missing{' '}
              {channel === 'SMS' ? 'phone number' : 'email address'}:{' '}
              {clientsWithMissingInfo.map((c) => `${c.first_name} ${c.last_name}`).join(', ')}
            </Typography>
          </Alert>
        )}

        {isSending && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              justifyContent: 'center',
              py: 2,
            }}
          >
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Sending communications...
            </Typography>
          </Box>
        )}
      </Stack>
    </ModernDialog>
  );
};
