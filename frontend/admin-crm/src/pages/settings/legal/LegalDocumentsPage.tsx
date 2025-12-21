// frontend/admin-crm/src/pages/settings/legal/LegalDocumentsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Stack,
  Button,
  CircularProgress,
  Typography,
  Switch,
  FormControlLabel,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Description,
  ExpandMore,
  ExpandLess,
  Save as SaveIcon,
  Gavel,
  Security,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useLegalDocuments } from '../../../hooks/useLegalDocuments';
import type { LegalDocument, LegalDocumentUpdateData } from '../../../types/settings.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader } from '../../../components/common/ModernPageHeader';
import { TemplateContentEditor } from '../../../components/shared';
import type { TemplateEditorMode } from '../../../types/templates.types';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

interface DocumentFormData {
  title: string;
  content: string;
  version: string;
  effective_date: Date | null;
  is_published: boolean;
}

const LegalDocumentEditor: React.FC<{
  document: LegalDocument;
  onUpdate: (documentType: string, data: LegalDocumentUpdateData) => void;
  isUpdating: boolean;
}> = ({ document, onUpdate, isUpdating }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editorMode, setEditorMode] = useState<TemplateEditorMode>('visual');
  const [formData, setFormData] = useState<DocumentFormData>({
    title: document.title,
    content: document.content,
    version: document.version,
    effective_date: document.effective_date ? new Date(document.effective_date) : null,
    is_published: document.is_published,
  });

  // Update form when document changes
  useEffect(() => {
    setFormData({
      title: document.title,
      content: document.content,
      version: document.version,
      effective_date: document.effective_date ? new Date(document.effective_date) : null,
      is_published: document.is_published,
    });
  }, [document]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const updateData: LegalDocumentUpdateData = {
      title: formData.title,
      content: formData.content,
      version: formData.version,
      effective_date: formData.effective_date ? formData.effective_date.toISOString().split('T')[0] : null,
      is_published: formData.is_published,
    };

    onUpdate(document.document_type, updateData);
  };

  const getDocumentIcon = () => {
    return document.document_type === 'TERMS_OF_SERVICE' ? <Gavel /> : <Security />;
  };

  const getDocumentColor = () => {
    return document.document_type === 'TERMS_OF_SERVICE' ? 'primary' : 'secondary';
  };

  return (
    <ModernCard
      variant="glass"
      size="large"
      color={getDocumentColor()}
      animation="none"
      sx={{
        '&::before': {
          background: `linear-gradient(135deg, ${
            document.document_type === 'TERMS_OF_SERVICE'
              ? tokens.color.primary[500]
              : tokens.color.secondary[500]
          }04 0%, ${
            document.document_type === 'TERMS_OF_SERVICE'
              ? tokens.color.primary[600]
              : tokens.color.secondary[600]
          }03 100%)`,
        },
      }}
    >
      <Box>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: tokens.spacing.radius.md,
                background: `linear-gradient(135deg, ${
                  document.document_type === 'TERMS_OF_SERVICE'
                    ? tokens.color.primary[500]
                    : tokens.color.secondary[500]
                }15 0%, ${
                  document.document_type === 'TERMS_OF_SERVICE'
                    ? tokens.color.primary[600]
                    : tokens.color.secondary[600]
                }20 100%)`,
              }}
            >
              {getDocumentIcon()}
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: tokens.color.neutral[800],
                  fontWeight: 600,
                }}
              >
                {document.document_type_display}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: tokens.color.neutral[600],
                }}
              >
                Version {document.version} • {document.is_published ? 'Published' : 'Draft'}
                {document.last_updated_by_name && ` • Updated by ${document.last_updated_by_name}`}
              </Typography>
            </Box>
          </Box>
          <IconButton>
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Expanded Form */}
        <Collapse in={isExpanded}>
          <Box sx={{ pt: 3 }}>
            <Divider sx={{ mb: 3, borderColor: tokens.color.borders.glass }} />

            {isUpdating && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 10,
                }}
              >
                <CircularProgress />
              </Box>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {/* Title */}
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isUpdating}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      '&:hover': {
                        border: `1px solid ${
                          document.document_type === 'TERMS_OF_SERVICE'
                            ? tokens.color.primary[300]
                            : tokens.color.secondary[300]
                        }`,
                      },
                      '&.Mui-focused': {
                        border: `1px solid ${
                          document.document_type === 'TERMS_OF_SERVICE'
                            ? tokens.color.primary[500]
                            : tokens.color.secondary[500]
                        }`,
                        boxShadow: `0 0 0 3px ${
                          document.document_type === 'TERMS_OF_SERVICE'
                            ? tokens.color.primary[500]
                            : tokens.color.secondary[500]
                        }15`,
                      },
                    },
                  }}
                />

                {/* Version and Effective Date */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    disabled={isUpdating}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${
                            document.document_type === 'TERMS_OF_SERVICE'
                              ? tokens.color.primary[300]
                              : tokens.color.secondary[300]
                          }`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${
                            document.document_type === 'TERMS_OF_SERVICE'
                              ? tokens.color.primary[500]
                              : tokens.color.secondary[500]
                          }`,
                          boxShadow: `0 0 0 3px ${
                            document.document_type === 'TERMS_OF_SERVICE'
                              ? tokens.color.primary[500]
                              : tokens.color.secondary[500]
                          }15`,
                        },
                      },
                    }}
                  />

                  <DatePicker
                    label="Effective Date"
                    value={formData.effective_date}
                    onChange={(newValue) => setFormData({ ...formData, effective_date: newValue })}
                    disabled={isUpdating}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.lg,
                            border: `1px solid ${tokens.color.borders.glass}`,
                            '&:hover': {
                              border: `1px solid ${
                                document.document_type === 'TERMS_OF_SERVICE'
                                  ? tokens.color.primary[300]
                                  : tokens.color.secondary[300]
                              }`,
                            },
                            '&.Mui-focused': {
                              border: `1px solid ${
                                document.document_type === 'TERMS_OF_SERVICE'
                                  ? tokens.color.primary[500]
                                  : tokens.color.secondary[500]
                              }`,
                              boxShadow: `0 0 0 3px ${
                                document.document_type === 'TERMS_OF_SERVICE'
                                  ? tokens.color.primary[500]
                                  : tokens.color.secondary[500]
                              }15`,
                            },
                          },
                        },
                      },
                    }}
                  />
                </Box>

                {/* Content Editor */}
                <Box>
                  <TemplateContentEditor
                    label="Content"
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    mode={editorMode}
                    onModeChange={setEditorMode}
                    showModeToggle={true}
                    availableModes={['visual', 'html']}
                    disabled={isUpdating}
                    minHeight={400}
                    placeholder="Enter the legal document content..."
                  />
                </Box>

                {/* Is Published Toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      disabled={isUpdating}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color:
                            document.document_type === 'TERMS_OF_SERVICE'
                              ? tokens.color.primary[500]
                              : tokens.color.secondary[500],
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor:
                            document.document_type === 'TERMS_OF_SERVICE'
                              ? tokens.color.primary[500]
                              : tokens.color.secondary[500],
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Published
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.color.neutral[600] }}>
                        Make this document visible to users
                      </Typography>
                    </Box>
                  }
                />

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isUpdating}
                    startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    sx={{
                      background: `linear-gradient(135deg, ${
                        document.document_type === 'TERMS_OF_SERVICE'
                          ? tokens.color.primary[500]
                          : tokens.color.secondary[500]
                      } 0%, ${
                        document.document_type === 'TERMS_OF_SERVICE'
                          ? tokens.color.primary[600]
                          : tokens.color.secondary[600]
                      } 100%)`,
                      borderRadius: tokens.spacing.radius.full,
                      px: 4,
                      py: 1.25,
                      boxShadow: `0 8px 32px ${
                        document.document_type === 'TERMS_OF_SERVICE'
                          ? tokens.color.primary[500]
                          : tokens.color.secondary[500]
                      }25`,
                      fontWeight: 600,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${
                          document.document_type === 'TERMS_OF_SERVICE'
                            ? tokens.color.primary[600]
                            : tokens.color.secondary[600]
                        } 0%, ${
                          document.document_type === 'TERMS_OF_SERVICE'
                            ? tokens.color.primary[700]
                            : tokens.color.secondary[700]
                        } 100%)`,
                        boxShadow: `0 12px 40px ${
                          document.document_type === 'TERMS_OF_SERVICE'
                            ? tokens.color.primary[500]
                            : tokens.color.secondary[500]
                        }35`,
                      },
                    }}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Stack>
            </form>
          </Box>
        </Collapse>
      </Box>
    </ModernCard>
  );
};

export const LegalDocumentsPage: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const { legalDocuments, isLoadingDocuments, updateLegalDocument, isUpdatingDocument } = useLegalDocuments();

  // Wrapper to convert (documentType, data) arguments to { documentType, data } object
  const handleUpdateDocument = (documentType: string, data: LegalDocumentUpdateData) => {
    updateLegalDocument({ documentType, data });
  };

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Legal & Compliance' },
      { label: 'Legal Documents' },
    ]);
  }, [setBreadcrumbs]);

  if (isLoadingDocuments) {
    return (
      <ModernSettingsLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </ModernSettingsLayout>
    );
  }

  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Legal Documents"
        subtitle="Manage your Terms of Service and Privacy Policy"
        icon={<Description />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Legal & Compliance' },
          { label: 'Legal Documents' },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Document Editors */}
      <Stack spacing={3}>
        {legalDocuments.map((document) => (
          <LegalDocumentEditor
            key={document.id}
            document={document}
            onUpdate={handleUpdateDocument}
            isUpdating={isUpdatingDocument}
          />
        ))}

        {legalDocuments.length === 0 && (
          <ModernCard variant="glass" size="large">
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ color: tokens.color.neutral[600], mb: 1 }}>
                No Legal Documents Found
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.neutral[500] }}>
                Legal documents will appear here once they are created.
              </Typography>
            </Box>
          </ModernCard>
        )}
      </Stack>
    </ModernSettingsLayout>
  );
};
