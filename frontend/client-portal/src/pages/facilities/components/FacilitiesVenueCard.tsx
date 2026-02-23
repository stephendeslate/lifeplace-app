// pages/facilities/components/FacilitiesVenueCard.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Typography, Chip, Skeleton, Stack } from '@mui/material';
import { People, LocationOn, Collections } from '@mui/icons-material';
import { tokens, ModernCard, AnimatedElement } from '../../../design-system';
import { Button } from '../../../design-system/components/Button';
import { ImageCarousel, ImageLightbox } from '../../../components/gallery';
import type { GalleryImage } from '../../../types/gallery.types';

/**
 * Extended venue type for gallery display.
 * The public API returns gallery_images but the base VenuePublic type
 * may not include it, so we define the shape we need here.
 */
export interface FacilitiesVenueData {
  id: number;
  name: string;
  description: string;
  featured_image: string | null;
  gallery_images: string[];
  minimum_capacity: number;
  maximum_capacity: number;
  location_description?: string;
  sort_order: number;
}

interface FacilitiesVenueCardProps {
  venue: FacilitiesVenueData;
  onNavigateToBooking?: () => void;
  animationDelay?: number;
}

/**
 * FacilitiesVenueCard Component
 *
 * A photo-based venue card for the Facilities page.
 * Features an image carousel, venue details, and call-to-action buttons.
 * On desktop, displays as a horizontal card with carousel on left and details on right.
 * On mobile, stacks vertically.
 */
export const FacilitiesVenueCard: React.FC<FacilitiesVenueCardProps> = ({
  venue,
  onNavigateToBooking,
  animationDelay = 0,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Build gallery images array from featured + gallery images
  const galleryImages: GalleryImage[] = useMemo(() => {
    const urls = [venue.featured_image, ...venue.gallery_images].filter(Boolean) as string[];
    return urls.map((src, index) => ({
      src,
      alt: `${venue.name} - Photo ${index + 1}`,
      venueId: venue.id,
      venueName: venue.name,
    }));
  }, [venue.featured_image, venue.gallery_images, venue.name, venue.id]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handleBookNow = useCallback(() => {
    onNavigateToBooking?.();
  }, [onNavigateToBooking]);

  return (
    <AnimatedElement animation="slideUp" delay={animationDelay}>
      <ModernCard
        variant="elevated"
        hover
        sx={{
          overflow: 'hidden',
          p: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* Image Carousel Section */}
          <Box
            sx={{
              width: { xs: '100%', md: '50%' },
              minHeight: { xs: 250, md: 350 },
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {galleryImages.length > 0 ? (
              <>
                <ImageCarousel
                  images={galleryImages}
                  height={{ xs: '250px', md: '350px' }}
                  showArrows={galleryImages.length > 1}
                  showThumbnails={false}
                  onImageClick={(index) => openLightbox(index)}
                />
                {galleryImages.length > 1 && (
                  <Chip
                    icon={<Collections sx={{ fontSize: 14 }} />}
                    label={`${galleryImages.length} photos`}
                    size="small"
                    onClick={() => openLightbox(0)}
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      zIndex: 2,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: '#fff',
                      fontSize: tokens.typography.sizes.xs,
                      height: 28,
                      cursor: 'pointer',
                      '& .MuiChip-icon': { color: '#fff' },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      },
                    }}
                  />
                )}
              </>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 250, md: 350 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tokens.color.base.sage[100],
                }}
              >
                <Typography
                  sx={{
                    ...tokens.typography.styles.body,
                    color: tokens.color.base.neutral[400],
                  }}
                >
                  No photos available
                </Typography>
              </Box>
            )}
          </Box>

          {/* Details Section */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              p: { xs: 3, md: 4 },
            }}
          >
            {/* Venue Name */}
            <Typography
              sx={{
                fontFamily: tokens.typography.families.heading,
                fontSize: {
                  xs: tokens.typography.sizes.xl,
                  md: tokens.typography.sizes['2xl'],
                },
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.color.base.neutral[900],
                mb: 1.5,
              }}
            >
              {venue.name}
            </Typography>

            {/* Description */}
            {venue.description && (
              <Typography
                sx={{
                  ...tokens.typography.styles.body,
                  color: tokens.color.base.neutral[600],
                  mb: 2.5,
                  lineHeight: tokens.typography.lineHeights.relaxed,
                }}
              >
                {venue.description}
              </Typography>
            )}

            {/* Feature Chips */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: 'wrap',
                gap: 1,
                mb: 3,
              }}
            >
              <Chip
                icon={<People sx={{ fontSize: 16 }} />}
                label={`${venue.minimum_capacity}-${venue.maximum_capacity} guests`}
                size="small"
                sx={{
                  fontFamily: tokens.typography.families.body,
                  fontSize: tokens.typography.sizes.xs,
                  backgroundColor: tokens.color.base.sage[50],
                  color: tokens.color.base.sage[800],
                  '& .MuiChip-icon': {
                    color: tokens.color.base.sage[600],
                  },
                }}
              />
              {venue.location_description && (
                <Chip
                  icon={<LocationOn sx={{ fontSize: 16 }} />}
                  label={venue.location_description}
                  size="small"
                  sx={{
                    fontFamily: tokens.typography.families.body,
                    fontSize: tokens.typography.sizes.xs,
                    backgroundColor: tokens.color.base.neutral[100],
                    color: tokens.color.base.neutral[700],
                    '& .MuiChip-icon': {
                      color: tokens.color.base.neutral[500],
                    },
                  }}
                />
              )}
            </Stack>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1.5}>
              {galleryImages.length > 0 && (
                <Button variant="outlined" size="medium" onClick={() => openLightbox(0)}>
                  View Gallery
                </Button>
              )}
              <Button variant="terracotta" size="medium" onClick={handleBookNow}>
                Book This Venue
              </Button>
            </Stack>
          </Box>
        </Box>
      </ModernCard>

      {/* Lightbox */}
      <ImageLightbox
        images={galleryImages}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
        showThumbnails
        showZoom
        showFullscreen
        ctaButton={
          onNavigateToBooking
            ? {
                label: 'Book This Venue',
                onClick: () => {
                  closeLightbox();
                  onNavigateToBooking();
                },
              }
            : undefined
        }
      />
    </AnimatedElement>
  );
};

