import React from 'react';
import { Box, TextField, InputAdornment, Typography, Stack, Button, Alert } from '@mui/material';
import {
  Palette as PaletteIcon,
  Facebook,
  Instagram,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import type { CompanySettings, CompanySettingsUpdateData } from '@/types/settings.types';

type FileField = 'logo' | 'logo_dark' | 'favicon';

interface BrandingTabProps {
  formData: CompanySettingsUpdateData;
  companySettings: CompanySettings | undefined;
  isUpdating: boolean;
  logoPreview: string | null;
  logoDarkPreview: string | null;
  faviconPreview: string | null;
  removedFiles: { logo: boolean; logo_dark: boolean; favicon: boolean };
  onInputChange: (
    field: keyof CompanySettingsUpdateData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFileChange: (field: FileField) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (field: FileField) => void;
}

export const BrandingTab: React.FC<BrandingTabProps> = ({
  formData,
  companySettings,
  isUpdating,
  logoPreview,
  logoDarkPreview,
  faviconPreview,
  removedFiles,
  onInputChange,
  onFileChange,
  onRemoveFile,
}) => {
  return (
    <>
      {/* Logo Upload Section */}
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
          Company Logos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload your company logos for PDFs and documents
        </Typography>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Upload your company logos. These will appear on quotes, contracts, invoices, and other
            generated documents.
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
                {(logoPreview || companySettings?.logo_url) && !removedFiles.logo ? (
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
                      onClick={() => onRemoveFile('logo')}
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
                      <input type="file" hidden accept="image/*" onChange={onFileChange('logo')} />
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
                {(logoDarkPreview || companySettings?.logo_dark) && !removedFiles.logo_dark ? (
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
                      onClick={() => onRemoveFile('logo_dark')}
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
                        onChange={onFileChange('logo_dark')}
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
                {(faviconPreview || companySettings?.favicon) && !removedFiles.favicon ? (
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
                      onClick={() => onRemoveFile('favicon')}
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
                        onChange={onFileChange('favicon')}
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
        <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
          Brand Colors
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure colors used in PDFs and documents
        </Typography>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These colors are used for generating PDFs (quotes, contracts, receipts) and other
            branded documents.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Primary Color
              </Typography>
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
                  onChange={onInputChange('primary_color')}
                  disabled={isUpdating}
                  placeholder="#2c5aa0"
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
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Secondary Color
              </Typography>
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
                  onChange={onInputChange('secondary_color')}
                  disabled={isUpdating}
                  placeholder="#1e3a5f"
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Accent Color
            </Typography>
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
                onChange={onInputChange('accent_color')}
                disabled={isUpdating}
                placeholder="#f5a623"
              />
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            Color values should be in hex format (e.g., #2c5aa0). These colors are used in PDF
            generation for quotes, contracts, and other documents.
          </Alert>
        </Stack>
      </Box>

      <Box sx={{ mt: 3, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
          Social Media
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your company's social media presence
        </Typography>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Facebook URL"
            value={formData.facebook_url || ''}
            onChange={onInputChange('facebook_url')}
            disabled={isUpdating}
            placeholder="https://facebook.com/yourcompany"
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
            onChange={onInputChange('instagram_url')}
            disabled={isUpdating}
            placeholder="https://instagram.com/yourcompany"
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
    </>
  );
};
