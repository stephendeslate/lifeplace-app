// pages/home/Home.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { HeroSection } from './components/HeroSection';
import { VenuesSection } from './components/VenuesSection';
import { ServicesSection } from './components/ServicesSection';
import { SocialProofSection } from './components/SocialProofSection';
import { AvailabilitySection } from './components/AvailabilitySection';
import { ContactSection } from './components/ContactSection';
import type { HomeProps } from './types/home.types';

const Home: React.FC<HomeProps> = ({
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToBooking,
}) => {
  return (
    <>
      <SEO
        title="LifePlace Alfonso | Event Venue in Cavite"
        description="Book weddings, retreats, team building, and corporate events at LifePlace Alfonso. Beautiful nature venue in Cavite, Philippines."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
      <HeroSection 
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToBooking={onNavigateToBooking}
      />
      
      <VenuesSection />
      
      <SocialProofSection />
      
      <AvailabilitySection 
        onNavigateToBooking={onNavigateToBooking}
      />
      
      <ServicesSection />
      
      <ContactSection
        onNavigateToBooking={onNavigateToBooking}
        onNavigateToRegister={onNavigateToRegister}
      />
      </Box>
    </>
  );
};

export default Home;