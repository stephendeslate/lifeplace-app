// pages/reviews/components/TestimonialGrid.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Section } from '../../../design-system/components/Section';
import { Container } from '../../../design-system/components/Container';
import { TestimonialCard } from './TestimonialCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { tokens } from '../../../design-system/tokens';
import type { Testimonial } from '../types/reviews.types';

// Hardcoded testimonials from the website
const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Ms. Chanderlynne Mojica',
    review: 'Amazing atmosphere, highly recommend this place for church/corporate activities.',
    eventDate: 'March 1, 2025',
    eventType: 'Church Activity',
  },
  {
    id: '2',
    name: 'Mr. Dags Miguel',
    review: 'Highly recommends for weddings. We had a 4-day church youth camp experience and it was wonderful!',
    eventType: 'Youth Camp',
  },
  {
    id: '3',
    name: 'Mr. Jr Torregosa',
    review: 'The venue is exceptional for large events like weddings and birthday parties. The staff was incredibly helpful and the facilities are top-notch.',
    eventType: 'Wedding',
  },
  {
    id: '4',
    name: 'Mr. Ed Federico',
    review: 'Good place for retreat and teambuilding event. Very spacious! The natural environment really helped our team connect and focus.',
    eventType: 'Team Building',
  },
  {
    id: '5',
    name: 'ENC Imus Youth Camp',
    organization: 'ENC Imus',
    review: 'We had an amazing experience at LifePlace. The staff service was excellent and the facilities were perfect for our youth camp activities.',
    eventDate: 'November 16-17, 2024',
    eventType: 'Youth Camp',
  },
  {
    id: '6',
    name: 'Rotaract District 3810',
    organization: 'Rotaract',
    review: 'The staff assistance was outstanding. Our accommodations were comfortable and the venue was perfect for our district event.',
    eventDate: 'May 17-18, 2025',
    eventType: 'Corporate Event',
  },
  {
    id: '7',
    name: 'Ms. Sarah Chen',
    review: 'Beautiful venue with stunning views. Our wedding was everything we dreamed of. The coordination team made the entire process seamless.',
    eventType: 'Wedding',
  },
  {
    id: '8',
    name: 'Pastor Mark Santos',
    organization: 'Grace Community Church',
    review: 'Our church retreat at LifePlace was transformative. The peaceful atmosphere and excellent facilities created the perfect environment for spiritual growth.',
    eventType: 'Church Retreat',
  },
  {
    id: '9',
    name: 'Mr. James Rodriguez',
    organization: 'Tech Solutions Corp',
    review: 'Our company team building was a huge success! The outdoor activities, comfortable rooms, and delicious food exceeded our expectations.',
    eventType: 'Team Building',
  },
  {
    id: '10',
    name: 'Ms. Ana Reyes',
    review: 'The Sanctuary was the perfect venue for our wedding ceremony. The chapel is beautiful and the garden reception area was stunning.',
    eventType: 'Wedding',
  },
  {
    id: '11',
    name: 'School of Leadership Philippines',
    organization: 'SLP',
    review: 'We have been hosting our leadership training programs at LifePlace for years. The facilities and service quality are consistently excellent.',
    eventType: 'Leadership Training',
  },
  {
    id: '12',
    name: 'Mr. Michael Tan',
    review: 'Perfect blend of nature and modern amenities. The pool area was a hit with our guests. Highly recommend for family gatherings!',
    eventType: 'Family Event',
  },
  {
    id: '13',
    name: 'Ms. Patricia Lim',
    organization: 'Creative Events PH',
    review: 'As an events coordinator, I highly recommend LifePlace to my clients. The venue is versatile and the team is always professional.',
    eventType: 'Multiple Events',
  },
  {
    id: '14',
    name: 'Youth for Christ Cavite',
    organization: 'YFC Cavite',
    review: 'Our youth camp was memorable! The spacious grounds, comfortable dorms, and helpful staff made our event a success.',
    eventType: 'Youth Camp',
  },
  {
    id: '15',
    name: 'Mr. David Kim',
    review: 'The team building package was worth every peso. Our employees are still talking about the experience months later.',
    eventType: 'Team Building',
  },
  {
    id: '16',
    name: 'Ms. Grace Villanueva',
    review: 'Had our renewal of vows at the Angelic Field. The string lights at sunset created the most magical atmosphere. Simply breathtaking!',
    eventType: 'Wedding',
  },
];

export const TestimonialGrid: React.FC = () => {
  return (
    <Section background="sage" spacing="large">
      <Container maxWidth="wide">
        <Stack spacing={{ xs: 6, md: 8 }}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack
              spacing={3}
              alignItems="center"
              sx={{ textAlign: 'center' }}
            >
              <Typography
                variant="h2"
                sx={{
                  ...tokens.typography.responsive.h2.mobile,
                  '@media (min-width: 768px)': tokens.typography.responsive.h2.tablet,
                  '@media (min-width: 1024px)': tokens.typography.responsive.h2.desktop,
                  color: tokens.color.base.sage[900],
                }}
              >
                What Our Guests Say
              </Typography>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.sage[700],
                  maxWidth: '700px',
                }}
              >
                Real experiences from real guests. See why LifePlace is the preferred venue
                for weddings, retreats, and team building events.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Testimonials Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: {
                xs: tokens.spacing.layout.grid.gap.sm,
                md: tokens.spacing.layout.grid.gap.md,
                lg: tokens.spacing.layout.grid.gap.lg,
              },
            }}
          >
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                index={index}
              />
            ))}
          </Box>
        </Stack>
      </Container>
    </Section>
  );
};
