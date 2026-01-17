// pages/reviews/ReviewsPage.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha, useTheme } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { SEO } from '../../hooks/useSEO';
import { ReviewsHero } from './components/ReviewsHero';
import { TestimonialGrid } from './components/TestimonialGrid';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import type { ReviewsPageProps } from './types/reviews.types';

const ReviewsPage: React.FC<ReviewsPageProps> = ({ onNavigateToBooking }) => {
  const theme = useTheme();

  return (
    <>
      <SEO
        title="Reviews & Testimonials | LifePlace Alfonso"
        description="Read reviews and testimonials from clients who hosted events at LifePlace Alfonso."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
      <ReviewsHero />
      <TestimonialGrid />

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          px: { xs: 3, sm: 4, md: 6 },
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          width: '100%',
        }}
      >
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <GlassCard variant="light" intensity="strong">
              <Stack spacing={4} alignItems="center" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Create Your Own Unforgettable Moment
                </Typography>

                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
                  Join the hundreds of satisfied guests who have celebrated at LifePlace Alfonso.
                  Book your event today!
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={onNavigateToBooking}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                  }}
                >
                  Book Your Event
                </Button>
              </Stack>
            </GlassCard>
          </AnimatedElement>
        </Box>
      </Box>
      </Box>
    </>
  );
};

export default ReviewsPage;
