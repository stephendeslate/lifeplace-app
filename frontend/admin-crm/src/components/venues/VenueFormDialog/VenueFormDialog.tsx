import React from 'react';
import { Box } from '@mui/material';
import { ModernDialog, createDialogActions } from '@/components/common';
import { useVenueForm } from './useVenueForm';
import { BasicInfoSection } from './BasicInfoSection';
import { ImagesSection } from './ImagesSection';
import { StandalonePricingSection } from './StandalonePricingSection';
import { TimingRulesSection } from './TimingRulesSection';
import { IngressEgressSection } from './IngressEgressSection';
import { TimeConstraintsSection } from './TimeConstraintsSection';
import { EarlyLateFeesSection } from './EarlyLateFeesSection';
import type { VenueFormDialogProps } from './types';

export const VenueFormDialog: React.FC<VenueFormDialogProps> = ({
  open,
  onClose,
  editingVenue,
  onSubmit,
  isLoading,
}) => {
  const {
    formData,
    errors,
    expandedSections,
    handleInputChange,
    handleRulesChange,
    handleSwitchChange,
    handleRulesSwitchChange,
    toggleSection,
    handleFeaturedImageChange,
    handleGalleryImagesChange,
    handleSubmit,
  } = useVenueForm({ open, editingVenue, onSubmit });

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const actions = createDialogActions(handleClose, handleSubmit, {
    cancelLabel: 'Cancel',
    confirmLabel: editingVenue ? 'Update Venue' : 'Create Venue',
    isLoading,
    confirmDisabled: isLoading,
  });

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingVenue ? 'Edit Venue' : 'Create New Venue'}
      actions={actions}
      maxWidth="md"
      fullWidth
      contentSx={{ minHeight: '70vh' }}
    >
      {open && (
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <BasicInfoSection
            formData={formData}
            errors={errors}
            expanded={expandedSections.includes('basic')}
            onToggle={() => toggleSection('basic')}
            onInputChange={handleInputChange}
            onSwitchChange={handleSwitchChange}
          />

          <ImagesSection
            formData={formData}
            expanded={expandedSections.includes('images')}
            onToggle={() => toggleSection('images')}
            onFeaturedImageChange={handleFeaturedImageChange}
            onGalleryImagesChange={handleGalleryImagesChange}
          />

          <StandalonePricingSection
            formData={formData}
            expanded={expandedSections.includes('standalone-pricing')}
            onToggle={() => toggleSection('standalone-pricing')}
            onInputChange={handleInputChange}
            onSwitchChange={handleSwitchChange}
          />

          <TimingRulesSection
            formData={formData}
            expanded={expandedSections.includes('rules-timing')}
            onToggle={() => toggleSection('rules-timing')}
            onRulesChange={handleRulesChange}
            onRulesSwitchChange={handleRulesSwitchChange}
          />

          <IngressEgressSection
            formData={formData}
            expanded={expandedSections.includes('rules-ingress')}
            onToggle={() => toggleSection('rules-ingress')}
            onRulesChange={handleRulesChange}
            onRulesSwitchChange={handleRulesSwitchChange}
          />

          <TimeConstraintsSection
            formData={formData}
            expanded={expandedSections.includes('rules-constraints')}
            onToggle={() => toggleSection('rules-constraints')}
            onRulesChange={handleRulesChange}
            onRulesSwitchChange={handleRulesSwitchChange}
          />

          <EarlyLateFeesSection
            formData={formData}
            expanded={expandedSections.includes('rules-fees')}
            onToggle={() => toggleSection('rules-fees')}
            onRulesChange={handleRulesChange}
            onRulesSwitchChange={handleRulesSwitchChange}
          />
        </Box>
      )}
    </ModernDialog>
  );
};
