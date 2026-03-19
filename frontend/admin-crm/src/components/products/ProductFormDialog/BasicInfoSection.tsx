import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import type { ProductFormData } from '@/types/products.types';
import type { ProductCategory } from '@/types/products.types';

interface BasicInfoSectionProps {
  formData: ProductFormData;
  errors: Record<string, string>;
  categories: ProductCategory[];
  isLoadingCategories: boolean;
  onInputChange: (
    field: keyof ProductFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } },
  ) => void;
  onFormDataChange: (data: Partial<ProductFormData>) => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  errors,
  categories,
  isLoadingCategories,
  onInputChange,
  onFormDataChange,
}) => {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Basic Information
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={2}>
            <TextField
              fullWidth
              label="Product Name"
              value={formData.name}
              onChange={onInputChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Box>
          <Box flex={1}>
            <FormControl fullWidth error={!!errors.type}>
              <InputLabel>Type</InputLabel>
              <Select value={formData.type} onChange={onInputChange('type')} label="Type">
                <MenuItem value="PRODUCT">Product</MenuItem>
                <MenuItem value="PACKAGE">Package</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={onInputChange('description')}
          error={!!errors.description}
          helperText={errors.description}
          multiline
          rows={3}
          required
        />

        <TextField
          fullWidth
          label="Tier Label"
          value={formData.tier_label}
          onChange={(e) => onFormDataChange({ tier_label: e.target.value })}
          helperText="Display label on rates page (e.g., Day Trip, 2D1N, Under 100 pax)"
          size="small"
        />

        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={onInputChange('category')}
                label="Category"
                disabled={isLoadingCategories}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.full_path}
                  </MenuItem>
                ))}
              </Select>
              {errors.category && (
                <Typography variant="caption" color="error">
                  {errors.category}
                </Typography>
              )}
            </FormControl>
          </Box>

          <Box flex={1}>
            <TextField
              fullWidth
              label="SKU (Optional)"
              value={formData.sku}
              onChange={onInputChange('sku')}
              placeholder="Auto-generated if empty"
            />
          </Box>
        </Box>
      </Box>
    </>
  );
};
