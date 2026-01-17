// pages/podcasts/PodcastsPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { GradientBackground } from '../../design-system/components/GradientBackground';
import { PodcastsHero } from './components/PodcastsHero';
import { PodcastsGrid } from './components/PodcastsGrid';

const PodcastsPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Podcasts | LifePlace Alfonso"
        description="Listen to the LifePlace Alfonso podcast series featuring conversations about events and venue management."
      />
      <Box>
      {/* Hero Section */}
      <PodcastsHero />

      {/* Episodes Grid */}
      <GradientBackground
        gradient="forest"
        animated={false}
        sx={{
          py: { xs: 4, md: 6 },
        }}
      >
        <PodcastsGrid />
      </GradientBackground>
      </Box>
    </>
  );
};

export default PodcastsPage;
