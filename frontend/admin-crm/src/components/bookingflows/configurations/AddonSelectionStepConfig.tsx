// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ShoppingCart as AddonIcon,
  Category as CategoryIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  AddonSelectionStepConfiguration,
} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';

interface AddonSelectionStepConfigProps {
  step: BookingFlowStep;
  onUpdate?: (data: Partial<AddonSelectionStepConfiguration>) => void;
  isLoading?: boolean;
}

interface AddonConfigFormData {
  available_categories: number[];
  available_addons: number[];
  min_selection: number;
  max_selection: number;
  group_by_category: boolean;
  show_recommendations: boolean;
  recommendation_logic: Record<string, any>;
}

const defaultFormData: AddonConfigFormData = {
  available_categories: [],
  available_addons: [],
  min_selection: 0,
  max_selection: 0,
  group_by_category: true,
  show_recommendations: true,
  recommendation_logic: {},
};

export const AddonSelectionStepConfig: React.FC<AddonSelectionStepConfigProps> = ({
  step,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<AddonConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Use the evolved hooks from useBookingFlowStepConfiguration
  const {
    useStepConfiguration,
    useAvailableAddons,
    useAvailableCategories,
    updateConfiguration,
    isUpdatingConfiguration,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  // Fetch current configuration and available options
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
      // Type guard to ensure we have AddonSelectionStepConfiguration
      const addonConfig = configuration as AddonSelectionStepConfiguration;
      
      const newFormData: AddonConfigFormData = {
        available_categories: addonConfig.available_categories || [],
        available_addons: addonConfig.available_addons || [],
        min_selection: addonConfig.min_selection || 0,
        max_selection: addonConfig.max_selection || 0,
        group_by_category: addonConfig.group_by_category ?? true,
        show_recommendations: addonConfig.show_recommendations ?? true,
        recommendation_logic: addonConfig.recommendation_logic || {},
      };
      
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [configuration]);

  // Track changes
  useEffect(() => {
    if (configuration && configuration.id) {
      const addonConfig = configuration as AddonSelectionStepConfiguration;
      const currentData = JSON.stringify(formData);
      const originalData = JSON.stringify({
        available_categories: addonConfig.available_categories || [],
        available_addons: addonConfig.available_addons || [],
        min_selection: addonConfig.min_selection || 0,
        max_selection: addonConfig.max_selection || 0,
        group_by_category: addonConfig.group_by_category ?? true,
        show_recommendations: addonConfig.show_recommendations ?? true,
        recommendation_logic: addonConfig.recommendation_logic || {},
      });
      
      setHasChanges(currentData !== originalData);
    }
  }, [formData, configuration]);

  const handleInputChange = (field: keyof AddonConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
           { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSwitchChange = (field: keyof AddonConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleCategoriesChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      available_categories: value,
      // Clear specific addons when categories change (logical business rule)
      available_addons: [],
    }));
  };

  const handleAddonsChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      available_addons: value,
    }));
  };

  const handleRecommendationLogicChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setFormData(prev => ({
        ...prev,
        recommendation_logic: parsed,
      }));
      
      // Clear JSON parse error if it exists
      if (errors.recommendation_logic) {
        setErrors(prev => ({
          ...prev,
          recommendation_logic: '',
        }));
      }
    } catch {
      setErrors(prev => ({
        ...prev,
        recommendation_logic: 'Invalid JSON format',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Business validation: Must select either categories or specific addons
    if (formData.available_categories.length === 0 && formData.available_addons.length === 0) {
      newErrors.selection = 'Select either categories or specific add-ons';
    }

    // Numeric validation
    if (formData.min_selection < 0) {
      newErrors.min_selection = 'Minimum selection cannot be negative';
    }

    if (formData.max_selection > 0 && formData.max_selection < formData.min_selection) {
      newErrors.max_selection = 'Maximum selection must be greater than or equal to minimum';
    }

    // JSON validation for recommendation logic
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

    // Use the evolved updateConfiguration method
    updateConfiguration({
      stepId: step.id,
      data: {
        available_categories: formData.available_categories,
        available_addons: formData.available_addons,
        min_selection: formData.min_selection,
        max_selection: formData.max_selection,
        group_by_category: formData.group_by_category,
        show_recommendations: formData.show_recommendations,
        recommendation_logic: formData.recommendation_logic,
      }
    });

    // Call optional callback
    if (onUpdate) {
      onUpdate(formData);
    }
  };

  const handleReset = () => {
    if (configuration && configuration.id) {
      const addonConfig = configuration as AddonSelectionStepConfiguration;
      setFormData({
        available_categories: addonConfig.available_categories || [],
        available_addons: addonConfig.available_addons || [],
        min_selection: addonConfig.min_selection || 0,
        max_selection: addonConfig.max_selection || 0,
        group_by_category: addonConfig.group_by_category ?? true,
        show_recommendations: addonConfig.show_recommendations ?? true,
        recommendation_logic: addonConfig.recommendation_logic || {},
      });
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
  };

  // Loading states
  const isDataLoading = isLoadingConfig || isLoadingAddons || isLoadingCategories;
  const hasErrors = configError || addonsError || categoriesError || updateConfigurationError;

  // Error display
  if (hasErrors) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load configuration data. Please try refreshing the page.
          {updateConfigurationError && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Update Error: {updateConfigurationError.message}
            </Typography>
          )}
        </Alert>
        <Button startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add-on Selection Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure which add-on services are available for selection and how they are presented to clients.
      </Alert>

      <Stack spacing={3}>
        {/* Add-on Availability */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Available Add-ons
            </Typography>
            
            <Stack spacing={2}>
              {/* Categories Selection */}
              <FormControl fullWidth>
                <InputLabel>Filter by Categories</InputLabel>
                <Select
                  multiple
                  value={formData.available_categories}
                  onChange={(e) => handleCategoriesChange(e.target.value as number[])}
                  label="Filter by Categories"
                  disabled={isDataLoading}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((categoryId) => {
                        const category = availableCategories.find(c => c.id === categoryId);
                        return (
                          <Chip 
                            key={categoryId} 
                            label={category?.name || `Category ${categoryId}`} 
                            size="small" 
                            icon={<CategoryIcon />}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {isLoadingCategories ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading categories...
                    </MenuItem>
                  ) : (
                    availableCategories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        <Checkbox checked={formData.available_categories.includes(category.id)} />
                        <ListItemText 
                          primary={category.name}
                          secondary={category.description || `${category.sort_order} items`}
                        />
                      </MenuItem>
                    ))
                  )}
                </Select>
                <Typography variant="caption" color="text.secondary">
                  Show add-ons from selected categories. Leave empty to show all categories.
                </Typography>
              </FormControl>

              {/* Specific Add-ons Selection */}
              <FormControl fullWidth>
                <InputLabel>Specific Add-ons (Override)</InputLabel>
                <Select
                  multiple
                  value={formData.available_addons}
                  onChange={(e) => handleAddonsChange(e.target.value as number[])}
                  label="Specific Add-ons (Override)"
                  disabled={isDataLoading}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((addonId) => {
                        const addon = availableAddons.find(a => a.id === addonId);
                        return (
                          <Chip 
                            key={addonId} 
                            label={addon?.name || `Add-on ${addonId}`} 
                            size="small" 
                            icon={<AddonIcon />}
                            color={addon ? 'default' : 'error'}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {isLoadingAddons ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading add-ons...
                    </MenuItem>
                  ) : (
                    availableAddons.map((addon) => (
                      <MenuItem key={addon.id} value={addon.id}>
                        <Checkbox checked={formData.available_addons.includes(addon.id)} />
                        <ListItemText 
                          primary={addon.name}
                          secondary={`${addon.currency} ${addon.base_price} • ${addon.type}`}
                        />
                      </MenuItem>
                    ))
                  )}
                </Select>
                <Typography variant="caption" color="text.secondary">
                  Override category filtering with specific add-ons. This will ignore category selection.
                </Typography>
              </FormControl>

              {errors.selection && (
                <Alert severity="error">{errors.selection}</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Selection Behavior */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Selection Behavior
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" gap={2}>
                <TextField
                  label="Minimum Selection"
                  type="number"
                  value={formData.min_selection}
                  onChange={handleInputChange('min_selection')}
                  error={!!errors.min_selection}
                  helperText={errors.min_selection || 'Minimum add-ons clients must select (0 = none required)'}
                  inputProps={{ min: 0 }}
                  disabled={isDataLoading}
                  sx={{ flex: 1 }}
                />
                
                <TextField
                  label="Maximum Selection"
                  type="number"
                  value={formData.max_selection}
                  onChange={handleInputChange('max_selection')}
                  error={!!errors.max_selection}
                  helperText={errors.max_selection || 'Maximum add-ons allowed (0 = unlimited)'}
                  inputProps={{ min: 0 }}
                  disabled={isDataLoading}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Display Options
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.group_by_category}
                    onChange={handleSwitchChange('group_by_category')}
                    disabled={isDataLoading}
                  />
                }
                label="Group by Category"
              />
              <Typography variant="caption" color="text.secondary">
                Organize add-ons by their categories for better navigation
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_recommendations}
                    onChange={handleSwitchChange('show_recommendations')}
                    disabled={isDataLoading}
                  />
                }
                label="Show Recommendations"
              />
              <Typography variant="caption" color="text.secondary">
                Highlight recommended add-ons based on the client's selections
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Advanced Recommendations */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1">Recommendation Logic</Typography>
              {formData.show_recommendations && Object.keys(formData.recommendation_logic).length > 0 && (
                <Chip label="Configured" size="small" color="primary" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Alert severity="info">
                Configure intelligent recommendations to suggest relevant add-ons based on package selection, guest count, or other factors.
              </Alert>
              
              <TextField
                fullWidth
                label="Recommendation Logic (JSON)"
                value={JSON.stringify(formData.recommendation_logic, null, 2)}
                onChange={(e) => handleRecommendationLogicChange(e.target.value)}
                multiline
                rows={6}
                error={!!errors.recommendation_logic}
                helperText={errors.recommendation_logic || 'Define recommendation rules using JSON format'}
                disabled={!formData.show_recommendations || isDataLoading}
                placeholder={JSON.stringify({
                  "wedding_packages": ["photography", "videography"],
                  "guest_count_above_50": ["sound_equipment", "extra_tables"],
                  "outdoor_events": ["tent_rentals", "lighting"]
                }, null, 2)}
              />
              
              <Typography variant="body2" color="text.secondary">
                Example: Recommend photography for wedding packages, or sound equipment for events with 50+ guests
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Configuration Summary */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
            {isDataLoading ? (
              <Stack spacing={1}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="50%" />
              </Stack>
            ) : (
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Add-on Source:</strong>{' '}
                  {formData.available_addons.length > 0 
                    ? `${formData.available_addons.length} specific add-ons` 
                    : formData.available_categories.length > 0 
                      ? `${formData.available_categories.length} categories (${availableCategories.filter(c => formData.available_categories.includes(c.id)).map(c => c.name).join(', ')})`
                      : 'All add-ons'
                  }
                </Typography>
                
                <Typography variant="body2">
                  <strong>Selection:</strong> {formData.min_selection}-{formData.max_selection || '∞'} add-ons
                  {formData.min_selection === 0 && formData.max_selection === 0 && ' (optional)'}
                </Typography>
                
                <Typography variant="body2">
                  <strong>Display:</strong>{' '}
                  {[
                    formData.group_by_category && 'Grouped by Category',
                    formData.show_recommendations && 'Recommendations Enabled'
                  ].filter(Boolean).join(', ') || 'Basic display'}
                </Typography>
                
                {formData.show_recommendations && Object.keys(formData.recommendation_logic).length > 0 && (
                  <Typography variant="body2">
                    <strong>Recommendation Logic:</strong> Custom rules configured
                  </Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isLoading || isUpdatingConfiguration || isDataLoading || !hasChanges}
          >
            {isLoading || isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            disabled={isLoading || isUpdatingConfiguration || isDataLoading}
          >
            Reset Changes
          </Button>

          {hasChanges && (
            <Typography variant="caption" color="primary">
              Unsaved changes
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};