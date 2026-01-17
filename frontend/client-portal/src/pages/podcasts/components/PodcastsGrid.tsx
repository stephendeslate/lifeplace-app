// pages/podcasts/components/PodcastsGrid.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { PodcastEpisodeCard } from './PodcastEpisode';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
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
    videoUrl: '', // To be provided later
  },
  {
    id: 'ep-2',
    title: 'Being Is Greater Than Doing',
    hosts: ['Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'Explore the profound truth that who we are matters more than what we accomplish. Peter and Shekinah share insights on finding identity beyond productivity and embracing the value of simply being present.',
    duration: '30 min',
    videoUrl: '', // To be provided later
  },
  {
    id: 'ep-3',
    title: 'The Reality of Marriage',
    hosts: ['Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'An honest conversation about the joys and challenges of marriage. Peter and Shekinah open up about their journey together, sharing practical wisdom for building a strong and lasting relationship.',
    duration: '35 min',
    videoUrl: '', // To be provided later
  },
  {
    id: 'ep-4',
    title: 'How to Forgive',
    hosts: ['Krizzia Kate Yuzon', 'Peter Gramaje', 'Shekinah Gramaje'],
    description:
      'Forgiveness is one of the most powerful yet difficult things we can do. Join this meaningful conversation about the freedom that comes from letting go and the practical steps toward healing and reconciliation.',
    duration: '40 min',
    videoUrl: '', // To be provided later
  },
];

export const PodcastsGrid: React.FC = () => {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
      }}
    >
      <Stack spacing={{ xs: 6, md: 8 }} alignItems="center" sx={{ maxWidth: 1200, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            Recent Episodes
          </Typography>
        </AnimatedElement>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
            },
            gap: { xs: 3, md: 4 },
            width: '100%',
          }}
        >
          {podcastEpisodes.map((episode, index) => (
            <PodcastEpisodeCard key={episode.id} episode={episode} index={index} />
          ))}
        </Box>

        <AnimatedElement animation="fadeIn" delay={500}>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              maxWidth: 600,
              lineHeight: 1.6,
            }}
          >
            More episodes coming soon. Subscribe to stay updated on new conversations about life, rest, and purpose.
          </Typography>
        </AnimatedElement>
      </Stack>
    </Box>
  );
};
