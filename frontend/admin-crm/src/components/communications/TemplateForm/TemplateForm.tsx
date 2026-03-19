import React from 'react';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import type { CommunicationTemplate } from '@/types/communications.types';
import { ModernPageHeader, ModernPageLayout } from '@/components/common';
import { useTemplateFormLogic } from './useTemplateFormLogic';
import { BasicInfoSection } from './BasicInfoSection';
import { TemplateContentSection } from './TemplateContentSection';
import { PreviewSection } from './PreviewSection';
import { SendTestSection } from './SendTestSection';
import { getTemplateStarters } from './templateContentData';

interface TemplateFormProps {
  template?: CommunicationTemplate;
  onSave: () => void;
  onCancel: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const {
    formData,
    editorMode,
    setEditorMode,
    editorRef,
    layouts,
    layoutsLoading,
    variableSchemas,
    isPreviewing,
    isSendingTest,
    testRecipient,
    setTestRecipient,
    showTestSend,
    setShowTestSend,
    isEditing,
    isLoading,
    livePreview,
    handleInputChange,
    handleSubmit,
    handleSendTest,
    handleVariableInsert,
    loadTemplate,
  } = useTemplateFormLogic({ template, onSave });

  return (
    <ModernPageLayout>
      <ModernPageHeader
        title={isEditing ? 'Edit Template' : 'Create Template'}
        subtitle={
          isEditing ? 'Modify your communication template' : 'Create a new communication template'
        }
        size="medium"
      />

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <BasicInfoSection
            formData={formData}
            isSystem={template?.is_system}
            layouts={layouts}
            layoutsLoading={layoutsLoading}
            onInputChange={handleInputChange}
            onEditorModeReset={setEditorMode}
          />

          <TemplateContentSection
            formData={formData}
            editorMode={editorMode}
            editorRef={editorRef}
            variableSchemas={variableSchemas}
            templateStarters={getTemplateStarters(formData.channel)}
            onInputChange={handleInputChange}
            onEditorModeChange={setEditorMode}
            onVariableInsert={handleVariableInsert}
            onTemplateLoad={loadTemplate}
          />

          <PreviewSection
            channel={formData.channel}
            isEditing={isEditing}
            isPreviewing={isPreviewing}
            livePreview={livePreview}
          />

          {isEditing && template && (
            <SendTestSection
              channel={formData.channel}
              isSendingTest={isSendingTest}
              testRecipient={testRecipient}
              showTestSend={showTestSend}
              onTestRecipientChange={setTestRecipient}
              onShowTestSend={setShowTestSend}
              onSendTest={handleSendTest}
            />
          )}

          {/* Actions */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box display="flex" gap={3} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isLoading}
                sx={{ borderRadius: 1, px: 4, py: 1.5, fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isLoading}
                sx={{ borderRadius: 1, px: 4, py: 1.5, fontWeight: 600 }}
              >
                {isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : isEditing ? (
                  'Update Template'
                ) : (
                  'Create Template'
                )}
              </Button>
            </Box>
          </Box>
        </Stack>
      </Box>
    </ModernPageLayout>
  );
};
