// pages/about/AboutPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { AboutHero } from './components/AboutHero';
import { MissionSection } from './components/MissionSection';
import { FacilitiesGrid } from './components/FacilitiesGrid';
import { LocationContact } from './components/LocationContact';
import type { AboutPageProps } from './types/about.types';

const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToBooking }) => {
  return (
    <Box sx={{ minHeight: '100vh', width: '100vw' }}>
      <AboutHero />
      <MissionSection />
      <FacilitiesGrid />
      <LocationContact onNavigateToBooking={onNavigateToBooking} />
    </Box>
  );
};

export default AboutPage;
