// pages/reviews/components/TestimonialCard.example.tsx
// Example usage of the TestimonialCard component

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { TestimonialCard } from './TestimonialCard';
import type { Testimonial } from '../types/reviews.types';

/**
 * Example testimonials demonstrating various configurations
 */
const exampleTestimonials: Testimonial[] = [
  // Full testimonial with all fields
  {
    id: '1',
    name: 'Sarah Chen',
    organization: 'Grace Community Church',
    review:
      'Our church retreat at LifePlace was transformative. The peaceful atmosphere and excellent facilities created the perfect environment for spiritual growth. The staff went above and beyond to ensure everything was perfect.',
    eventDate: 'March 15, 2025',
    eventType: 'Church Retreat',
  },

  // Testimonial without organization
  {
    id: '2',
    name: 'James Rodriguez',
    review:
      'Beautiful venue with stunning views. Our wedding was everything we dreamed of. The coordination team made the entire process seamless and stress-free.',
    eventDate: 'June 20, 2025',
    eventType: 'Wedding',
  },

  // Minimal testimonial (only name and review)
  {
    id: '3',
    name: 'Patricia Lim',
    review:
      'As an events coordinator, I highly recommend LifePlace to my clients. The venue is versatile and the team is always professional. Five stars across the board!',
    eventType: 'Multiple Events',
  },

  // Short testimonial
  {
    id: '4',
    name: 'Michael Tan',
    review: 'Perfect blend of nature and modern amenities. Highly recommend!',
  },
];

/**
 * TestimonialCard Example Component
 *
 * Demonstrates:
 * - Modern Organic Luxury design system
 * - ModernCard variant='elevated'
 * - Gold 5-star rating display
 * - Quote typography for testimonial text
 * - H5 typography for author name
 * - slideUp animation with index-based delay
 * - Avatar with initials
 * - Responsive design
 * - WCAG AA compliance
 */
export const TestimonialCardExample: React.FC = () => {
  return (
    <Box sx={{ p: 4, backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Stack spacing={6} sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box>
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 600 }}>
            TestimonialCard Component Examples
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Modern Organic Luxury design system implementation
          </Typography>
        </Box>

        {/* Single Card Example */}
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Single Card
          </Typography>
          <Box sx={{ maxWidth: 400 }}>
            <TestimonialCard testimonial={exampleTestimonials[0]} />
          </Box>
        </Box>

        {/* Grid Layout Example */}
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Grid Layout (3 columns)
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 4,
            }}
          >
            {exampleTestimonials.slice(0, 3).map((testimonial, index) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
            ))}
          </Box>
        </Box>

        {/* All Variations */}
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            All Variations (with staggered animation)
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
                xl: 'repeat(4, 1fr)',
              },
              gap: 4,
            }}
          >
            {exampleTestimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
            ))}
          </Box>
        </Box>

        {/* Design System Features */}
        <Box sx={{ mt: 6, p: 4, backgroundColor: 'white', borderRadius: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Design System Features
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Components Used:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
                <li>ModernCard variant="elevated" with hover effect</li>
                <li>AnimatedElement with slideUp animation</li>
                <li>Design tokens for all colors, spacing, typography, and shadows</li>
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Typography:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
                <li>Quote style: Cormorant Garamond italic for testimonial text</li>
                <li>H5 style: Cormorant Garamond semibold for author name</li>
                <li>Body small: Inter regular for organization</li>
                <li>Caption: Inter regular for event date</li>
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Colors:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
                <li>Gold stars: tokens.color.base.gold[500] (#D4A574)</li>
                <li>Text: tokens.color.base.neutral[800] (#3A3836)</li>
                <li>Card background: White with elevation.card shadow</li>
                <li>Avatar: Consistent color based on name hash</li>
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Animation:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
                <li>Type: slideUp (20px vertical movement)</li>
                <li>Duration: 500ms</li>
                <li>Delay: 100ms base + (index × 50ms)</li>
                <li>Easing: cubic-bezier(0.4, 0, 0.2, 1)</li>
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Accessibility:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
                <li>WCAG AA compliant color contrast</li>
                <li>Semantic HTML structure</li>
                <li>ARIA label for star rating (role="img")</li>
                <li>Keyboard navigation support via ModernCard hover state</li>
                <li>Screen reader friendly content flow</li>
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default TestimonialCardExample;
