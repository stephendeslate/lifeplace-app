import { useState, useEffect } from 'react';
import { useEventTypes } from '@/hooks/useEvents';
import type {
  QuestionnaireFormDialogProps,
  QuestionnaireFormData,
  QuestionnaireFieldFormData,
  QuestionnaireFieldType,
  CreateQuestionnaireData,
  UpdateQuestionnaireData,
} from '@/types/questionnaires.types';

const defaultFormData: QuestionnaireFormData = {
  name: '',
  event_type: '',
  is_active: true,
  order: '1',
  fields: [],
};

const defaultFieldData: QuestionnaireFieldFormData = {
  id: '',
  name: '',
  type: 'text',
  required: false,
  order: 1,
  options: [],
  description: '',
  placeholder: '',
  is_guest_count: false,
  show_conditions: {},
  max_file_size_mb: 10,
  allowed_file_types: [],
  max_files: 1,
};

type DialogProps = Pick<
  QuestionnaireFormDialogProps,
  'open' | 'onClose' | 'editingQuestionnaire' | 'onSubmit' | 'isLoading'
>;

export function useQuestionnaireFormDialogLogic({
  open,
  onClose,
  editingQuestionnaire,
  onSubmit,
  isLoading,
}: DialogProps) {
  const [formData, setFormData] = useState<QuestionnaireFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<{ [key: string]: string }>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'fields'>('basic');

  // Fetch event types for the dropdown
  const { useActiveEventTypes } = useEventTypes();
  const {
    data: eventTypes = [],
    isLoading: isLoadingEventTypes,
    error: eventTypesError,
  } = useActiveEventTypes();

  useEffect(() => {
    if (open) {
      if (editingQuestionnaire) {
        setFormData({
          name: editingQuestionnaire.name || '',
          event_type: editingQuestionnaire.event_type?.toString() || '',
          is_active: editingQuestionnaire.is_active ?? true,
          order: editingQuestionnaire.order?.toString() || '1',
          fields:
            editingQuestionnaire.fields?.map((field, index) => ({
              id: field.id.toString(),
              name: field.name,
              type: field.type,
              required: field.required,
              order: field.order || index + 1,
              options: field.options || [],
              description: field.description || '',
              placeholder: field.placeholder || '',
              is_guest_count: field.is_guest_count || false,
              show_conditions: field.show_conditions || {},
              max_file_size_mb: field.max_file_size_mb || 10,
              allowed_file_types: field.allowed_file_types || [],
              max_files: field.max_files || 1,
            })) || [],
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setActiveTab('basic');
    }
  }, [editingQuestionnaire, open]);

  const handleInputChange =
    (field: keyof QuestionnaireFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof QuestionnaireFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleFieldChange = (
    index: number,
    field: keyof QuestionnaireFieldFormData,
    value: unknown,
  ) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }));

    // Clear field-specific errors
    const errorKey = `field_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: '',
      }));
    }
  };

  const handleAddField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          ...defaultFieldData,
          id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          order: prev.fields.length + 1,
        },
      ],
    }));
  };

  const handleRemoveField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (fieldIndex: number, optionIndex: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === fieldIndex
          ? {
              ...field,
              options: field.options.map((opt, oi) => (oi === optionIndex ? value : opt)),
            }
          : field,
      ),
    }));
  };

  const handleAddOption = (fieldIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === fieldIndex ? { ...field, options: [...field.options, ''] } : field,
      ),
    }));
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === fieldIndex
          ? {
              ...field,
              options: field.options.filter((_, oi) => oi !== optionIndex),
            }
          : field,
      ),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<{ [key: string]: string }> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.order || parseInt(formData.order) < 1) {
      newErrors.order = 'Order must be a positive number';
    }

    // Validate fields
    formData.fields.forEach((field, index) => {
      if (!field.name.trim()) {
        newErrors[`field_${index}_name`] = 'Field name is required';
      }

      if (
        (field.type === 'select' || field.type === 'multi-select') &&
        field.options.length === 0
      ) {
        newErrors[`field_${index}_options`] = 'Options are required for select fields';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateQuestionnaireData | UpdateQuestionnaireData = {
      name: formData.name.trim(),
      event_type: formData.event_type ? parseInt(formData.event_type) : null,
      is_active: formData.is_active,
      order: parseInt(formData.order) || 1,
      fields: formData.fields.map((field, index) => ({
        name: field.name.trim(),
        type: field.type,
        required: field.required,
        order: index + 1,
        options:
          field.type === 'select' || field.type === 'multi-select'
            ? field.options.filter((opt) => opt.trim())
            : null,
      })),
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const requiresOptions = (type: QuestionnaireFieldType) =>
    type === 'select' || type === 'multi-select';

  const handleFieldReorder = (reorderedFields: QuestionnaireFieldFormData[]) => {
    const fieldsWithUpdatedOrder = reorderedFields.map((field, index) => ({
      ...field,
      order: index + 1,
    }));

    setFormData((prev) => ({
      ...prev,
      fields: fieldsWithUpdatedOrder,
    }));
  };

  return {
    formData,
    errors,
    activeTab,
    setActiveTab,
    eventTypes,
    isLoadingEventTypes,
    eventTypesError,
    handleInputChange,
    handleSwitchChange,
    handleFieldChange,
    handleAddField,
    handleRemoveField,
    handleOptionChange,
    handleAddOption,
    handleRemoveOption,
    handleSubmit,
    handleClose,
    requiresOptions,
    handleFieldReorder,
  };
}
