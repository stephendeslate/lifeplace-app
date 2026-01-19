// frontend/admin-crm/src/components/shared/TemplateStartersGallery.tsx
// Visual card gallery for template starters with previews

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Description as ContractIcon,
  Celebration as WelcomeIcon,
  NotificationsActive as ReminderIcon,
  Reply as FollowUpIcon,
  CheckCircle as ConfirmationIcon,
} from '@mui/icons-material';
import type { TemplateStarter } from '../../types/templates.types';

// Extended template starter with additional display properties
export interface TemplateStarterCard extends TemplateStarter {
  key: string;
  category?: 'welcome' | 'reminder' | 'followup' | 'confirmation' | 'notification' | 'custom';
  channel?: 'EMAIL' | 'SMS' | 'CONTRACT';
  previewHtml?: string;
}

interface TemplateStartersGalleryProps {
  /** Template starters to display */
  starters: TemplateStarterCard[];
  /** Callback when a template is selected */
  onSelect: (key: string) => void;
  /** Whether to show confirmation dialog before loading */
  showConfirmation?: boolean;
  /** Current channel for filtering display */
  channel?: 'EMAIL' | 'SMS' | 'CONTRACT';
}

// Get icon for category
const getCategoryIcon = (category?: string, channel?: string): React.ReactNode => {
  const iconProps = { sx: { fontSize: 20 } };

  if (channel === 'SMS') return <SmsIcon {...iconProps} />;
  if (channel === 'CONTRACT') return <ContractIcon {...iconProps} />;

  switch (category) {
    case 'welcome':
      return <WelcomeIcon {...iconProps} />;
    case 'reminder':
      return <ReminderIcon {...iconProps} />;
    case 'followup':
      return <FollowUpIcon {...iconProps} />;
    case 'confirmation':
      return <ConfirmationIcon {...iconProps} />;
    default:
      return <EmailIcon {...iconProps} />;
  }
};

// Get color for category
const getCategoryColor = (category?: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
  switch (category) {
    case 'welcome':
      return 'success';
    case 'reminder':
      return 'warning';
    case 'followup':
      return 'info';
    case 'confirmation':
      return 'primary';
    default:
      return 'secondary';
  }
};

// Truncate and sanitize HTML for preview
const createPreviewSnippet = (html?: string, maxLength: number = 120): string => {
  if (!html) return '';

  // Remove HTML tags and decode entities
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * TemplateStartersGallery - Visual card gallery for template starters
 *
 * Displays template starters as clickable cards with:
 * - Visual preview of template content
 * - Category icon and color coding
 * - Channel indicator (Email/SMS/Contract)
 * - Optional confirmation dialog
 */
export const TemplateStartersGallery: React.FC<TemplateStartersGalleryProps> = ({
  starters,
  onSelect,
  showConfirmation = true,
  channel,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStarterCard | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleCardClick = (template: TemplateStarterCard) => {
    if (showConfirmation) {
      setSelectedTemplate(template);
      setConfirmDialogOpen(true);
    } else {
      onSelect(template.key);
    }
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.key);
    }
    setConfirmDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleCancel = () => {
    setConfirmDialogOpen(false);
    setSelectedTemplate(null);
  };

  if (starters.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No template starters available
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2,
        }}
      >
        {starters.map((template) => (
          <Card
            key={template.key}
            variant="outlined"
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: 4,
                borderColor: 'primary.main',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardActionArea
              onClick={() => handleCardClick(template)}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              {/* Preview area */}
              <Box
                sx={{
                  height: 80,
                  backgroundColor: 'grey.50',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  p: 1.5,
                  overflow: 'hidden',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {createPreviewSnippet(template.previewHtml || template.content, 150)}
                </Typography>
              </Box>

              {/* Content area */}
              <CardContent sx={{ flex: 1, p: 1.5, pb: '12px !important' }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      backgroundColor: `${getCategoryColor(template.category)}.50`,
                      color: `${getCategoryColor(template.category)}.main`,
                    }}
                  >
                    {getCategoryIcon(template.category, template.channel || channel)}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                    {template.name}
                  </Typography>
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {template.description}
                </Typography>

                {/* Channel chip */}
                {(template.channel || channel) && (
                  <Box mt={1}>
                    <Chip
                      label={template.channel || channel}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.625rem' }}
                    />
                  </Box>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Load Template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Loading "{selectedTemplate?.name}" will replace your current content.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" variant="contained">
            Load Template
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateStartersGallery;
