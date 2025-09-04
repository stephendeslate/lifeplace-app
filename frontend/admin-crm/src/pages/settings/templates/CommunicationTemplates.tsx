// frontend/admin-crm/src/pages/settings/templates/CommunicationTemplates.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useCommunications } from '../../../hooks/useCommunications';
import { TemplateList } from '../../../components/communications/TemplateList';
import { TemplateForm } from '../../../components/communications/TemplateForm';
import type { CommunicationTemplate } from '../../../types/communications.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

type ViewMode = 'list' | 'create' | 'edit' | 'preview';

export const CommunicationTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

  // Get templates data for stats
  const { useTemplates } = useCommunications();
  const { data: templates = [] } = useTemplates({});

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Templates' },
      { label: 'Communication Templates' },
    ]);
  }, [setBreadcrumbs]);

  const handleCreateNew = () => {
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setSearchQuery('');
    }
  };

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ModernSettingsLayout>
        <ModernCard
          variant="glass"
          size="large"
          animation="fade"
        >
          <TemplateForm
            template={selectedTemplate || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // Header actions
  const headerActions = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon' as const,
      tooltip: showSearchField ? 'Hide search field' : 'Search communication templates',
    },
    createRefreshAction(() => window.location.reload()),
  ];

  const primaryAction = createAddAction('New Template', handleCreateNew, 'primary');

  // Calculate stats
  const emailTemplates = templates.filter(t => t.channel === 'EMAIL').length;
  const smsTemplates = templates.filter(t => t.channel === 'SMS').length;

  // List view
  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Communication Templates"
        subtitle="Manage email and SMS templates for consistent client communications"
        icon={<MessageIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Templates' },
          { label: 'Communication Templates' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Total Templates', value: templates.length },
          { label: 'Email Templates', value: emailTemplates },
          { label: 'SMS Templates', value: smsTemplates },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            size="large"
            color="primary"
            animation="fade"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
              },
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: tokens.color.neutral[800],
                  fontWeight: 600,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                Search Communication Templates
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: tokens.color.neutral[600],
                  mb: 3,
                }}
              >
                Find templates by name, channel, category, or content
              </Typography>

              <TextField
                fullWidth
                placeholder="Search by name, channel, category, or content..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    '&:hover': {
                      border: `1px solid ${tokens.color.primary[300]}`,
                    },
                    '&.Mui-focused': {
                      border: `1px solid ${tokens.color.primary[500]}`,
                      boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </ModernCard>
        </Box>
      )}

      {/* Templates Table */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <TemplateList
          searchQuery={searchQuery}
          onEditClick={handleEditClick}
          onPreviewClick={handlePreviewClick}
        />
      </ModernCard>
    </ModernSettingsLayout>
  );
};