// pages/home/components/VenuesSection.tsx

import React from 'react';
import { Box, Typography, Stack, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens, Section, Container, AnimatedElement } from '../../../design-system';
import { Button } from '../../../design-system';
import { VenueGalleryCard } from '../../../components/gallery';
import { useVenueGallery } from '../../../hooks/useGallery';

const MAX_VENUES = 6;

export const VenuesSection: React.FC = () => {
  const navigate = useNavigate();
  const { data: venues, isLoading, isError } = useVenueGallery();

  const sortedVenues = React.useMemo(() => {
    if (!venues) return [];
    return [...venues].sort((a, b) => a.sort_order - b.sort_order).slice(0, MAX_VENUES);
  }, [venues]);

  const handleBookNow = () => {
    navigate('/booking');
  };

  const handleViewGallery = () => {
    navigate('/facilities');
  };

  return (
    <Section background="white" spacing="large">
      <Container maxWidth="wide">
        <Stack spacing={{ xs: 4, md: 6 }}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={0}>
            <Box sx={{ textAlign: 'center', mb: { xs: 2, md: 4 } }}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h2,
                  color: tokens.color.base.neutral[900],
                  mb: 2,
                }}
              >
                Facilities & Amenities
              </Typography>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[700],
                  maxWidth: '700px',
                  mx: 'auto',
                }}
              >
                Discover our diverse range of venues, each thoughtfully designed to accommodate
                events of every size and style.
              </Typography>
            </Box>
          </AnimatedElement>

          {/* Venues Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: { xs: 3, md: 4 },
            }}
          >
            {isLoading &&
              Array.from({ length: MAX_VENUES }).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    borderRadius: tokens.spacing.radius.card,
                    overflow: 'hidden',
                  }}
                >
                  <Skeleton
                    variant="rectangular"
                    height={180}
                    sx={{ backgroundColor: tokens.color.base.sage[100] }}
                  />
                  <Box sx={{ p: 2 }}>
                    <Skeleton
                      variant="text"
                      sx={{
                        fontSize: '1.25rem',
                        mb: 0.5,
                        backgroundColor: tokens.color.base.sage[100],
                      }}
                    />
                    <Skeleton
                      variant="text"
                      width="60%"
                      sx={{ backgroundColor: tokens.color.base.sage[100] }}
                    />
                  </Box>
                </Box>
              ))}

            {isError && (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.body,
                    color: tokens.color.base.neutral[500],
                  }}
                >
                  Unable to load venues at this time. Please try again later.
                </Typography>
              </Box>
            )}

            {!isLoading &&
              !isError &&
              sortedVenues.map((venue, index) => (
                <AnimatedElement key={venue.id} animation="slideUp" delay={100 + index * 100}>
                  <VenueGalleryCard
                    venue={{
                      id: venue.id,
                      name: venue.name,
                      description: venue.description,
                      featured_image: venue.featured_image,
                      gallery_images: [],
                      minimum_capacity: venue.minimum_capacity,
                      maximum_capacity: venue.maximum_capacity,
                    }}
                    variant="compact"
                    showGalleryPreview={false}
                    onBookNow={() => handleBookNow()}
                    onViewGallery={() => handleViewGallery()}
                  />
                </AnimatedElement>
              ))}
          </Box>

          {/* Call to Action */}
          <AnimatedElement animation="fadeIn" delay={800}>
            <Box sx={{ textAlign: 'center', mt: { xs: 2, md: 4 } }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => navigate('/facilities')}
                sx={{
                  px: { xs: 4, md: 6 },
                }}
              >
                Explore All Facilities
              </Button>
            </Box>
          </AnimatedElement>
        </Stack>
      </Container>
    </Section>
  );
};
