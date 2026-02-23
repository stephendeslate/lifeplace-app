// pages/podcasts/PodcastsPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { Section, Container } from '../../design-system';
import { PodcastsHero } from './components/PodcastsHero';
import { PodcastsGrid } from './components/PodcastsGrid';

const PodcastsPage: React.FC = () => {
  return (
    <>
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
