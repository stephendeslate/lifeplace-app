// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/useAddonSelectionStepConfigLogic.ts

import { useState, useEffect } from 'react';
import type { AddonSelectionStepConfiguration } from '@/types/bookingflows';
import { useBookingFlowStepConfiguration } from '@/hooks/useBookingFlows';
import type { AddonConfigFormData, AddonSelectionStepConfigProps } from './types';
import { defaultFormData } from './types';

function toFormData(addonConfig: AddonSelectionStepConfiguration): AddonConfigFormData {
  return {
    available_categories: addonConfig.available_categories || [],
    available_addons: addonConfig.available_addons || [],
    min_selection: addonConfig.min_selection || 0,
    max_selection: addonConfig.max_selection || 0,
    filter_by_event_type: addonConfig.filter_by_event_type ?? true,
    group_by_category: addonConfig.group_by_category ?? true,
    show_recommendations: addonConfig.show_recommendations ?? true,
    recommendation_logic: addonConfig.recommendation_logic || {},
  };
}

export function useAddonSelectionStepConfigLogic({
  step,
  onUpdate,
}: AddonSelectionStepConfigProps) {
  const [formData, setFormData] = useState<AddonConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const {
    useStepConfiguration,
    useAvailableAddons,
    useAvailableCategories,
    updateConfiguration,
    isUpdatingConfiguration,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  const {
    data: configuration,
    isLoading: isLoadingConfig,
    error: configError,
  } = useStepConfiguration(step.id);

  const {
    data: availableAddons = [],
    isLoading: isLoadingAddons,
    error: addonsError,
  } = useAvailableAddons(step.id);

  const {
    data: availableCategories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useAvailableCategories(step.id);

  // Initialize form data when configuration loads
  useEffect(() => {
    if (configuration && configuration.id) {
      const addonConfig = configuration as AddonSelectionStepConfiguration;
      setFormData(toFormData(addonConfig));
      setHasChanges(false);
    }
  }, [configuration]);

  // Track changes
  useEffect(() => {
    if (configuration && configuration.id) {
      const addonConfig = configuration as AddonSelectionStepConfiguration;
      const currentData = JSON.stringify(formData);
      const originalData = JSON.stringify(toFormData(addonConfig));
      setHasChanges(currentData !== originalData);
    }
  }, [formData, configuration]);

  const handleInputChange =
    (field: keyof AddonConfigFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };

  const handleSwitchChange =
    (field: keyof AddonConfigFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.checked }));
    };

  const handleCategoriesChange = (value: number[]) => {
    setFormData((prev) => ({
      ...prev,
      available_categories: value,
      // Clear specific addons when categories change (logical business rule)
      available_addons: [],
    }));
  };

  const handleAddonsChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, available_addons: value }));
  };

  const handleRecommendationLogicChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setFormData((prev) => ({ ...prev, recommendation_logic: parsed }));

      if (errors.recommendation_logic) {
        setErrors((prev) => ({ ...prev, recommendation_logic: '' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, recommendation_logic: 'Invalid JSON format' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (
      !formData.filter_by_event_type &&
      formData.available_categories.length === 0 &&
      formData.available_addons.length === 0
    ) {
      newErrors.selection =
        'Select either categories, specific add-ons, or enable "Filter by Event Type"';
    }

    if (formData.min_selection < 0) {
      newErrors.min_selection = 'Minimum selection cannot be negative';
    }

    if (formData.max_selection > 0 && formData.max_selection < formData.min_selection) {
      newErrors.max_selection = 'Maximum selection must be greater than or equal to minimum';
    }

    if (formData.show_recommendations) {
      try {
        JSON.stringify(formData.recommendation_logic);
      } catch {
        newErrors.recommendation_logic = 'Invalid recommendation logic format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    updateConfiguration({
      stepId: step.id,
      data: {
        available_categories: formData.available_categories,
        available_addons: formData.available_addons,
        min_selection: formData.min_selection,
        max_selection: formData.max_selection,
        filter_by_event_type: formData.filter_by_event_type,
        group_by_category: formData.group_by_category,
        show_recommendations: formData.show_recommendations,
        recommendation_logic: formData.recommendation_logic,
      },
    });

    if (onUpdate) {
      onUpdate(formData);
    }
  };

  const handleReset = () => {
    if (configuration && configuration.id) {
      const addonConfig = configuration as AddonSelectionStepConfiguration;
      setFormData(toFormData(addonConfig));
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
  };

  const isDataLoading = isLoadingConfig || isLoadingAddons || isLoadingCategories;
  const hasErrors = configError || addonsError || categoriesError || updateConfigurationError;

  return {
    formData,
    errors,
    hasChanges,
    isDataLoading,
    hasErrors,
    isUpdatingConfiguration,
    updateConfigurationError,
    availableAddons,
    availableCategories,
    isLoadingAddons,
    isLoadingCategories,
    handleInputChange,
    handleSwitchChange,
    handleCategoriesChange,
    handleAddonsChange,
    handleRecommendationLogicChange,
    handleSave,
    handleReset,
  };
}
