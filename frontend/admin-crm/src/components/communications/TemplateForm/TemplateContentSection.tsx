import React from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import type { CreateTemplateData } from '@/types/communications.types';
import type { TemplateEditorMode } from '@/types/templates.types';
import type { VariableSchemas } from '@/types/templates.types';
import { TemplateContentEditor, TemplateVariableInserter } from '@/components/shared';
import type { TemplateContentEditorHandle } from '@/components/shared';
import type { TemplateStarter } from '@/types/templates.types';

interface TemplateContentSectionProps {
  formData: CreateTemplateData;
  editorMode: TemplateEditorMode;
  editorRef: React.RefObject<TemplateContentEditorHandle | null>;
  variableSchemas?: VariableSchemas;
  templateStarters: Record<string, TemplateStarter>;
  onInputChange: (field: keyof CreateTemplateData, value: unknown) => void;
  onEditorModeChange: (mode: TemplateEditorMode) => void;
  onVariableInsert: (variable: string) => void;
  onTemplateLoad: (templateKey: string) => void;
}

export const TemplateContentSection: React.FC<TemplateContentSectionProps> = ({
  formData,
  editorMode,
  editorRef,
  variableSchemas,
  templateStarters,
  onInputChange,
  onEditorModeChange,
  onVariableInsert,
  onTemplateLoad,
}) => {
  return (
    <>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Template Content
        </Typography>

        <Stack spacing={2}>
          {formData.channel === 'EMAIL' && (
            <TextField
              label="Subject Template"
              value={formData.subject_template}
              onChange={(e) => onInputChange('subject_template', e.target.value)}
              required={formData.channel === 'EMAIL'}
              fullWidth
              placeholder="Use {{ variable_name }} for dynamic content"
              helperText="The subject line of your email"
            />
          )}

          <TemplateContentEditor
            ref={editorRef}
            value={formData.body_template}
            onChange={(value) => onInputChange('body_template', value)}
            mode={formData.channel === 'SMS' ? 'text' : editorMode}
            onModeChange={onEditorModeChange}
            showModeToggle={formData.channel === 'EMAIL'}
            availableModes={formData.channel === 'SMS' ? ['text'] : ['visual', 'html']}
            label={formData.channel === 'SMS' ? 'Message Content' : 'Email Body'}
            placeholder={
              formData.channel === 'SMS'
                ? 'Hi {{ first_name }}! Your message here...'
                : 'Start typing your email content... Type {{ to insert variables.'
            }
            minHeight={formData.channel === 'SMS' ? 100 : 300}
            rows={formData.channel === 'SMS' ? 4 : 12}
            showCharacterCount={formData.channel === 'SMS'}
            maxCharacters={formData.channel === 'SMS' ? 160 : undefined}
            helperText={
              formData.channel === 'SMS'
                ? 'Keep SMS messages under 160 characters for best delivery'
                : 'Type {{ to insert variables with autocomplete'
            }
            variableSchemas={variableSchemas}
            contextType={formData.context_type}
            hideAdvancedModes={true}
          />
        </Stack>
      </Box>

      {/* Variable Helper */}
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <TemplateVariableInserter
          variableSchemas={variableSchemas}
          contextType={formData.context_type}
          onVariableInsert={onVariableInsert}
          onTemplateLoad={onTemplateLoad}
          templateStarters={templateStarters}
          showFormattingTips={formData.channel === 'EMAIL'}
        />
      </Box>
    </>
  );
};
