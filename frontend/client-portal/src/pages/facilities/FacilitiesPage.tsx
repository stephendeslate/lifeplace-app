// pages/facilities/FacilitiesPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { FacilitiesHero } from './components/FacilitiesHero';
import { FacilitiesGrid } from '../about/components/FacilitiesGrid';
import { LocationContact } from '../about/components/LocationContact';
import type { FacilitiesPageProps } from './types/facilities.types';

const FacilitiesPage: React.FC<FacilitiesPageProps> = ({ onNavigateToBooking }) => {
  return (
    <>
      <SEO
        title="Facilities | LifePlace Alfonso"
        description="Explore our facilities including conference rooms, outdoor areas, and accommodation at LifePlace Alfonso."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
      <FacilitiesHero />
      <FacilitiesGrid />
      <LocationContact onNavigateToBooking={onNavigateToBooking} />
      </Box>
    </>
  );
};

export default FacilitiesPage;
