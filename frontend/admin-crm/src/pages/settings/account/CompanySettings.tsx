// frontend/admin-crm/src/pages/settings/account/CompanySettings.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
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
  Email,
  Phone,
  Language,
  Facebook,
  Instagram,
  Palette as PaletteIcon,
  LocationOn,
  AccountBalance,
  Description,
  Save as SaveIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useCompanySettings } from '../../../hooks/useSettings';
import type { CompanySettingsUpdateData } from '../../../types/settings.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernPageHeader } from '../../../components/common/ModernPageHeader';

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
  const { setBreadcrumbs } = useLayout();
  const {
    companySettings,
    isLoading,
    isUpdating,
    error,
    updateCompanySettings,
  } = useCompanySettings();

  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<CompanySettingsUpdateData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // File upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Account Management' },
      { label: 'Company Settings' },
    ]);
  }, [setBreadcrumbs]);

  // Initialize form data from company settings
  useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name || '',
        company_tagline: companySettings.company_tagline || '',
        primary_color: companySettings.primary_color || '#2c5aa0',
        secondary_color: companySettings.secondary_color || '#1e3a5f',
        accent_color: companySettings.accent_color || '#f5a623',
        email: companySettings.email || '',
        support_email: companySettings.support_email || '',
        phone: companySettings.phone || '',
        phone_secondary: companySettings.phone_secondary || '',
        address_line1: companySettings.address_line1 || '',
        address_line2: companySettings.address_line2 || '',
        city: companySettings.city || '',
        province: companySettings.province || '',
        postal_code: companySettings.postal_code || '',
        country: companySettings.country || '',
        business_registration_number: companySettings.business_registration_number || '',
        vat_number: companySettings.vat_number || '',
        website: companySettings.website || '',
        facebook_url: companySettings.facebook_url || '',
        instagram_url: companySettings.instagram_url || '',
        pdf_footer_text: companySettings.pdf_footer_text || '',
        invoice_terms: companySettings.invoice_terms || '',
        receipt_terms: companySettings.receipt_terms || '',
        bank_name: companySettings.bank_name || '',
        bank_account_name: companySettings.bank_account_name || '',
        bank_account_number: companySettings.bank_account_number || '',
        bank_branch: companySettings.bank_branch || '',
        bank_swift_code: companySettings.bank_swift_code || '',
      });
      setHasChanges(false);
    }
  }, [companySettings]);

  const handleInputChange = (field: keyof CompanySettingsUpdateData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleFileChange = (field: 'logo' | 'logo_dark' | 'favicon') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        if (field === 'logo') setLogoPreview(preview);
        else if (field === 'logo_dark') setLogoDarkPreview(preview);
        else if (field === 'favicon') setFaviconPreview(preview);
      };
      reader.readAsDataURL(file);

      // Update form data
      setFormData(prev => ({
        ...prev,
        [field]: file,
      }));
      setHasChanges(true);
    }
  };

  const handleRemoveFile = (field: 'logo' | 'logo_dark' | 'favicon') => {
    if (field === 'logo') setLogoPreview(null);
    else if (field === 'logo_dark') setLogoDarkPreview(null);
    else if (field === 'favicon') setFaviconPreview(null);

    setFormData(prev => ({
      ...prev,
      [field]: null,
    }));
    setHasChanges(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateCompanySettings(formData);
    setHasChanges(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const textFieldSx = {};

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
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Company Information</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Basic information about your company</Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Company Name"
                value={formData.company_name || ''}
                onChange={handleInputChange('company_name')}
                disabled={isUpdating}
                sx={textFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Company Tagline"
                value={formData.company_tagline || ''}
                onChange={handleInputChange('company_tagline')}
                disabled={isUpdating}
                helperText="A short slogan or description of your business"
                sx={textFieldSx}
              />

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Business Registration Number"
                  value={formData.business_registration_number || ''}
                  onChange={handleInputChange('business_registration_number')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="VAT Number"
                  value={formData.vat_number || ''}
                  onChange={handleInputChange('vat_number')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                />
              </Box>

              <TextField
                fullWidth
                label="Website"
                value={formData.website || ''}
                onChange={handleInputChange('website')}
                disabled={isUpdating}
                placeholder="https://yourcompany.com"
                sx={textFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Language color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Box>
        </TabPanel>

        {/* Branding Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Logo Upload Section */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Company Logos</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Upload your company logos for PDFs and documents</Typography>
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Upload your company logos. These will appear on quotes, contracts, invoices, and other generated documents.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Main Logo */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Primary Logo
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'background.paper',
                      position: 'relative',
                      minHeight: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {logoPreview || companySettings?.logo_url ? (
                      <>
                        <Box
                          component="img"
                          src={logoPreview || companySettings?.logo_url || ''}
                          alt="Company Logo"
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 100,
                            objectFit: 'contain',
                            mb: 2,
                          }}
                        />
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveFile('logo')}
                          disabled={isUpdating}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          No logo uploaded
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          disabled={isUpdating}
                        >
                          Upload Logo
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleFileChange('logo')}
                          />
                        </Button>
                      </>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Used on light backgrounds (PNG or SVG recommended)
                  </Typography>
                </Box>

                {/* Dark Logo */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Dark Mode Logo (Optional)
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: '#1a1a2e',
                      position: 'relative',
                      minHeight: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {logoDarkPreview || companySettings?.logo_dark ? (
                      <>
                        <Box
                          component="img"
                          src={logoDarkPreview || companySettings?.logo_dark_url || ''}
                          alt="Company Logo Dark"
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 100,
                            objectFit: 'contain',
                            mb: 2,
                          }}
                        />
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveFile('logo_dark')}
                          disabled={isUpdating}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <ImageIcon sx={{ fontSize: 48, color: 'grey.600', mb: 1 }} />
                        <Typography variant="body2" sx={{ color: 'grey.400', mb: 2 }}>
                          No dark logo uploaded
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          disabled={isUpdating}
                          sx={{ color: 'grey.300', borderColor: 'grey.600' }}
                        >
                          Upload Logo
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleFileChange('logo_dark')}
                          />
                        </Button>
                      </>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Used on dark backgrounds (white or light-colored logo)
                  </Typography>
                </Box>

                {/* Favicon */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Favicon (Optional)
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'background.paper',
                      position: 'relative',
                      minHeight: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {faviconPreview || companySettings?.favicon ? (
                      <>
                        <Box
                          component="img"
                          src={faviconPreview || companySettings?.favicon_url || ''}
                          alt="Favicon"
                          sx={{
                            width: 64,
                            height: 64,
                            objectFit: 'contain',
                            mb: 2,
                          }}
                        />
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveFile('favicon')}
                          disabled={isUpdating}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          No favicon uploaded
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          disabled={isUpdating}
                        >
                          Upload Favicon
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleFileChange('favicon')}
                          />
                        </Button>
                      </>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Browser tab icon (32x32px recommended)
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>

          {/* Brand Colors Section */}
          <Box sx={{ mt: 3, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Brand Colors</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Configure colors used in PDFs and documents</Typography>
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These colors are used for generating PDFs (quotes, contracts, receipts) and other branded documents.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Primary Color</Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        backgroundColor: formData.primary_color || '#2c5aa0',
                        border: '2px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Primary Color"
                      value={formData.primary_color || ''}
                      onChange={handleInputChange('primary_color')}
                      disabled={isUpdating}
                      placeholder="#2c5aa0"
                      sx={textFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PaletteIcon sx={{ color: formData.primary_color || 'primary.main' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Secondary Color</Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        backgroundColor: formData.secondary_color || '#1e3a5f',
                        border: '2px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Secondary Color"
                      value={formData.secondary_color || ''}
                      onChange={handleInputChange('secondary_color')}
                      disabled={isUpdating}
                      placeholder="#1e3a5f"
                      sx={textFieldSx}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Accent Color</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', maxWidth: '50%' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: formData.accent_color || '#f5a623',
                      border: '2px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Accent Color"
                    value={formData.accent_color || ''}
                    onChange={handleInputChange('accent_color')}
                    disabled={isUpdating}
                    placeholder="#f5a623"
                    sx={textFieldSx}
                  />
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Color values should be in hex format (e.g., #2c5aa0). These colors are used in PDF generation for quotes, contracts, and other documents.
              </Alert>
            </Stack>
          </Box>

          <Box sx={{ mt: 3, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Social Media</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Your company's social media presence</Typography>
            <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Facebook URL"
                  value={formData.facebook_url || ''}
                  onChange={handleInputChange('facebook_url')}
                  disabled={isUpdating}
                  placeholder="https://facebook.com/yourcompany"
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Facebook sx={{ color: '#1877F2' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Instagram URL"
                  value={formData.instagram_url || ''}
                  onChange={handleInputChange('instagram_url')}
                  disabled={isUpdating}
                  placeholder="https://instagram.com/yourcompany"
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Instagram sx={{ color: '#E4405F' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
          </Box>
        </TabPanel>

        {/* Contact Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Contact Information</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>How clients can reach your company</Typography>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Primary Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange('email')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Support Email"
                  type="email"
                  value={formData.support_email || ''}
                  onChange={handleInputChange('support_email')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Primary Phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange('phone')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Secondary Phone"
                  value={formData.phone_secondary || ''}
                  onChange={handleInputChange('phone_secondary')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Stack>
          </Box>

          <Box sx={{ mt: 3, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Business Address</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Your company's physical location</Typography>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  value={formData.address_line1 || ''}
                  onChange={handleInputChange('address_line1')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn color="secondary" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Address Line 2"
                  value={formData.address_line2 || ''}
                  onChange={handleInputChange('address_line2')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                />

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.city || ''}
                    onChange={handleInputChange('city')}
                    disabled={isUpdating}
                    sx={textFieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Province/State"
                    value={formData.province || ''}
                    onChange={handleInputChange('province')}
                    disabled={isUpdating}
                    sx={textFieldSx}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Postal Code"
                    value={formData.postal_code || ''}
                    onChange={handleInputChange('postal_code')}
                    disabled={isUpdating}
                    sx={textFieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Country"
                    value={formData.country || ''}
                    onChange={handleInputChange('country')}
                    disabled={isUpdating}
                    sx={textFieldSx}
                  />
                </Box>
              </Stack>
          </Box>
        </TabPanel>

        {/* Banking Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Bank Account Details</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Bank information displayed on invoices and payment instructions</Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Bank Name"
                value={formData.bank_name || ''}
                onChange={handleInputChange('bank_name')}
                disabled={isUpdating}
                sx={textFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountBalance color="primary" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Account Name"
                value={formData.bank_account_name || ''}
                onChange={handleInputChange('bank_account_name')}
                disabled={isUpdating}
                helperText="Name on the bank account"
                sx={textFieldSx}
              />

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Account Number"
                  value={formData.bank_account_number || ''}
                  onChange={handleInputChange('bank_account_number')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Branch"
                  value={formData.bank_branch || ''}
                  onChange={handleInputChange('bank_branch')}
                  disabled={isUpdating}
                  sx={textFieldSx}
                />
              </Box>

              <TextField
                fullWidth
                label="SWIFT/BIC Code"
                value={formData.bank_swift_code || ''}
                onChange={handleInputChange('bank_swift_code')}
                disabled={isUpdating}
                helperText="For international transfers"
                sx={textFieldSx}
              />

              <Alert severity="warning">
                Bank details are sensitive information. They will be displayed on invoices for clients to make payments.
              </Alert>
            </Stack>
          </Box>
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>PDF & Document Settings</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Configure text that appears on generated PDFs</Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="PDF Footer Text"
                value={formData.pdf_footer_text || ''}
                onChange={handleInputChange('pdf_footer_text')}
                disabled={isUpdating}
                multiline
                rows={2}
                helperText="This text appears at the bottom of all generated PDFs"
                sx={textFieldSx}
              />

              <TextField
                fullWidth
                label="Invoice Terms"
                value={formData.invoice_terms || ''}
                onChange={handleInputChange('invoice_terms')}
                disabled={isUpdating}
                multiline
                rows={4}
                helperText="Terms and conditions for invoices"
                sx={textFieldSx}
              />

              <TextField
                fullWidth
                label="Receipt Terms"
                value={formData.receipt_terms || ''}
                onChange={handleInputChange('receipt_terms')}
                disabled={isUpdating}
                multiline
                rows={4}
                helperText="Terms and conditions for receipts"
                sx={textFieldSx}
              />
            </Stack>
          </Box>
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
