import { useState, useEffect } from 'react';
import { useProductCategories } from '@/hooks/useProducts';
import { useEventTypes } from '@/hooks/useEvents';
import type {
  ProductOption,
  CreateProductData,
  UpdateProductData,
  ProductFormData,
} from '@/types/products.types';

const defaultFormData: ProductFormData = {
  name: '',
  description: '',
  category: '',
  pricing_model: 'FIXED',
  pricing_unit: 'PER_EVENT',
  base_price: '',
  currency: 'PHP',
  is_tax_inclusive: false,
  type: 'PRODUCT',
  is_active: true,
  is_featured: false,
  is_highlighted: false,
  tier_label: '',
  allow_multiple: false,
  maximum_quantity: '',
  requires_approval: false,
  minimum_hours: '',
  maximum_hours: '',
  advance_booking_days: '7',
  maximum_booking_days: '',
  event_days: '',
  sku: '',
  sort_order: '0',
  event_type_ids: [],
  featured_image: null,
  gallery_images: [],
  minimum_guests: '',
  maximum_guests: '',
  recommended_guests: '',
};

export function useProductFormLogic(
  open: boolean,
  editingProduct: ProductOption | null | undefined,
  onSubmit: (data: CreateProductData | UpdateProductData, formData?: FormData) => void,
) {
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { categories, isLoadingCategories } = useProductCategories({
    is_active: true,
  });
  const { eventTypes, isLoadingEventTypes } = useEventTypes({
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      if (editingProduct) {
        setFormData({
          name: editingProduct.name || '',
          description: editingProduct.description || '',
          category: editingProduct.category?.toString() || '',
          pricing_model: editingProduct.pricing_model || 'FIXED',
          pricing_unit: editingProduct.pricing_unit || 'PER_EVENT',
          base_price: editingProduct.base_price || '',
          currency: editingProduct.currency || 'PHP',
          is_tax_inclusive: editingProduct.is_tax_inclusive ?? false,
          type: editingProduct.type || 'PRODUCT',
          is_active: editingProduct.is_active ?? true,
          is_featured: editingProduct.is_featured ?? false,
          is_highlighted: editingProduct.is_highlighted ?? false,
          tier_label: editingProduct.tier_label || '',
          allow_multiple: editingProduct.allow_multiple ?? false,
          maximum_quantity: editingProduct.maximum_quantity?.toString() || '',
          requires_approval: editingProduct.requires_approval ?? false,
          minimum_hours: editingProduct.minimum_hours?.toString() || '',
          maximum_hours: editingProduct.maximum_hours?.toString() || '',
          advance_booking_days: editingProduct.advance_booking_days?.toString() || '7',
          maximum_booking_days: editingProduct.maximum_booking_days?.toString() || '',
          event_days: editingProduct.event_days?.toString() || '',
          sku: editingProduct.sku || '',
          sort_order: editingProduct.sort_order?.toString() || '0',
          event_type_ids: editingProduct.event_type_ids || [],
          featured_image: editingProduct.featured_image || null,
          gallery_images: editingProduct.gallery_images || [],
          minimum_guests: editingProduct.minimum_guests?.toString() || '',
          maximum_guests: editingProduct.maximum_guests?.toString() || '',
          recommended_guests: editingProduct.recommended_guests?.toString() || '',
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingProduct, open]);

  const handleInputChange =
    (field: keyof ProductFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof ProductFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
        ...(field === 'allow_multiple' && !event.target.checked ? { maximum_quantity: '' } : {}),
      }));
    };

  const handleFeaturedImageChange = (file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      featured_image: file,
    }));
  };

  const handleGalleryImagesChange = (files: (File | string)[]) => {
    setFormData((prev) => ({
      ...prev,
      gallery_images: files,
    }));
  };

  const handleEventTypesChange = (event: { target: { value: unknown } }) => {
    const value = event.target.value as number[];
    setFormData((prev) => ({
      ...prev,
      event_type_ids: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category || formData.category === '') {
      newErrors.category = 'Category is required';
    }

    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      newErrors.base_price = 'Valid price is required';
    }

    if (formData.minimum_hours && formData.maximum_hours) {
      const min = parseInt(formData.minimum_hours);
      const max = parseInt(formData.maximum_hours);
      if (min > max) {
        newErrors.maximum_hours = 'Maximum hours must be greater than minimum hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateProductData | UpdateProductData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category ? parseInt(formData.category.toString()) : 0,
      pricing_model: formData.pricing_model,
      pricing_unit: formData.pricing_unit,
      base_price: formData.base_price,
      currency: formData.currency,
      is_tax_inclusive: formData.is_tax_inclusive,
      type: formData.type,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      is_highlighted: formData.is_highlighted,
      tier_label: formData.tier_label,
      allow_multiple: formData.allow_multiple,
      maximum_quantity:
        formData.allow_multiple && formData.maximum_quantity
          ? parseInt(formData.maximum_quantity)
          : null,
      requires_approval: formData.requires_approval,
      minimum_hours: formData.minimum_hours ? parseInt(formData.minimum_hours) : null,
      maximum_hours: formData.maximum_hours ? parseInt(formData.maximum_hours) : null,
      advance_booking_days: parseInt(formData.advance_booking_days) || 7,
      maximum_booking_days: formData.maximum_booking_days
        ? parseInt(formData.maximum_booking_days)
        : null,
      event_days: formData.event_days ? parseInt(formData.event_days) : null,
      minimum_guests: formData.minimum_guests ? parseInt(formData.minimum_guests) : null,
      maximum_guests: formData.maximum_guests ? parseInt(formData.maximum_guests) : null,
      recommended_guests: formData.recommended_guests
        ? parseInt(formData.recommended_guests)
        : null,
      sku: formData.sku || null,
      sort_order: parseInt(formData.sort_order) || 0,
      event_type_ids: formData.event_type_ids,
    };

    // Check if we need to send FormData (for image uploads)
    const hasNewFeaturedImage = formData.featured_image instanceof File;
    const hasNewGalleryImages = formData.gallery_images.some((img) => img instanceof File);

    if (hasNewFeaturedImage || hasNewGalleryImages) {
      const formDataObj = new FormData();

      Object.entries(submitData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            formDataObj.append(key, JSON.stringify(value));
          } else {
            formDataObj.append(key, String(value));
          }
        }
      });

      if (hasNewFeaturedImage && formData.featured_image instanceof File) {
        formDataObj.append('featured_image', formData.featured_image);
      }

      const existingUrls = formData.gallery_images.filter(
        (img): img is string => typeof img === 'string',
      );
      if (existingUrls.length > 0) {
        formDataObj.append('gallery_images', JSON.stringify(existingUrls));
      }

      formData.gallery_images
        .filter((img): img is File => img instanceof File)
        .forEach((file) => {
          formDataObj.append('gallery_image_files', file);
        });

      onSubmit(submitData, formDataObj);
    } else {
      onSubmit(submitData);
    }
  };

  return {
    formData,
    setFormData,
    errors,
    categories,
    isLoadingCategories,
    eventTypes,
    isLoadingEventTypes,
    handleInputChange,
    handleSwitchChange,
    handleFeaturedImageChange,
    handleGalleryImagesChange,
    handleEventTypesChange,
    handleSubmit,
  };
}
