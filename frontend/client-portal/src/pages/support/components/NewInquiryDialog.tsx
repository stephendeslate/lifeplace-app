// frontend/client-portal/src/pages/support/components/NewInquiryDialog.tsx

import React, { useState } from 'react';
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
  Stack,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Box,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSupport } from '../../../hooks/useSupport';
import { useEvents } from '../../../hooks/useEvents';
import { SUPPORT_CATEGORIES } from '../../../constants/support.constants';
import type { SupportCategory, SupportInquiryCreate } from '../../../types/support.types';

interface NewInquiryDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NewInquiryDialog: React.FC<NewInquiryDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { useCreateInquiry } = useSupport();
  const { useEventsList } = useEvents();
  const createInquiry = useCreateInquiry();
  const { data: events } = useEventsList();

  const [formData, setFormData] = useState<SupportInquiryCreate>({
    subject: '',
    category: 'general',
    initial_message: '',
  });

  const handleChange = (field: keyof SupportInquiryCreate) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string | number } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async () => {
    const dataToSubmit = {
      ...formData,
      event: formData.event || undefined,
    };

    await createInquiry.mutateAsync(dataToSubmit);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      subject: '',
      category: 'general',
      initial_message: '',
    });
    onClose();
  };

  const isValid = formData.subject.trim() && formData.initial_message.trim() && formData.category;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          New Support Inquiry
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Subject"
            value={formData.subject}
            onChange={handleChange('subject')}
            fullWidth
            placeholder="Brief summary of your inquiry"
            required
          />

          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) => handleChange('category')(e as { target: { value: string } })}
            >
              {SUPPORT_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  <Box>
                    <Typography variant="body1">{cat.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cat.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {events && events.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Related Event (Optional)</InputLabel>
              <Select
                value={formData.event || ''}
                label="Related Event (Optional)"
                onChange={(e) => handleChange('event')(e as { target: { value: string } })}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Message"
            value={formData.initial_message}
            onChange={handleChange('initial_message')}
            multiline
            rows={4}
            fullWidth
            placeholder="Describe your question or issue in detail..."
            required
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={createInquiry.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isValid || createInquiry.isPending}
        >
          {createInquiry.isPending ? 'Submitting...' : 'Submit Inquiry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
