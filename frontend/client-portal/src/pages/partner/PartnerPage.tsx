// pages/partner/PartnerPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { PartnerHero } from './components/PartnerHero';
import { PartnerBenefits } from './components/PartnerBenefits';
import { PartnerCategories } from './components/PartnerCategories';
import { PartnerContact } from './components/PartnerContact';
import type { PartnerPageProps } from './types/partner.types';

const PartnerPage: React.FC<PartnerPageProps> = () => {
  return (
    <>
      <SEO
        title="Partner With Us | LifePlace Alfonso"
        description="Partner with LifePlace Alfonso. Supplier and vendor partnership opportunities in Cavite."
      />
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
