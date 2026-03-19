import React from 'react';
import { Stack, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ImageUploadField, GalleryUploadField } from '@/components/common';
import type { VenueFormData } from './types';

interface ImagesSectionProps {
  formData: VenueFormData;
  expanded: boolean;
  onToggle: () => void;
  onFeaturedImageChange: (file: File | null) => void;
  onGalleryImagesChange: (files: (File | string)[]) => void;
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({
  formData,
  expanded,
  onToggle,
  onFeaturedImageChange,
  onGalleryImagesChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Images</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={3}>
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
          helperText="Additional images for venue detail page"
          maxImages={10}
          maxSizeMB={5}
        />
      </Stack>
    </AccordionDetails>
  </Accordion>
);
