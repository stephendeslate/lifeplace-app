import { useState, useEffect } from 'react';
import type { BookingFlowStep, ContactInfoStepConfiguration } from '@/types/bookingflows';
import { useBookingFlowStepConfiguration } from '@/hooks/useBookingFlows';
import { useFormHandlers } from '@/hooks/useFormHandlers';
import type { ContactInfoConfigFormData, CustomField } from './types';
import { defaultFormData } from './types';

export function useContactInfoStepConfigLogic(
  step: BookingFlowStep,
  config: ContactInfoStepConfiguration | null | undefined,
  onUpdate: (updatedStep: BookingFlowStep) => void,
  isLoading: boolean,
) {
  const [formData, setFormData] = useState<ContactInfoConfigFormData>(defaultFormData);
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleSwitchChange } = useFormHandlers(setFormData, errors, setErrors);

  const { updateConfiguration, isUpdatingConfiguration } = useBookingFlowStepConfiguration();

  useEffect(() => {
    if (config) {
      setFormData({
        require_full_name: config.require_full_name ?? true,
        require_email: config.require_email ?? true,
        require_phone: config.require_phone ?? true,
        require_address: config.require_address ?? false,
        require_company: config.require_company ?? false,
        custom_fields: (config.custom_fields || []).map(
          (
            field: { name: string; type: string; required: boolean; placeholder?: string } & {
              id?: string;
            },
          ) => ({ ...field, id: field.id || Date.now().toString() + Math.random() }),
        ),
        offer_account_creation: config.offer_account_creation ?? true,
        require_account_creation: config.require_account_creation ?? false,
      });
    }
  }, [config]);

  const handleAddCustomField = () => {
    setEditingField(null);
    setCustomFieldDialogOpen(true);
  };

  const handleEditCustomField = (field: CustomField) => {
    setEditingField(field);
    setCustomFieldDialogOpen(true);
  };

  const handleSaveCustomField = (field: CustomField) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: editingField
        ? prev.custom_fields.map((f) => (f.id === editingField.id ? field : f))
        : [...prev.custom_fields, { ...field, id: Date.now().toString() }],
    }));
    setCustomFieldDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteCustomField = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((f) => f.id !== fieldId),
    }));
  };

  const handleSave = () => {
    updateConfiguration(
      {
        stepId: step.id,
        data: {
          require_full_name: formData.require_full_name,
          require_email: formData.require_email,
          require_phone: formData.require_phone,
          require_address: formData.require_address,
          require_company: formData.require_company,
          custom_fields: formData.custom_fields,
          offer_account_creation: formData.offer_account_creation,
          require_account_creation: formData.require_account_creation,
        },
      },
      {
        onSuccess: () => {
          const updatedStep: BookingFlowStep = {
            ...step,
            configuration_data: {
              ...config,
              require_full_name: formData.require_full_name,
              require_email: formData.require_email,
              require_phone: formData.require_phone,
              require_address: formData.require_address,
              require_company: formData.require_company,
              custom_fields: formData.custom_fields,
              offer_account_creation: formData.offer_account_creation,
              require_account_creation: formData.require_account_creation,
            } as ContactInfoStepConfiguration,
          };
          onUpdate(updatedStep);
        },
      },
    );
  };

  const handleResetDefaults = () => {
    setFormData(defaultFormData);
  };

  const getRequiredFieldsCount = () => {
    return (
      [
        formData.require_full_name,
        formData.require_email,
        formData.require_phone,
        formData.require_address,
        formData.require_company,
      ].filter(Boolean).length + formData.custom_fields.filter((f) => f.required).length
    );
  };

  const currentlyLoading = isLoading || isUpdatingConfiguration;

  return {
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
  };
}
