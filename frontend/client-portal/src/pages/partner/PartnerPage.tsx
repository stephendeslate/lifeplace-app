// pages/partner/PartnerPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { PartnerHero } from './components/PartnerHero';
import { PartnerBenefits } from './components/PartnerBenefits';
import { PartnerCategories } from './components/PartnerCategories';
import { PartnerContact } from './components/PartnerContact';
import type { PartnerPageProps } from './types/partner.types';

const PartnerPage: React.FC<PartnerPageProps> = () => {
  return (
    <>
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
        <PartnerHero />
        <PartnerBenefits />
        <PartnerCategories />
        <PartnerContact />
      </Box>
    </>
  );
};

export default PartnerPage;