/**
 * Skeleton placeholder for FacilitiesVenueCard during loading state.
 */
export const FacilitiesVenueCardSkeleton: React.FC = () => (
  <Box
    sx={{
      borderRadius: tokens.spacing.radius.card,
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
      boxShadow: tokens.shadow.elevation.sm,
    }}
  >
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Skeleton
        variant="rectangular"
        sx={{
          width: { xs: '100%', md: '50%' },
          height: { xs: 250, md: 350 },
          backgroundColor: tokens.color.base.sage[100],
        }}
      />
      <Box
        sx={{
          flex: 1,
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Skeleton
          variant="text"
          width="60%"
          sx={{
            fontSize: '2rem',
            mb: 1.5,
            backgroundColor: tokens.color.base.sage[100],
          }}
        />
        <Skeleton
          variant="text"
          width="90%"
          sx={{ mb: 0.5, backgroundColor: tokens.color.base.sage[100] }}
        />
        <Skeleton
          variant="text"
          width="75%"
          sx={{ mb: 2.5, backgroundColor: tokens.color.base.sage[100] }}
        />
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Skeleton
            variant="rounded"
            width={120}
            height={24}
            sx={{ backgroundColor: tokens.color.base.sage[100] }}
          />
          <Skeleton
            variant="rounded"
            width={100}
            height={24}
            sx={{ backgroundColor: tokens.color.base.sage[100] }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Skeleton
            variant="rounded"
            width={120}
            height={36}
            sx={{ backgroundColor: tokens.color.base.sage[100] }}
          />
          <Skeleton
            variant="rounded"
            width={140}
            height={36}
            sx={{ backgroundColor: tokens.color.base.sage[100] }}
          />
        </Box>
      </Box>
    </Box>
  </Box>
);

export default FacilitiesVenueCard;
