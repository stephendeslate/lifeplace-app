import { useState, useEffect } from 'react';
import type { VenueDetail, CreateOperatingRulesData } from '@/types/venues.types';
import type { VenueFormDialogProps, VenueFormData, OperatingRulesFormData } from './types';

const defaultOperatingRules: OperatingRulesFormData = {
  default_check_in_time: '14:00',
  default_checkout_time: '12:00',
  checkout_next_day: false,
  minimum_program_hours: '1',
  maximum_program_hours: '8',
  default_program_hours: '3',
  is_fixed_duration: false,
  ingress_hours: '1',
  egress_hours: '1',
  allow_custom_ingress: false,
  allow_custom_egress: false,
  min_ingress_hours: '0.5',
  max_ingress_hours: '6',
  min_egress_hours: '0.5',
  max_egress_hours: '3',
  earliest_start_time: '06:00',
  latest_end_time: '22:00',
  hard_cutoff_time: '02:00',
  hard_cutoff_next_day: true,
  early_access_minutes: '60',
  early_checkin_allowed: false,
  early_checkin_fee_per_hour: '300',
  earliest_checkin_time: '10:00',
  late_checkout_allowed: false,
  late_checkout_fee_per_hour: '300',
  late_checkout_max_hours: '4',
  latest_checkout_time: '16:00',
};

const defaultFormData: VenueFormData = {
  name: '',
  code: '',
  description: '',
  is_overnight: false,
  minimum_capacity: '1',
  maximum_capacity: '100',
  recommended_capacity: '',
  is_active: true,
  is_bookable: true,
  is_featured: false,
  location_description: '',
  sort_order: '0',
  featured_image: null,
  gallery_images: [],
  is_rentable_standalone: false,
  standalone_base_price: '',
  standalone_included_hours: '',
  standalone_excess_hour_price: '',
  operating_rules: defaultOperatingRules,
};

