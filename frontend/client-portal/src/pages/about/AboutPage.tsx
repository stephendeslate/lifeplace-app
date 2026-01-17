// pages/about/AboutPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { AboutHero } from './components/AboutHero';
import { ServicesSection } from './components/ServicesSection';
import { FacilitiesGrid } from './components/FacilitiesGrid';
import { LocationContact } from './components/LocationContact';
import type { AboutPageProps } from './types/about.types';

const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToBooking }) => {
  return (
    <>
      <SEO
        title="About Us | LifePlace Alfonso"
        description="Learn about LifePlace Alfonso, a premier event venue in Cavite offering camps, retreats, and corporate events in a natural setting."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
      <AboutHero />
      <ServicesSection />
      <FacilitiesGrid />
      <LocationContact onNavigateToBooking={onNavigateToBooking} />
      </Box>
    </>
  );
};

export default AboutPage;
