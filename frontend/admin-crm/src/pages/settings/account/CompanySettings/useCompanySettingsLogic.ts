import { useState, useEffect } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { useCompanySettings } from '@/hooks/useSettings';
import type { CompanySettingsUpdateData } from '@/types/settings.types';

type FileField = 'logo' | 'logo_dark' | 'favicon';

export function useCompanySettingsLogic() {
  const { setBreadcrumbs } = useLayout();
  const { companySettings, isLoading, isUpdating, error, updateCompanySettings } =
    useCompanySettings();

  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<CompanySettingsUpdateData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // File upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Track files marked for removal (to update UI before save)
  const [removedFiles, setRemovedFiles] = useState<{
    logo: boolean;
    logo_dark: boolean;
    favicon: boolean;
  }>({ logo: false, logo_dark: false, favicon: false });

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

  const handleInputChange =
    (field: keyof CompanySettingsUpdateData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setHasChanges(true);
    };

  const handleFileChange = (field: FileField) => (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));
      // Clear removed state when new file is uploaded
      setRemovedFiles((prev) => ({ ...prev, [field]: false }));
      setHasChanges(true);
    }
  };

  const handleRemoveFile = (field: FileField) => {
    if (field === 'logo') setLogoPreview(null);
    else if (field === 'logo_dark') setLogoDarkPreview(null);
    else if (field === 'favicon') setFaviconPreview(null);

    setFormData((prev) => ({
      ...prev,
      [field]: null,
    }));
    // Mark file as removed to update UI immediately
    setRemovedFiles((prev) => ({ ...prev, [field]: true }));
    setHasChanges(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateCompanySettings(formData);
    setHasChanges(false);
    // Reset removed state after save
    setRemovedFiles({ logo: false, logo_dark: false, favicon: false });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return {
    // Data
    companySettings,
    formData,
    tabValue,
    hasChanges,
    logoPreview,
    logoDarkPreview,
    faviconPreview,
    removedFiles,

    // Loading/error states
    isLoading,
    isUpdating,
    error,

    // Handlers
    handleInputChange,
    handleFileChange,
    handleRemoveFile,
    handleSubmit,
    handleTabChange,
  };
}
