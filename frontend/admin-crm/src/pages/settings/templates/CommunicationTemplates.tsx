// frontend/admin-crm/src/pages/settings/communication/CommunicationTemplates.tsx

import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useLayout } from '../../../contexts/LayoutContext';
import { TemplateList } from '../../../components/communications/TemplateList';
import { TemplateForm } from '../../../components/communications/TemplateForm';
import type { CommunicationTemplate } from '../../../types/communications.types';

type ViewMode = 'list' | 'create' | 'edit' | 'preview';

export const CommunicationTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Communication' },
      { label: 'Templates' },
    ]);
  }, [setBreadcrumbs]);

  const handleCreateClick = () => {
    setSelectedTemplate(null);
    setViewMode('create');
  };

  const handleEditClick = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setViewMode('edit');
  };

  const handlePreviewClick = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setViewMode('preview');
  };

  const handleSave = () => {
    setViewMode('list');
    setSelectedTemplate(null);
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedTemplate(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
      case 'edit':
        return (
          <TemplateForm
            template={selectedTemplate || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      case 'list':
      default:
        return (
          <TemplateList
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            onPreviewClick={handlePreviewClick}
          />
        );
    }
  };

  return (
    <Box>
      {renderContent()}
    </Box>
  );
};