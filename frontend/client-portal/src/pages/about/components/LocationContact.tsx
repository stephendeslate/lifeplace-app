// pages/about/components/LocationContact.tsx

import React from 'react';
import { Box, Typography, Stack, IconButton, Button } from '@mui/material';
import {
  LocationOn,
  Phone,
  Email,
  Directions,
  Facebook,
  Instagram,
  MusicNote,
} from '@mui/icons-material';
import { Section, Container, ModernCard, tokens } from '../../../design-system';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { ContactInfo, SocialLink, AboutPageProps } from '../types/about.types';

export const LocationContact: React.FC<Pick<AboutPageProps, 'onNavigateToBooking'>> = ({
  onNavigateToBooking,
}) => {
  const contactInfo: ContactInfo[] = [
    {
      type: 'location',
      label: 'Location',
      value: 'Patutong Malaki North, Alfonso, Cavite 4120',
      icon: <LocationOn sx={{ fontSize: 32 }} />,
    },
    {
      type: 'phone',
      label: 'Phone',
      value: '(046) 889 0844 / (0962) 275 3145 / +639935260943',
      icon: <Phone sx={{ fontSize: 32 }} />,
    },
    {
      type: 'email',
      label: 'Email',
      value: 'reservations.lifeplace@gmail.com',
      icon: <Email sx={{ fontSize: 32 }} />,
    },
  ];

  const socialLinks: SocialLink[] = [
    {
      platform: 'Facebook',
      url: 'https://facebook.com/lifeplacealfonso',
      icon: <Facebook />,
    },
    {
      platform: 'Instagram',
      url: 'https://instagram.com/lifeplacealfonso',
      icon: <Instagram />,
    },
    {
      platform: 'TikTok',
      url: 'https://tiktok.com/@lifeplacealfonso',
      icon: <MusicNote />,
    },
  ];

  const handleGetDirections = () => {
    const address = encodeURIComponent('Patutong Malaki North, Alfonso, Cavite 4120');
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  return (
    <Section background="sage" spacing="xlarge">
      <Container maxWidth="wide">
        <Stack spacing={{ xs: 6, md: 8 }}>
          {/* Section Heading */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={3} alignItems="center">
              <Typography
                variant="h2"
                sx={{
                  fontWeight: tokens.typography.weights.bold,
                  textAlign: 'center',
                  color: tokens.color.base.sage[900],
                }}
              >
                Visit Us
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: tokens.color.base.sage[700],
                  maxWidth: 700,
                  textAlign: 'center',
                  fontWeight: tokens.typography.weights.regular,
                }}
              >
                We're located near Tagaytay, easily accessible from Metro Manila.
                Come visit us or get in touch to start planning your event.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Map & Contact Info Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
              gap: { xs: 4, md: 5 },
              alignItems: 'start',
            }}
          >
            {/* Map Card */}
            <AnimatedElement animation="slideUp" delay={200}>
              <ModernCard variant="elevated" size="large" sx={{ height: '100%', minHeight: 400 }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 350,
                      borderRadius: tokens.spacing.radius.xl,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <iframe
                      title="LifePlace Alfonso Location"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3870.4747777777777!2d120.84999999999999!3d14.14!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDA4JzI0LjAiTiAxMjDCsDUxJzAwLjAiRQ!5e0!3m2!1sen!2sph!4v1234567890"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<Directions />}
                    onClick={handleGetDirections}
                    sx={{
                      backgroundColor: tokens.color.base.sage[600],
                      color: 'white',
                      fontWeight: tokens.typography.weights.semibold,
                      py: 1.5,
                      transition: tokens.animation.transition.smooth,
                      '&:hover': {
                        backgroundColor: tokens.color.base.sage[700],
                        transform: 'translateY(-2px)',
                        boxShadow: tokens.shadow.elevation.md,
                      },
                    }}
                  >
                    Get Directions
                  </Button>
                </Stack>
              </ModernCard>
            </AnimatedElement>

            {/* Contact Info Cards */}
            <Stack spacing={3}>
              {contactInfo.map((contact, index) => (
                <AnimatedElement key={contact.type} animation="slideUp" delay={300 + index * 100}>
                  <ModernCard variant="elevated" size="medium" hover>
                    <Stack direction="row" spacing={3} alignItems="flex-start">
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: '50%',
                          backgroundColor:
                            contact.type === 'location'
                              ? tokens.color.base.terracotta[100]
                              : contact.type === 'phone'
                              ? tokens.color.base.sage[100]
                              : tokens.color.base.neutral[100],
                          color:
                            contact.type === 'location'
                              ? tokens.color.base.terracotta[700]
                              : contact.type === 'phone'
                              ? tokens.color.base.sage[700]
                              : tokens.color.base.neutral[700],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {contact.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: tokens.typography.weights.semibold,
                            mb: 1,
                            color: tokens.color.base.neutral[900],
                          }}
                        >
                          {contact.label}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            color: tokens.color.base.neutral[700],
                            lineHeight: 1.6,
                          }}
                        >
                          {contact.value}
                        </Typography>
                      </Box>
                    </Stack>
                  </ModernCard>
                </AnimatedElement>
              ))}
            </Stack>
          </Box>

          {/* Social Media & CTA */}
          <AnimatedElement animation="fadeIn" delay={600}>
            <Stack spacing={4} alignItems="center" sx={{ mt: { xs: 4, md: 6 } }}>
              {/* Social Media */}
              <Stack spacing={2} alignItems="center">
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.color.base.sage[900],
                  }}
                >
                  Follow Us
                </Typography>
                <Stack direction="row" spacing={2}>
                  {socialLinks.map((social) => (
                    <IconButton
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit our ${social.platform} page`}
                      sx={{
                        backgroundColor: tokens.color.base.sage[100],
                        color: tokens.color.base.sage[700],
                        width: 48,
                        height: 48,
                        transition: tokens.animation.transition.smooth,
                        '&:hover': {
                          backgroundColor: tokens.color.base.sage[200],
                          transform: 'translateY(-4px)',
                          boxShadow: tokens.shadow.elevation.md,
                        },
                      }}
                    >
                      {social.icon}
                    </IconButton>
                  ))}
                </Stack>
              </Stack>

              {/* CTA Button */}
              <Button
                variant="contained"
                size="large"
                onClick={onNavigateToBooking}
                sx={{
                  minWidth: 280,
                  backgroundColor: tokens.color.base.terracotta[500],
                  color: 'white',
                  fontWeight: tokens.typography.weights.semibold,
                  px: 4,
                  py: 1.5,
                  transition: tokens.animation.transition.smooth,
                  '&:hover': {
                    backgroundColor: tokens.color.base.terracotta[600],
                    transform: 'translateY(-2px)',
                    boxShadow: tokens.shadow.elevation.md,
                  },
                }}
              >
                Start Planning Your Event
              </Button>
            </Stack>
          </AnimatedElement>
        </Stack>
      </Container>
    </Section>
  );
};
