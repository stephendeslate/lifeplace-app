import React from 'react';
import { Button, Box, Typography, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DraggableList } from '@/components/common/DraggableList';
import type {
  QuestionnaireFieldFormData,
  QuestionnaireFieldType,
} from '@/types/questionnaires.types';
import { FieldEditor } from './FieldEditor';

interface FieldsTabProps {
  fields: QuestionnaireFieldFormData[];
  errors: Partial<{ [key: string]: string }>;
  onAddField: () => void;
  onFieldChange: (index: number, field: keyof QuestionnaireFieldFormData, value: unknown) => void;
  onRemoveField: (index: number) => void;
  onOptionChange: (fieldIndex: number, optionIndex: number, value: string) => void;
  onAddOption: (fieldIndex: number) => void;
  onRemoveOption: (fieldIndex: number, optionIndex: number) => void;
  onFieldReorder: (reorderedFields: QuestionnaireFieldFormData[]) => void;
  requiresOptions: (type: QuestionnaireFieldType) => boolean;
}

export const FieldsTab: React.FC<FieldsTabProps> = ({
  fields,
  errors,
  onAddField,
  onFieldChange,
  onRemoveField,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onFieldReorder,
  requiresOptions,
}) => {
  const renderFieldItem = (field: QuestionnaireFieldFormData) => {
    const fieldIndex = fields.findIndex((f) => f === field);

    return (
      <FieldEditor
        field={field}
        fieldIndex={fieldIndex}
        errors={errors}
        onFieldChange={onFieldChange}
        onRemoveField={onRemoveField}
        onOptionChange={onOptionChange}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
        requiresOptions={requiresOptions}
      />
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Questionnaire Fields</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onAddField}>
          Add Field
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Alert severity="info">
          No fields added yet. Click "Add Field" to create your first question.
        </Alert>
      ) : (
        <DraggableList
          items={fields}
          onReorder={onFieldReorder}
          renderItem={renderFieldItem}
          keyExtractor={(field) => field.id}
          showSaveButton={false}
          enableKeyboardReorder={true}
          emptyMessage="No fields added yet."
        />
      )}
    </Box>
  );
};
