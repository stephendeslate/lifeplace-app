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
import type { 
  BookingFlowStep} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import {
  IntroductionStepConfig,
  EventDetailsStepConfig,
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
    useStepPreview,
    updateConfiguration,
    isUpdatingConfiguration,
  } = useBookingFlowStepConfiguration();

  const { 
    data: currentConfig, 
    isLoading: isLoadingConfig,
    refetch: refetchConfig,
  } = useStepConfiguration(step.id);

  const { 
    data: previewData, 
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useStepPreview(step.id);

  // @ts-ignore
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleConfigurationUpdate = (data: Partial<any>) => {
    updateConfiguration({
      stepId: step.id,
      data
    }, {
      onSuccess: () => {
        refetchConfig();
        refetchPreview();
        if (onUpdate) {
          onUpdate(step);
        }
      }
    });
  };

  const renderStepSpecificConfiguration = () => {
    switch (step.step_type) {
      case 'introduction':
        return (
          <IntroductionStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').IntroductionStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      case 'event_details':
        return (
          <EventDetailsStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').EventDetailsStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
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
            config={currentConfig as import('../../../types/bookingflows.types').PackageSelectionStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      case 'addon_selection':
        return (
          <AddonSelectionStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').AddonSelectionStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      case 'contact_info':
        return (
          <ContactInfoStepConfig
            step={step}
            config={currentConfig as import('../../../types/bookingflows.types').ContactInfoStepConfiguration | null | undefined}
            onUpdate={handleConfigurationUpdate}
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
            onUpdate={handleConfigurationUpdate}
            isLoading={isUpdatingConfiguration}
          />
        );
      default:
        return <GenericConfigForm step={step} config={currentConfig} />;
    }
  };

  const renderPreview = () => {
    if (isLoadingPreview) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (!previewData) {
      return (
        <Alert severity="info">
          No preview available for this step type.
        </Alert>
      );
    }

    return (
      <Box>
        {/* Validation Status */}
        {previewData.validation && !previewData.validation.is_valid && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Configuration Issues
            </Typography>
            {previewData.validation.errors.map((error, index) => (
              <Typography key={index} variant="body2">
                • {error}
              </Typography>
            ))}
          </Alert>
        )}

        {previewData.validation && previewData.validation.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Configuration Warnings
            </Typography>
            {previewData.validation.warnings.map((warning, index) => (
              <Typography key={index} variant="body2">
                • {warning}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Preview Elements */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Step Preview: {step.name}
            </Typography>
            
            {previewData.preview_elements && previewData.preview_elements.length > 0 ? (
              <Box>
                {previewData.preview_elements.map((element, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                      {JSON.stringify(element, null, 2)}
                    </pre>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No preview elements configured for this step.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

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
              <IconButton size="small">
                <CopyIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh preview">
              <IconButton 
                size="small"
                onClick={() => {
                  refetchConfig();
                  refetchPreview();
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tabs */}
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