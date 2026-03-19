import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Palette as PaletteIcon,
  Phone,
  AccountBalance,
  Description,
  Save as SaveIcon,
} from '@mui/icons-material';
import { ModernSettingsLayout } from '@/components/common/ModernPageLayout';
import { ModernPageHeader } from '@/components/common/ModernPageHeader';
import { useCompanySettingsLogic } from './useCompanySettingsLogic';
import { GeneralTab } from './GeneralTab';
import { BrandingTab } from './BrandingTab';
import { ContactTab } from './ContactTab';
import { BankingTab } from './BankingTab';
import { DocumentsTab } from './DocumentsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const CompanySettings: React.FC = () => {
  const {
    companySettings,
    formData,
    tabValue,
    hasChanges,
    logoPreview,
    logoDarkPreview,
    faviconPreview,
    removedFiles,
    isLoading,
    isUpdating,
    error,
    handleInputChange,
    handleFileChange,
    handleRemoveFile,
    handleSubmit,
    handleTabChange,
  } = useCompanySettingsLogic();

  if (isLoading) {
    return (
      <ModernSettingsLayout>
        <ModernPageHeader
          title="Company Settings"
          subtitle="Loading company settings..."
          icon={<BusinessIcon />}
          size="medium"
        />
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={200} />
        </Stack>
      </ModernSettingsLayout>
    );
  }

  if (error) {
    return (
      <ModernSettingsLayout>
        <ModernPageHeader
          title="Company Settings"
          subtitle="Configure your company branding and information"
          icon={<BusinessIcon />}
          size="medium"
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load company settings. Please try again later.
        </Alert>
      </ModernSettingsLayout>
    );
  }

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Company Settings"
        subtitle="Configure your company branding, contact information, and PDF settings"
        icon={<BusinessIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Account Management' },
          { label: 'Company Settings' },
        ]}
        size="medium"
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 500,
              textTransform: 'none',
            },
          }}
        >
          <Tab label="General" icon={<BusinessIcon />} iconPosition="start" />
          <Tab label="Branding" icon={<PaletteIcon />} iconPosition="start" />
          <Tab label="Contact" icon={<Phone />} iconPosition="start" />
          <Tab label="Banking" icon={<AccountBalance />} iconPosition="start" />
          <Tab label="Documents" icon={<Description />} iconPosition="start" />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        {/* General Tab */}
        <TabPanel value={tabValue} index={0}>
          <GeneralTab
            formData={formData}
            isUpdating={isUpdating}
            onInputChange={handleInputChange}
          />
        </TabPanel>

        {/* Branding Tab */}
        <TabPanel value={tabValue} index={1}>
          <BrandingTab
            formData={formData}
            companySettings={companySettings}
            isUpdating={isUpdating}
            logoPreview={logoPreview}
            logoDarkPreview={logoDarkPreview}
            faviconPreview={faviconPreview}
            removedFiles={removedFiles}
            onInputChange={handleInputChange}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
          />
        </TabPanel>

        {/* Contact Tab */}
        <TabPanel value={tabValue} index={2}>
          <ContactTab
            formData={formData}
            isUpdating={isUpdating}
            onInputChange={handleInputChange}
          />
        </TabPanel>

        {/* Banking Tab */}
        <TabPanel value={tabValue} index={3}>
          <BankingTab
            formData={formData}
            isUpdating={isUpdating}
            onInputChange={handleInputChange}
          />
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={4}>
          <DocumentsTab
            formData={formData}
            isUpdating={isUpdating}
            onInputChange={handleInputChange}
          />
        </TabPanel>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
          {hasChanges && (
            <Typography variant="body2" color="warning.main" sx={{ alignSelf: 'center' }}>
              You have unsaved changes
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={isUpdating || !hasChanges}
            startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </form>
    </ModernSettingsLayout>
  );
};

export default CompanySettings;
