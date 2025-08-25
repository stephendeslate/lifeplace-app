// frontend/admin-crm/src/components/bookingflows/configurations/PricingSummaryStepConfig.tsx

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
  Skeleton,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Percent as DiscountIcon,
  Calculate as CalculateIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  PricingSummaryStepConfiguration 
} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';

interface PricingSummaryStepConfigProps {
  step: BookingFlowStep;
  config?: PricingSummaryStepConfiguration | null;
  onUpdate: (data: Record<string, any>) => void;
  isLoading?: boolean;
}

interface PricingSummaryConfigFormData {
  show_package_breakdown: boolean;
  show_addon_breakdown: boolean;
  show_tax_breakdown: boolean;
  show_discount_field: boolean;
  show_subtotal: boolean;
  allow_discount_codes: boolean;
  calculate_tax: boolean;
  header_text: string;
  footer_text: string;
  discount_help_text: string;
}

const defaultFormData: PricingSummaryConfigFormData = {
  show_package_breakdown: true,
  show_addon_breakdown: true,
  show_tax_breakdown: true,
  show_discount_field: true,
  show_subtotal: true,
  allow_discount_codes: true,
  calculate_tax: true,
  header_text: 'Review your order',
  footer_text: '',
  discount_help_text: 'Enter discount code',
};

export const PricingSummaryStepConfig: React.FC<PricingSummaryStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PricingSummaryConfigFormData>(defaultFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    updateConfiguration,
  } = useBookingFlowStepConfiguration();

  // Initialize form data from config
  useEffect(() => {
    if (config) {
      setFormData({
        show_package_breakdown: config.show_package_breakdown ?? defaultFormData.show_package_breakdown,
        show_addon_breakdown: config.show_addon_breakdown ?? defaultFormData.show_addon_breakdown,
        show_tax_breakdown: config.show_tax_breakdown ?? defaultFormData.show_tax_breakdown,
        show_discount_field: config.show_discount_field ?? defaultFormData.show_discount_field,
        show_subtotal: config.show_subtotal ?? defaultFormData.show_subtotal,
        allow_discount_codes: config.allow_discount_codes ?? defaultFormData.allow_discount_codes,
        calculate_tax: config.calculate_tax ?? defaultFormData.calculate_tax,
        header_text: config.header_text || defaultFormData.header_text,
        footer_text: config.footer_text || defaultFormData.footer_text,
        discount_help_text: config.discount_help_text || defaultFormData.discount_help_text,
      });
      setHasUnsavedChanges(false);
    } else {
      setFormData(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [config]);

  const handleFormChange = (field: keyof PricingSummaryConfigFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await updateConfiguration({
        stepId: step.id,
        data: formData
      });
      
      setHasUnsavedChanges(false);
      
      // Call parent callback
      onUpdate(formData);
    } catch (error) {
      console.error('Failed to save pricing summary configuration:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        show_package_breakdown: config.show_package_breakdown ?? defaultFormData.show_package_breakdown,
        show_addon_breakdown: config.show_addon_breakdown ?? defaultFormData.show_addon_breakdown,
        show_tax_breakdown: config.show_tax_breakdown ?? defaultFormData.show_tax_breakdown,
        show_discount_field: config.show_discount_field ?? defaultFormData.show_discount_field,
        show_subtotal: config.show_subtotal ?? defaultFormData.show_subtotal,
        allow_discount_codes: config.allow_discount_codes ?? defaultFormData.allow_discount_codes,
        calculate_tax: config.calculate_tax ?? defaultFormData.calculate_tax,
        header_text: config.header_text || defaultFormData.header_text,
        footer_text: config.footer_text || defaultFormData.footer_text,
        discount_help_text: config.discount_help_text || defaultFormData.discount_help_text,
      });
    } else {
      setFormData(defaultFormData);
    }
    setHasUnsavedChanges(false);
    setSaveError(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="rectangular" height={120} />
            <Skeleton variant="rectangular" height={60} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6" component="h2">
            Pricing Summary Configuration
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Configure how pricing information is displayed to customers during the booking process.
        </Typography>

        {/* Error Display */}
        {saveError && (
          <Alert severity="error">
            {saveError}
          </Alert>
        )}

        {/* Display Options */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PreviewIcon />
              Display Options
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_package_breakdown}
                      onChange={(e) => handleFormChange('show_package_breakdown', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Show Package Breakdown"
                />
              </Box>
              
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_addon_breakdown}
                      onChange={(e) => handleFormChange('show_addon_breakdown', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Show Add-on Breakdown"
                />
              </Box>
              
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_tax_breakdown}
                      onChange={(e) => handleFormChange('show_tax_breakdown', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Show Tax Breakdown"
                />
              </Box>
              
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_subtotal}
                      onChange={(e) => handleFormChange('show_subtotal', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Show Subtotal"
                />
              </Box>
              
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_discount_field}
                      onChange={(e) => handleFormChange('show_discount_field', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Show Discount Field"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Behavior Options */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalculateIcon />
              Behavior Options
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allow_discount_codes}
                      onChange={(e) => handleFormChange('allow_discount_codes', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Allow Discount Codes"
                />
              </Box>
              
              <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.calculate_tax}
                      onChange={(e) => handleFormChange('calculate_tax', e.target.checked)}
                      disabled={isSaving}
                    />
                  }
                  label="Calculate Tax"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Custom Messaging */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DiscountIcon />
              Custom Messaging
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Header Text"
                value={formData.header_text}
                onChange={(e) => handleFormChange('header_text', e.target.value)}
                disabled={isSaving}
                fullWidth
                placeholder="Review your order"
              />
              
              <TextField
                label="Footer Text"
                value={formData.footer_text}
                onChange={(e) => handleFormChange('footer_text', e.target.value)}
                disabled={isSaving}
                fullWidth
                multiline
                rows={3}
                placeholder="Optional footer message (e.g., terms and conditions)"
              />
              
              <TextField
                label="Discount Help Text"
                value={formData.discount_help_text}
                onChange={(e) => handleFormChange('discount_help_text', e.target.value)}
                disabled={isSaving}
                fullWidth
                placeholder="Enter discount code"
                helperText="Text shown in or near the discount code field"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || isSaving}
            startIcon={<RefreshIcon />}
          >
            Reset
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            startIcon={<SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>

        {hasUnsavedChanges && (
          <Alert severity="info">
            You have unsaved changes. Click "Save Configuration" to apply them.
          </Alert>
        )}
      </Stack>
    </Box>
  );
};