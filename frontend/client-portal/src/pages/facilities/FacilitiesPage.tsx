// pages/facilities/FacilitiesPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { FacilitiesHero } from './components/FacilitiesHero';
import { FacilitiesGrid } from '../about/components/FacilitiesGrid';
import { LocationContact } from '../about/components/LocationContact';
import type { FacilitiesPageProps } from './types/facilities.types';

const FacilitiesPage: React.FC<FacilitiesPageProps> = ({ onNavigateToBooking }) => {
  return (
    <Box sx={{ minHeight: '100vh', width: '100vw' }}>
      <FacilitiesHero />
      <FacilitiesGrid />
      <LocationContact onNavigateToBooking={onNavigateToBooking} />
    </Box>
  );
};

export default FacilitiesPage;
