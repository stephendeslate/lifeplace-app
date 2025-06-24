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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ShoppingCart as AddonIcon,
  Category as CategoryIcon,
  Recommend as RecommendIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  AddonSelectionStepConfiguration,
} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';

interface AddonSelectionStepConfigProps {
  step: BookingFlowStep;
  config?: AddonSelectionStepConfiguration | null;
  onUpdate: (data: Partial<AddonSelectionStepConfiguration>) => void;
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
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<AddonConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    useAvailableAddons,
    useAvailableCategories,
    configureAddons,
    isConfiguringAddons,
  } = useBookingFlowStepConfiguration();

  const { data: availableAddons = [] } = useAvailableAddons(step.id);
  const { data: availableCategories = [] } = useAvailableCategories(step.id);

  useEffect(() => {
    if (config) {
      setFormData({
        available_categories: config.available_categories || [],
        available_addons: config.available_addons || [],
        min_selection: config.min_selection || 0,
        max_selection: config.max_selection || 0,
        group_by_category: config.group_by_category ?? true,
        show_recommendations: config.show_recommendations ?? true,
        recommendation_logic: config.recommendation_logic || {},
      });
    }
  }, [config]);

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
      // Clear specific addons when categories change
      available_addons: [],
    }));
  };

  const handleAddonsChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      available_addons: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.available_categories.length === 0 && formData.available_addons.length === 0) {
      newErrors.addons = 'Select either categories or specific add-ons';
    }

    if (formData.min_selection < 0) {
      newErrors.min_selection = 'Minimum selection cannot be negative';
    }

    if (formData.max_selection > 0 && formData.max_selection < formData.min_selection) {
      newErrors.max_selection = 'Maximum selection must be greater than or equal to minimum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    configureAddons({
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
  };

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
                  {availableCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Checkbox checked={formData.available_categories.includes(category.id)} />
                      <ListItemText primary={category.name} />
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary">
                  Show add-ons from selected categories
                </Typography>
              </FormControl>

              {/* Specific Add-ons Selection */}
              <FormControl fullWidth>
                <InputLabel>Specific Add-ons (Optional)</InputLabel>
                <Select
                  multiple
                  value={formData.available_addons}
                  onChange={(e) => handleAddonsChange(e.target.value as number[])}
                  label="Specific Add-ons (Optional)"
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
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {availableAddons.map((addon) => (
                    <MenuItem key={addon.id} value={addon.id}>
                      <Checkbox checked={formData.available_addons.includes(addon.id)} />
                      <ListItemText 
                        primary={addon.name}
                        secondary={`${addon.base_price}`}
                      />
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary">
                  Override category filtering with specific add-ons
                </Typography>
              </FormControl>

              {errors.addons && (
                <Alert severity="error">{errors.addons}</Alert>
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
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      recommendation_logic: parsed,
                    }));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                multiline
                rows={4}
                helperText="Define recommendation rules (e.g., suggest specific add-ons for certain packages or guest counts)"
                disabled={!formData.show_recommendations}
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
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Add-on Source:</strong>{' '}
                {formData.available_addons.length > 0 
                  ? `${formData.available_addons.length} specific add-ons` 
                  : formData.available_categories.length > 0 
                    ? `${formData.available_categories.length} categories`
                    : 'All add-ons'
                }
              </Typography>
              
              <Typography variant="body2">
                <strong>Selection:</strong> {formData.min_selection}-{formData.max_selection || '∞'} add-ons
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
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || isConfiguringAddons}
          >
            {isLoading || isConfiguringAddons ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};