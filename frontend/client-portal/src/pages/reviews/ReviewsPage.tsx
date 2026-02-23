// pages/reviews/ReviewsPage.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { ReviewsHero } from './components/ReviewsHero';
import { TestimonialGrid } from './components/TestimonialGrid';
import {
  AnimatedElement,
  Section,
  Container,
  ModernCard,
  tokens,
  Button,
} from '../../design-system';
import type { ReviewsPageProps } from './types/reviews.types';

const ReviewsPage: React.FC<ReviewsPageProps> = ({ onNavigateToBooking }) => {
  return (
    <>
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
        <ReviewsHero />
        <TestimonialGrid />

        {/* CTA Section */}
        <Section background="sage" spacing="large">
          <Container maxWidth="narrow">
            <AnimatedElement animation="fadeIn" delay={100}>
              <ModernCard variant="elevated" size="large">
                <Stack spacing={4} alignItems="center" sx={{ textAlign: 'center' }}>
                  <Typography sx={{ ...tokens.typography.styles.h3 }}>
                    Create Your Own Unforgettable Moment
                  </Typography>

                  <Typography sx={{ ...tokens.typography.styles.bodyLarge }}>
                    Join the hundreds of satisfied guests who have celebrated at LifePlace Alfonso.
                    Book your event today!
                  </Typography>

                  <Button
                    variant="terracotta"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={onNavigateToBooking}
                  >
                    Book Your Event
                  </Button>
                </Stack>
              </ModernCard>
            </AnimatedElement>
          </Container>
        </Section>
      </Box>
    </>
  );
};

export default ReviewsPage;