export function useVenueForm({
  open,
  editingVenue,
  onSubmit,
}: Pick<VenueFormDialogProps, 'open' | 'editingVenue' | 'onSubmit'>) {
  const [formData, setFormData] = useState<VenueFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'rules-timing']);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && !initialized) {
      if (editingVenue) {
        const venue = editingVenue as VenueDetail;
        const rules = venue.operating_rules;

        setFormData({
          name: venue.name || '',
          code: venue.code || '',
          description: venue.description || '',
          is_overnight: venue.is_overnight ?? false,
          minimum_capacity: venue.minimum_capacity?.toString() || '1',
          maximum_capacity: venue.maximum_capacity?.toString() || '100',
          recommended_capacity: venue.recommended_capacity?.toString() || '',
          is_active: venue.is_active ?? true,
          is_bookable: venue.is_bookable ?? true,
          is_featured: venue.is_featured ?? false,
          location_description: venue.location_description || '',
          sort_order: venue.sort_order?.toString() || '0',
          featured_image: venue.featured_image || null,
          gallery_images: venue.gallery_images || [],
          is_rentable_standalone: venue.is_rentable_standalone ?? false,
          standalone_base_price: venue.standalone_base_price?.toString() || '',
          standalone_included_hours: venue.standalone_included_hours?.toString() || '',
          standalone_excess_hour_price: venue.standalone_excess_hour_price?.toString() || '',
          operating_rules: rules
            ? {
                default_check_in_time: rules.default_check_in_time || '14:00',
                default_checkout_time: rules.default_checkout_time || '12:00',
                checkout_next_day: rules.checkout_next_day ?? false,
                minimum_program_hours: rules.minimum_program_hours || '1',
                maximum_program_hours: rules.maximum_program_hours || '8',
                default_program_hours: rules.default_program_hours || '3',
                is_fixed_duration: rules.is_fixed_duration ?? false,
                ingress_hours: rules.ingress_hours || '1',
                egress_hours: rules.egress_hours || '1',
                allow_custom_ingress: rules.allow_custom_ingress ?? false,
                allow_custom_egress: rules.allow_custom_egress ?? false,
                min_ingress_hours: rules.min_ingress_hours || '0.5',
                max_ingress_hours: rules.max_ingress_hours || '6',
                min_egress_hours: rules.min_egress_hours || '0.5',
                max_egress_hours: rules.max_egress_hours || '3',
                earliest_start_time: rules.earliest_start_time || '06:00',
                latest_end_time: rules.latest_end_time || '22:00',
                hard_cutoff_time: rules.hard_cutoff_time || '02:00',
                hard_cutoff_next_day: rules.hard_cutoff_next_day ?? true,
                early_access_minutes: rules.early_access_minutes?.toString() || '60',
                early_checkin_allowed: rules.early_checkin_allowed ?? false,
                early_checkin_fee_per_hour: rules.early_checkin_fee_per_hour || '300',
                earliest_checkin_time: rules.earliest_checkin_time || '10:00',
                late_checkout_allowed: rules.late_checkout_allowed ?? false,
                late_checkout_fee_per_hour: rules.late_checkout_fee_per_hour || '300',
                late_checkout_max_hours: rules.late_checkout_max_hours?.toString() || '4',
                latest_checkout_time: rules.latest_checkout_time || '16:00',
              }
            : defaultOperatingRules,
        });
      } else {
        setFormData(defaultFormData);
      }
      setInitialized(true);
      setErrors({});
    }
  }, [open, editingVenue, initialized]);

  // Reset initialized flag when dialog closes
  useEffect(() => {
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  const handleInputChange =
    (field: keyof VenueFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };

  const handleRulesChange =
    (field: keyof OperatingRulesFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        operating_rules: { ...prev.operating_rules, [field]: value },
      }));
    };

  const handleSwitchChange =
    (field: keyof VenueFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.checked }));
    };

  const handleRulesSwitchChange =
    (field: keyof OperatingRulesFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        operating_rules: { ...prev.operating_rules, [field]: event.target.checked },
      }));
    };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  };

  const handleFeaturedImageChange = (file: File | null) => {
    setFormData((prev) => ({ ...prev, featured_image: file }));
  };

  const handleGalleryImagesChange = (files: (File | string)[]) => {
    setFormData((prev) => ({ ...prev, gallery_images: files }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase letters, numbers, and underscores only';
    }

    if (!formData.maximum_capacity || parseInt(formData.maximum_capacity) <= 0) {
      newErrors.maximum_capacity = 'Maximum capacity is required and must be greater than 0';
    }

    if (parseInt(formData.minimum_capacity) > parseInt(formData.maximum_capacity)) {
      newErrors.minimum_capacity = 'Minimum capacity cannot exceed maximum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const rules = formData.operating_rules;
    const operatingRulesData: CreateOperatingRulesData = {
      default_check_in_time: rules.default_check_in_time,
      default_checkout_time: rules.default_checkout_time,
      checkout_next_day: rules.checkout_next_day,
      minimum_program_hours: rules.minimum_program_hours,
      maximum_program_hours: rules.maximum_program_hours || null,
      default_program_hours: rules.default_program_hours,
      is_fixed_duration: rules.is_fixed_duration,
      ingress_hours: rules.ingress_hours,
      egress_hours: rules.egress_hours,
      allow_custom_ingress: rules.allow_custom_ingress,
      allow_custom_egress: rules.allow_custom_egress,
      min_ingress_hours: rules.min_ingress_hours,
      max_ingress_hours: rules.max_ingress_hours,
      min_egress_hours: rules.min_egress_hours,
      max_egress_hours: rules.max_egress_hours,
      earliest_start_time: rules.earliest_start_time || null,
      latest_end_time: rules.latest_end_time || null,
      hard_cutoff_time: rules.hard_cutoff_time || null,
      hard_cutoff_next_day: rules.hard_cutoff_next_day,
      early_access_minutes: parseInt(rules.early_access_minutes) || 60,
      early_checkin_allowed: rules.early_checkin_allowed,
      early_checkin_fee_per_hour: rules.early_checkin_allowed
        ? rules.early_checkin_fee_per_hour
        : null,
      earliest_checkin_time: rules.early_checkin_allowed ? rules.earliest_checkin_time : null,
      late_checkout_allowed: rules.late_checkout_allowed,
      late_checkout_fee_per_hour: rules.late_checkout_allowed
        ? rules.late_checkout_fee_per_hour
        : null,
      late_checkout_max_hours: rules.late_checkout_allowed
        ? parseInt(rules.late_checkout_max_hours)
        : undefined,
      latest_checkout_time: rules.late_checkout_allowed ? rules.latest_checkout_time : null,
    };

    // Build FormData for image upload support
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name.trim());
    formDataObj.append('code', formData.code.trim().toUpperCase());
    formDataObj.append('description', formData.description.trim());
    formDataObj.append('is_overnight', String(formData.is_overnight));
    formDataObj.append('minimum_capacity', String(parseInt(formData.minimum_capacity) || 1));
    formDataObj.append('maximum_capacity', String(parseInt(formData.maximum_capacity)));
    if (formData.recommended_capacity) {
      formDataObj.append('recommended_capacity', String(parseInt(formData.recommended_capacity)));
    }
    formDataObj.append('is_active', String(formData.is_active));
    formDataObj.append('is_bookable', String(formData.is_bookable));
    formDataObj.append('is_featured', String(formData.is_featured));
    formDataObj.append('location_description', formData.location_description.trim());
    formDataObj.append('sort_order', String(parseInt(formData.sort_order) || 0));

    // Featured image
    if (formData.featured_image instanceof File) {
      formDataObj.append('featured_image', formData.featured_image);
    } else if (formData.featured_image === null && editingVenue) {
      formDataObj.append('featured_image', '');
    }

    // Gallery images
    const existingGalleryUrls: string[] = [];
    let newFileIndex = 0;
    formData.gallery_images.forEach((item) => {
      if (item instanceof File) {
        formDataObj.append(`gallery_image_${newFileIndex}`, item);
        newFileIndex++;
      } else if (typeof item === 'string') {
        existingGalleryUrls.push(item);
      }
    });
    formDataObj.append('existing_gallery_images', JSON.stringify(existingGalleryUrls));

    // Standalone pricing
    formDataObj.append('is_rentable_standalone', String(formData.is_rentable_standalone));
    if (formData.standalone_base_price) {
      formDataObj.append('standalone_base_price', formData.standalone_base_price);
    }
    if (formData.standalone_included_hours) {
      formDataObj.append('standalone_included_hours', formData.standalone_included_hours);
    }
    if (formData.standalone_excess_hour_price) {
      formDataObj.append('standalone_excess_hour_price', formData.standalone_excess_hour_price);
    }

    // Operating rules as JSON
    formDataObj.append('operating_rules', JSON.stringify(operatingRulesData));

    // Standard JSON data for backward compatibility
    const submitData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      is_overnight: formData.is_overnight,
      minimum_capacity: parseInt(formData.minimum_capacity) || 1,
      maximum_capacity: parseInt(formData.maximum_capacity),
      recommended_capacity: formData.recommended_capacity
        ? parseInt(formData.recommended_capacity)
        : null,
      is_active: formData.is_active,
      is_bookable: formData.is_bookable,
      is_featured: formData.is_featured,
      location_description: formData.location_description.trim(),
      sort_order: parseInt(formData.sort_order) || 0,
      is_rentable_standalone: formData.is_rentable_standalone,
      standalone_base_price: formData.standalone_base_price
        ? parseFloat(formData.standalone_base_price)
        : null,
      standalone_included_hours: formData.standalone_included_hours
        ? parseFloat(formData.standalone_included_hours)
        : null,
      standalone_excess_hour_price: formData.standalone_excess_hour_price
        ? parseFloat(formData.standalone_excess_hour_price)
        : null,
      operating_rules: operatingRulesData,
    };

    const hasFiles =
      formData.featured_image instanceof File ||
      formData.gallery_images.some((item) => item instanceof File);
    const shouldUseFormData = hasFiles || !!editingVenue;

    onSubmit(submitData, shouldUseFormData ? formDataObj : undefined);
  };

  return {
    formData,
    errors,
    expandedSections,
    handleInputChange,
    handleRulesChange,
    handleSwitchChange,
    handleRulesSwitchChange,
    toggleSection,
    handleFeaturedImageChange,
    handleGalleryImagesChange,
    handleSubmit,
  };
}
