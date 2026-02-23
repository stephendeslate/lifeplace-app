import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import People from '@mui/icons-material/People';
import PhotoLibrary from '@mui/icons-material/PhotoLibrary';
import Landscape from '@mui/icons-material/Landscape';
import { tokens } from '../../design-system/tokens';
import { ModernCard } from '../../design-system/components/ModernCard';
import { Button } from '../../design-system/components/Button';
import { OptimizedImage } from '../common/OptimizedImage';

interface VenueGalleryCardVenue {
  id: number;
  name: string;
  description: string;
  featured_image: string | null;
  gallery_images: string[];
  minimum_capacity: number;
  maximum_capacity: number;
  amenities?: string[];
}

interface VenueGalleryCardProps {
  venue: VenueGalleryCardVenue;
  onViewGallery?: (venueId: number) => void;
  onBookNow?: (venueId: number) => void;
  showGalleryPreview?: boolean;
  variant?: 'compact' | 'full';
}

export const VenueGalleryCard: React.FC<VenueGalleryCardProps> = ({
  venue,
  onViewGallery,
  onBookNow,
  showGalleryPreview = true,
  variant = 'full',
}) => {
  const isCompact = variant === 'compact';

  return (
    <ModernCard
      variant="elevated"
      size="small"
      hover
      clickable={isCompact}
      onClick={isCompact ? () => onViewGallery?.(venue.id) : undefined}
      sx={{ overflow: 'hidden', p: 0 }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: isCompact ? 180 : 240,
          overflow: 'hidden',
        }}
      >
        {venue.featured_image ? (
          <OptimizedImage
            src={venue.featured_image}
            alt={venue.name}
            height="100%"
            objectFit="cover"
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: tokens.color.base.sage[100],
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: tokens.spacing.radius.full,
                backgroundColor: tokens.color.base.sage[200],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landscape sx={{ fontSize: 40, color: tokens.color.base.sage[500] }} />
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ p: isCompact ? 2 : 3 }}>
        <Typography
          sx={{
            fontFamily: tokens.typography.families.heading,
            fontSize: isCompact ? tokens.typography.sizes.lg : tokens.typography.sizes.xl,
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.color.base.neutral[900],
            mb: 0.5,
          }}
        >
          {venue.name}
        </Typography>

        {!isCompact && venue.description && (
          <Typography
            sx={{
              fontFamily: tokens.typography.families.body,
              fontSize: tokens.typography.sizes.sm,
              color: tokens.color.base.neutral[500],
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {venue.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isCompact ? 0 : 2 }}>
          <Chip
            icon={<People sx={{ fontSize: 16 }} />}
            label={`${venue.minimum_capacity}-${venue.maximum_capacity} guests`}
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

          {showGalleryPreview && venue.gallery_images.length > 0 && (
            <Chip
              icon={<PhotoLibrary sx={{ fontSize: 14 }} />}
              label={`${venue.gallery_images.length} photos`}
              size="small"
              sx={{
                fontFamily: tokens.typography.families.body,
                fontSize: tokens.typography.sizes.xs,
                backgroundColor: tokens.color.base.sage[50],
                color: tokens.color.base.sage[700],
                '& .MuiChip-icon': {
                  color: tokens.color.base.sage[500],
                },
              }}
            />
          )}
        </Stack>

        {!isCompact && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            {onViewGallery && venue.gallery_images.length > 0 && (
              <Button variant="outlined" size="small" onClick={() => onViewGallery(venue.id)}>
                View Gallery
              </Button>
            )}
            {onBookNow && (
              <Button variant="terracotta" size="small" onClick={() => onBookNow(venue.id)}>
                Book Now
              </Button>
            )}
          </Stack>
        )}
      </Box>
    </ModernCard>
  );
};

export default VenueGalleryCard;
