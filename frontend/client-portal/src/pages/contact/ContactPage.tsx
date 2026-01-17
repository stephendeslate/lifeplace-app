// pages/contact/ContactPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { ContactHero } from './components/ContactHero';
import { ContactInfo } from './components/ContactInfo';
import { ContactSocial } from './components/ContactSocial';
import { ContactForm } from './components/ContactForm';
import { ContactMap } from './components/ContactMap';
import type { ContactPageProps } from './types/contact.types';

const ContactPage: React.FC<ContactPageProps> = () => {
  return (
    <>
      <SEO
        title="Contact Us | LifePlace Alfonso"
        description="Get in touch with LifePlace Alfonso. Contact us for bookings, inquiries, and venue tours."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
      <ContactHero />
      <ContactInfo />
      <ContactForm />
      <ContactSocial />
      <ContactMap />
      </Box>
    </>
  );
};

export default ContactPage;
