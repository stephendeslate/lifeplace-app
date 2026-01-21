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
import { ModernPageHeader } from '../../../components/common/ModernPageHeader';
import { TemplateContentEditor } from '../../../components/shared';
import type { TemplateEditorMode } from '../../../types/templates.types';

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

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
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
                borderRadius: 2,
                bgcolor: document.document_type === 'TERMS_OF_SERVICE' ? 'primary.light' : 'secondary.light',
              }}
            >
              {getDocumentIcon()}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="600">
                {document.document_type_display}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Version {document.version} - {document.is_published ? 'Published' : 'Draft'}
                {document.last_updated_by_name && ` - Updated by ${document.last_updated_by_name}`}
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
            <Divider sx={{ mb: 3 }} />

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
                />

                {/* Version and Effective Date */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    disabled={isUpdating}
                  />

                  <DatePicker
                    label="Effective Date"
                    value={formData.effective_date}
                    onChange={(newValue) => setFormData({ ...formData, effective_date: newValue })}
                    disabled={isUpdating}
                    slotProps={{
                      textField: {
                        fullWidth: true,
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
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Published
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
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
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Stack>
            </form>
          </Box>
        </Collapse>
      </Box>
    </Box>
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
      {/* Header */}
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
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Legal Documents Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Legal documents will appear here once they are created.
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </ModernSettingsLayout>
  );
};
