import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { ImageUploadField, GalleryUploadField } from '@/components/common';
import { PackageVenuesSection } from '@/components/products/PackageVenuesSection';
import type { ProductFormData, ProductOption } from '@/types/products.types';
import type { EventType } from '@/types/events.types';

interface SettingsSectionProps {
  formData: ProductFormData;
  errors: Record<string, string>;
  editingProduct: ProductOption | null | undefined;
  eventTypes: EventType[];
  isLoadingEventTypes: boolean;
  onInputChange: (
    field: keyof ProductFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } },
  ) => void;
  onSwitchChange: (
    field: keyof ProductFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFormDataChange: (data: Partial<ProductFormData>) => void;
  onEventTypesChange: (event: { target: { value: unknown } }) => void;
  onFeaturedImageChange: (file: File | null) => void;
  onGalleryImagesChange: (files: (File | string)[]) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  formData,
  errors,
  editingProduct,
  eventTypes,
  isLoadingEventTypes,
  onInputChange,
  onSwitchChange,
  onFormDataChange,
  onEventTypesChange,
  onFeaturedImageChange,
  onGalleryImagesChange,
}) => {
  return (
    <>
      {/* Duration Constraints */}
      <Typography variant="h6" gutterBottom>
        Duration Constraints
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <TextField
              fullWidth
              label="Minimum Hours (Optional)"
              value={formData.minimum_hours}
              onChange={onInputChange('minimum_hours')}
              type="number"
              helperText="Minimum booking duration for this product"
            />
          </Box>
          <Box flex={1}>
            <TextField
              fullWidth
              label="Maximum Hours (Optional)"
              value={formData.maximum_hours}
              onChange={onInputChange('maximum_hours')}
              error={!!errors.maximum_hours}
              helperText={errors.maximum_hours || 'Maximum booking duration for this product'}
              type="number"
            />
          </Box>
        </Box>
      </Box>

      {/* Event Duration - Only show for PACKAGE type */}
      {formData.type === 'PACKAGE' && (
        <>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Event Duration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For multi-day packages (camps, retreats). Leave blank for hourly packages.
          </Typography>

          <TextField
            fullWidth
            label="Event Days"
            value={formData.event_days}
            onChange={onInputChange('event_days')}
            type="number"
            helperText="e.g., 2 for 2D1N, 3 for 3D2N, 5 for 5D4N"
            InputProps={{
              inputProps: { min: 1 },
            }}
            sx={{ maxWidth: 300 }}
          />
        </>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Booking Configuration */}
      <Typography variant="h6" gutterBottom>
        Booking Configuration
      </Typography>

      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
        <Box flex={1}>
          <TextField
            fullWidth
            label="Advance Booking Days"
            value={formData.advance_booking_days}
            onChange={onInputChange('advance_booking_days')}
            type="number"
            helperText="Minimum days in advance for booking"
          />
        </Box>
        <Box flex={1}>
          <TextField
            fullWidth
            label="Maximum Booking Days (Optional)"
            value={formData.maximum_booking_days}
            onChange={onInputChange('maximum_booking_days')}
            type="number"
            helperText="Maximum days in advance for booking"
          />
        </Box>
      </Box>

      {/* Event Types */}
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Available For Event Types
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select which booking flows this {formData.type === 'PACKAGE' ? 'package' : 'product'} should
        appear in. If none selected, it will not appear in any booking flow.
      </Typography>

      <FormControl fullWidth>
        <InputLabel id="event-types-label">Event Types</InputLabel>
        <Select
          labelId="event-types-label"
          multiple
          value={formData.event_type_ids}
          onChange={onEventTypesChange}
          input={<OutlinedInput label="Event Types" />}
          disabled={isLoadingEventTypes}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as number[]).map((id) => {
                const eventType = eventTypes.find((et) => et.id === id);
                return <Chip key={id} label={eventType?.name || `ID: ${id}`} size="small" />;
              })}
            </Box>
          )}
        >
          {eventTypes.map((eventType) => (
            <MenuItem key={eventType.id} value={eventType.id}>
              <Checkbox checked={formData.event_type_ids.includes(eventType.id)} />
              <ListItemText primary={eventType.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      {/* Included Venues (only for existing packages) */}
      {formData.type === 'PACKAGE' && (
        <>
          {editingProduct?.id ? (
            <PackageVenuesSection packageId={editingProduct.id} />
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Included Venues
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Save this package first to assign venues.
              </Typography>
            </Box>
          )}
          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Images */}
      <Typography variant="h6" gutterBottom>
        Images
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload images for this product/package. If not set, images from assigned venues will be
        used.
      </Typography>

      <Box display="flex" flexDirection="column" gap={3}>
        <ImageUploadField
          label="Featured Image"
          value={formData.featured_image}
          onChange={onFeaturedImageChange}
          helperText="Main image shown in listings and cards. Recommended: 800x600px"
          maxSizeMB={5}
          aspectRatio={4 / 3}
          previewHeight={180}
        />

        <GalleryUploadField
          label="Gallery Images"
          value={formData.gallery_images}
          onChange={onGalleryImagesChange}
          helperText="Additional images for product detail page"
          maxImages={10}
          maxSizeMB={5}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Settings */}
      <Typography variant="h6" gutterBottom>
        Settings
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <FormControlLabel
              control={
                <Switch checked={formData.is_active} onChange={onSwitchChange('is_active')} />
              }
              label="Active"
            />
          </Box>
          <Box flex={1}>
            <FormControlLabel
              control={
                <Switch checked={formData.is_featured} onChange={onSwitchChange('is_featured')} />
              }
              label="Featured"
            />
          </Box>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_highlighted}
              onChange={(e) => onFormDataChange({ is_highlighted: e.target.checked })}
            />
          }
          label="Highlight on Rates Page"
        />
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allow_multiple}
                  onChange={onSwitchChange('allow_multiple')}
                />
              }
              label="Allow Multiple Quantities"
            />
          </Box>
          <Box flex={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requires_approval}
                  onChange={onSwitchChange('requires_approval')}
                />
              }
              label="Requires Admin Approval"
            />
          </Box>
        </Box>
        {formData.allow_multiple && (
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
            <Box flex={1}>
              <TextField
                fullWidth
                label="Maximum Quantity (Optional)"
                value={formData.maximum_quantity}
                onChange={onInputChange('maximum_quantity')}
                type="number"
                helperText="Leave blank for unlimited. Must be at least 2."
                InputProps={{ inputProps: { min: 2 } }}
              />
            </Box>
            <Box flex={1}>{/* Empty box for alignment */}</Box>
          </Box>
        )}
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <TextField
              fullWidth
              label="Sort Order"
              value={formData.sort_order}
              onChange={onInputChange('sort_order')}
              type="number"
              helperText="Lower numbers appear first"
            />
          </Box>
          <Box flex={1}>{/* Empty box for alignment */}</Box>
        </Box>
      </Box>
    </>
  );
};
