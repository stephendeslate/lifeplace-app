// pages/about/AboutPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { AboutHero } from './components/AboutHero';
import { ServicesSection } from './components/ServicesSection';
import { FacilitiesGrid } from './components/FacilitiesGrid';
import { LocationContact } from './components/LocationContact';
import type { AboutPageProps } from './types/about.types';

const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToBooking }) => {
  return (
    <Box sx={{ minHeight: '100vh', width: '100vw' }}>
      <AboutHero />
      <ServicesSection />
      <FacilitiesGrid />
      <LocationContact onNavigateToBooking={onNavigateToBooking} />
    </Box>
  );
};

export default AboutPage;
