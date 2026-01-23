// pages/podcasts/components/PodcastsGrid.tsx
/**
 * PodcastsGrid Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - Section and Container components for layout structure
 * - Responsive grid (1/2/3 columns based on screen size)
 * - Typography using design system tokens (h2 for section heading)
 * - Staggered animations for engaging user experience
 * - Cream background for warm, inviting feel
 * - Grid gaps using design tokens
 * - WCAG AA compliant color contrast
 * - Integration with PodcastEpisode cards
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { PodcastEpisodeCard } from './PodcastEpisode';
import { Section, Container, AnimatedElement, tokens } from '../../../design-system';
import type { PodcastEpisode } from '../types/podcasts.types';

// Hardcoded episodes from lifeplacealfonso.com
const podcastEpisodes: PodcastEpisode[] = [
  {
    id: 'ep-1',
    title: 'Importance of Rest',
    hosts: ['Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'In this episode, Peter and Shekinah discuss the significance of rest in our fast-paced world. Learn why taking time to pause and recharge is not just a luxury, but a necessity for a balanced and fulfilling life.',
    duration: '25 min',
    videoUrl: 'https://www.youtube.com/embed/TI3H-h6bVC8',
  },
  {
    id: 'ep-2',
    title: 'Being Is Greater Than Doing',
    hosts: ['Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'Explore the profound truth that who we are matters more than what we accomplish. Peter and Shakinah share insights on finding identity beyond productivity and embracing the value of simply being present.',
    duration: '30 min',
    videoUrl: 'https://www.youtube.com/embed/6E2-e8kFTH8',
  },
  {
    id: 'ep-3',
    title: 'The Reality of Marriage',
    hosts: ['Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'An honest conversation about the joys and challenges of marriage. Peter and Shekinah open up about their journey together, sharing practical wisdom for building a strong and lasting relationship.',
    duration: '35 min',
    videoUrl: 'https://www.youtube.com/embed/bipsERoPAX8',
  },
  {
    id: 'ep-4',
    title: 'How to Forgive',
    hosts: ['Krizzia Kate Yuzon', 'Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'Forgiveness is one of the most powerful yet difficult things we can do. Join this meaningful conversation about the freedom that comes from letting go and the practical steps toward healing and reconciliation.',
    duration: '40 min',
    videoUrl: 'https://www.youtube.com/embed/HkHkAy8dx5s',
  },
];

export const PodcastsGrid: React.FC = () => {
  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="wide">
        {/* Section Heading */}
        <AnimatedElement animation="fadeIn" delay={0}>
          <Typography
            component="h2"
            sx={{
              ...tokens.typography.styles.h2,
              fontSize: {
                xs: tokens.typography.responsive.h2.mobile.fontSize,
                md: tokens.typography.responsive.h2.tablet.fontSize,
                lg: tokens.typography.responsive.h2.desktop.fontSize,
              },
              lineHeight: {
                xs: tokens.typography.responsive.h2.mobile.lineHeight,
                md: tokens.typography.responsive.h2.tablet.lineHeight,
                lg: tokens.typography.responsive.h2.desktop.lineHeight,
              },
              color: tokens.color.base.neutral[900],
              textAlign: 'center',
              mb: { xs: tokens.spacing.space[6], md: tokens.spacing.space[8] },
            }}
          >
            Recent Episodes
          </Typography>
        </AnimatedElement>

        {/* Podcast Episodes Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: {
              xs: tokens.spacing.space[4],
              md: tokens.spacing.space[6],
            },
            width: '100%',
            mb: { xs: tokens.spacing.space[6], md: tokens.spacing.space[8] },
          }}
        >
          {podcastEpisodes.map((episode, index) => (
            <PodcastEpisodeCard key={episode.id} episode={episode} index={index} />
          ))}
        </Box>

        {/* Coming Soon Message */}
        <AnimatedElement animation="fadeIn" delay={500}>
          <Typography
            sx={{
              ...tokens.typography.styles.body,
              color: tokens.color.base.neutral[600],
              textAlign: 'center',
              maxWidth: 700,
              mx: 'auto',
              lineHeight: tokens.typography.lineHeights.relaxed,
            }}
          >
            More episodes coming soon. Subscribe to stay updated on new conversations about life, rest, and purpose.
          </Typography>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
