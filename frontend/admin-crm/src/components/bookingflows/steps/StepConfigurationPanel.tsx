// frontend/admin-crm/src/components/bookingflows/steps/StepConfigurationPanel.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings as ConfigIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import type { BookingFlowStep } from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import {
  IntroductionStepConfig,
  DateTimeStepConfig,
  QuestionnaireStepConfig,
  PackageSelectionStepConfig,
  AddonSelectionStepConfig,
  ContactInfoStepConfig,
  PaymentInfoStepConfig,
  ConfirmationStepConfig,
} from '../configurations';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`step-config-tabpanel-${index}`}
    aria-labelledby={`step-config-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

interface StepConfigurationPanelProps {
  step: BookingFlowStep;
  onUpdate?: (step: BookingFlowStep) => void;
}

export const StepConfigurationPanel: React.FC<StepConfigurationPanelProps> = ({
  step,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const {
    useStepConfiguration,
    updateConfiguration,
    isUpdatingConfiguration,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  const { 
    data: currentConfig, 
    isLoading: isLoadingConfig,
    refetch: refetchConfig,
    error: configError,
  } = useStepConfiguration(step.id);

  // @ts-ignore
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleConfigurationUpdate = async (data: Record<string, any>) => {
    try {
      await updateConfiguration({
        stepId: step.id,
        data
      });
      
      // Refetch to get latest config
      refetchConfig();
      
      // Call parent callback if provided
      if (onUpdate) {
        // Create updated step object for parent callback
        const updatedStep: BookingFlowStep = {
          ...step,
          configuration_data: {
            ...(currentConfig as import('../../../types/bookingflows.types').StepConfiguration),
            ...data,
          } as import('../../../types/bookingflows.types').StepConfiguration,
        };
        onUpdate(updatedStep);
      }
    } catch (error) {
      console.error('Failed to update step configuration:', error);
    }
  };

  const renderStepSpecificConfiguration = () => {
    // Block access to removed step types
    if (step.step_type as string === 'availability_check') {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          Availability check step type is no longer supported. Please use the date_time step with availability checking enabled instead.
        </Alert>
      );
    }

    switch (step.step_type) {
      case 'introduction':
        return (
          <IntroductionStepConfig
            step={step}
            onConfigurationChange={() => refetchConfig()}
          />
        );
      
      case 'date_time':
        return (
          <DateTimeStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').DateTimeStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      case 'questionnaire':
        return (
          <QuestionnaireStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').QuestionnaireStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      case 'package_selection':
        return (
          <PackageSelectionStepConfig
            step={step}
            onUpdate={() => refetchConfig()}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      case 'addon_selection':
        return (
          <AddonSelectionStepConfig
            step={step}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      case 'contact_info':
        return (
          <ContactInfoStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').ContactInfoStepConfiguration | null | undefined}
            onUpdate={onUpdate || (() => {})}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      case 'payment_info':
        return (
          <PaymentInfoStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').PaymentInfoStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      case 'confirmation':
        return (
          <ConfirmationStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').ConfirmationStepConfiguration | null | undefined}
            onUpdate={onUpdate || (() => {})}
            isLoading={isUpdatingConfiguration}
          />
        );
      
      // Remove event_details case since it doesn't exist in the evolved types
      // Remove pricing_summary and review_booking cases since they have no specific configs
      
      default:
        return <GenericConfigForm step={step} config={currentConfig} />;
    }
  };

  const renderPreview = () => {
    // Preview functionality not implemented in the evolved backend
    // Only show configuration tab for now
    return (
      <Alert severity="info">
        Step preview functionality will be available in a future update.
      </Alert>
    );
  };

  // Error handling
  if (configError) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={() => refetchConfig()}
              >
                <RefreshIcon />
              </IconButton>
            }
          >
            Failed to load step configuration: {configError instanceof Error ? configError.message : 'Unknown error'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <ConfigIcon color="primary" />
            <Typography variant="h6">
              Configure {step.step_type_display}
            </Typography>
            <Chip
              label={step.step_type}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Copy configuration from another step">
              <span>
                <IconButton size="small" disabled>
                  <CopyIcon />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Refresh configuration">
              <IconButton 
                size="small"
                onClick={() => refetchConfig()}
                disabled={isLoadingConfig}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Show update errors */}
        {updateConfigurationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to update configuration: {updateConfigurationError instanceof Error ? updateConfigurationError.message : 'Unknown error'}
          </Alert>
        )}

        {/* Tabs - Only show configuration tab for now since preview isn't implemented */}
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab 
            icon={<ConfigIcon />} 
            label="Configuration" 
            iconPosition="start"
          />
          <Tab 
            icon={<PreviewIcon />} 
            label="Preview" 
            iconPosition="start"
            disabled
          />
        </Tabs>

        <Divider sx={{ mb: 2 }} />

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          {renderStepSpecificConfiguration()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderPreview()}
        </TabPanel>
      </CardContent>
    </Card>
  );
};

// Generic configuration form for unsupported step types
const GenericConfigForm: React.FC<{ step: BookingFlowStep; config: any }> = ({ step, config }) => (
  <Box>
    <Alert severity="info" sx={{ mb: 2 }}>
      Configuration for "{step.step_type_display}" step type is not yet implemented.
    </Alert>
    
    <Typography variant="body2" color="text.secondary">
      This step will use default settings and behavior. Custom configuration will be available in a future update.
    </Typography>
    
    {config && (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Current Configuration (Raw Data)
        </Typography>
        <Box 
          sx={{ 
            p: 2, 
            border: 1, 
            borderColor: 'divider', 
            borderRadius: 1,
            backgroundColor: 'grey.50',
            overflow: 'auto'
          }}
        >
          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        </Box>
      </Box>
    )}
  </Box>
);