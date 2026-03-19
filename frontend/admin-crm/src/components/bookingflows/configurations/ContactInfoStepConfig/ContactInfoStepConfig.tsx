import React from 'react';
import { Box, Typography, Stack, Alert, Button } from '@mui/material';
import type { ContactInfoStepConfigProps } from './types';
import { useContactInfoStepConfigLogic } from './useContactInfoStepConfigLogic';
import { StandardFieldsSection } from './StandardFieldsSection';
import { CustomFieldsSection } from './CustomFieldsSection';
import { AccountCreationSection } from './AccountCreationSection';
import { ConfigurationSummary } from './ConfigurationSummary';
import { CustomFieldDialog } from './CustomFieldDialog';

export const ContactInfoStepConfig: React.FC<ContactInfoStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const {
    formData,
    customFieldDialogOpen,
    setCustomFieldDialogOpen,
    editingField,
    currentlyLoading,
    handleSwitchChange,
    handleAddCustomField,
    handleEditCustomField,
    handleSaveCustomField,
    handleDeleteCustomField,
    handleSave,
    handleResetDefaults,
    getRequiredFieldsCount,
  } = useContactInfoStepConfigLogic(step, config, onUpdate, isLoading);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Contact Information Step Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure what contact information to collect from clients and whether to offer account
        creation.
      </Alert>

      <Stack spacing={3}>
        <StandardFieldsSection
          formData={formData}
          handleSwitchChange={handleSwitchChange}
          disabled={currentlyLoading}
        />

        <CustomFieldsSection
          customFields={formData.custom_fields}
          onAdd={handleAddCustomField}
          onEdit={handleEditCustomField}
          onDelete={handleDeleteCustomField}
          disabled={currentlyLoading}
        />

        <AccountCreationSection
          formData={formData}
          handleSwitchChange={handleSwitchChange}
          disabled={currentlyLoading}
        />

        <ConfigurationSummary formData={formData} requiredFieldsCount={getRequiredFieldsCount()} />

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={handleSave} disabled={currentlyLoading}>
            {currentlyLoading ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button variant="outlined" onClick={handleResetDefaults} disabled={currentlyLoading}>
            Reset to Defaults
          </Button>
        </Box>
      </Stack>

      <CustomFieldDialog
        open={customFieldDialogOpen}
        onClose={() => setCustomFieldDialogOpen(false)}
        editingField={editingField}
        onSave={handleSaveCustomField}
        disabled={currentlyLoading}
      />
    </Box>
  );
};
