// pages/podcasts/PodcastsPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { Section, Container } from '../../design-system';
import { PodcastsHero } from './components/PodcastsHero';
import { PodcastsGrid } from './components/PodcastsGrid';

const PodcastsPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Podcasts | LifePlace Alfonso"
        description="Listen to the LifePlace Alfonso podcast series featuring conversations about events and venue management."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
      {/* Hero Section */}
      <PodcastsHero />

      {/* Episodes Grid */}
      <Section background="white" spacing="large">
        <Container maxWidth="wide">
          <PodcastsGrid />
        </Container>
      </Section>
      </Box>
    </>
  );
};

export default PodcastsPage;
