// components/layout/PublicFooter.tsx

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  IconButton,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocationOn,
  Phone,
  Email,
  Facebook,
  Instagram,
  Twitter,
  YouTube,
} from '@mui/icons-material';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

export const PublicFooter: React.FC = () => {
  const theme = useTheme();

  const contactInfo = [
    {
      icon: <LocationOn />,
      label: 'Address',
      value: 'Alfonso, Cavite, Philippines',
    },
    {
      icon: <Phone />,
      label: 'Phone',
      value: '+63 (02) 123-4567',
      href: 'tel:+630212345567',
    },
    {
      icon: <Email />,
      label: 'Email',
      value: 'info@lifeplacealfonso.com',
      href: 'mailto:info@lifeplacealfonso.com',
    },
  ];

  const quickLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'Services', href: '/#services' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Testimonials', href: '/testimonials' },
    { label: 'Contact', href: '/contact' },
  ];

  const services = [
    { label: 'Weddings', href: '/services/weddings' },
    { label: 'Corporate Events', href: '/services/corporate' },
    { label: 'Retreats', href: '/services/retreats' },
    { label: 'Team Building', href: '/services/team-building' },
    { label: 'Camping', href: '/services/camping' },
  ];

  const socialLinks = [
    { icon: <Facebook />, href: 'https://facebook.com/lifeplacealfonso', label: 'Facebook' },
    { icon: <Instagram />, href: 'https://instagram.com/lifeplacealfonso', label: 'Instagram' },
    { icon: <Twitter />, href: 'https://twitter.com/lifeplacealfonso', label: 'Twitter' },
    { icon: <YouTube />, href: 'https://youtube.com/lifeplacealfonso', label: 'YouTube' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        color: 'white',
        pt: { xs: 6, md: 8 },
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        <AnimatedElement animation="fadeIn" delay={100}>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 4,
          }}>
            {/* Company Info */}
            <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  LifePlace Alfonso
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.7, mb: 3 }}>
                  Creating unforgettable moments in the heart of nature. Experience the perfect 
                  blend of tranquility and celebration at our beautiful venue in Alfonso, Cavite.
                </Typography>
                
                {/* Social Media */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {socialLinks.map((social) => (
                    <IconButton
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: 'white',
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.2),
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      {social.icon}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Quick Links */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    sx={{
                      color: 'white',
                      textDecoration: 'none',
                      opacity: 0.8,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        opacity: 1,
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Box>

            {/* Services */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Our Services
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {services.map((service) => (
                  <Link
                    key={service.label}
                    href={service.href}
                    sx={{
                      color: 'white',
                      textDecoration: 'none',
                      opacity: 0.8,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        opacity: 1,
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {service.label}
                  </Link>
                ))}
              </Box>
            </Box>

            {/* Contact Info */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Contact Us
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {contactInfo.map((contact) => (
                  <Box key={contact.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ color: alpha('#fff', 0.7), mt: 0.5 }}>
                      {contact.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                        {contact.label}
                      </Typography>
                      {contact.href ? (
                        <Link
                          href={contact.href}
                          sx={{
                            color: 'white',
                            textDecoration: 'none',
                            opacity: 0.9,
                            '&:hover': {
                              opacity: 1,
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {contact.value}
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {contact.value}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </AnimatedElement>

        <Divider sx={{ my: 4, borderColor: alpha('#fff', 0.1) }} />

        {/* Bottom Section */}
        <AnimatedElement animation="fadeIn" delay={200}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              © {new Date().getFullYear()} LifePlace Alfonso. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Link
                href="/privacy"
                sx={{
                  color: 'white',
                  textDecoration: 'none',
                  opacity: 0.7,
                  fontSize: '0.875rem',
                  '&:hover': {
                    opacity: 1,
                    textDecoration: 'underline',
                  },
                }}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                sx={{
                  color: 'white',
                  textDecoration: 'none',
                  opacity: 0.7,
                  fontSize: '0.875rem',
                  '&:hover': {
                    opacity: 1,
                    textDecoration: 'underline',
                  },
                }}
              >
                Terms of Service
              </Link>
            </Box>
          </Box>
        </AnimatedElement>
      </Container>
    </Box>
  );
};