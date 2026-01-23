// components/layout/PublicFooter.tsx

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Link as MuiLink,
  IconButton,
  Divider,
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
import { tokens } from '../../design-system';

export const PublicFooter: React.FC = () => {
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
        background: tokens.color.gradients.earthToSky,
        color: 'white',
        pt: { xs: tokens.spacing.space[6], md: tokens.spacing.space[8] },
        pb: tokens.spacing.space[3],
      }}
    >
      <Container maxWidth="lg">
        <AnimatedElement animation="fadeIn" delay={100}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
            gap: tokens.spacing.space[4],
          }}>
            {/* Company Info */}
            <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
              <Box sx={{ mb: tokens.spacing.space[3] }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: tokens.typography.weights.bold,
                    mb: tokens.spacing.space[2],
                  }}
                >
                  LifePlace Alfonso
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: tokens.color.base.neutral[100],
                    lineHeight: 1.7,
                    mb: tokens.spacing.space[3],
                  }}
                >
                  Creating unforgettable moments in the heart of nature. Experience the perfect
                  blend of tranquility and celebration at our beautiful venue in Alfonso, Cavite.
                </Typography>
                
                {/* Social Media */}
                <Box sx={{ display: 'flex', gap: tokens.spacing.space[1] }}>
                  {socialLinks.map((social) => (
                    <IconButton
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: tokens.color.base.neutral[100],
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': {
                          color: tokens.color.base.gold[200],
                          backgroundColor: alpha('#fff', 0.2),
                          transform: 'translateY(-2px)',
                        },
                        transition: tokens.animation.transition.all,
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
              <Typography
                variant="h6"
                sx={{
                  fontWeight: tokens.typography.weights.semibold,
                  mb: tokens.spacing.space[2],
                }}
              >
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space[1] }}>
                {quickLinks.map((link) => (
                  <MuiLink
                    key={link.label}
                    component={RouterLink}
                    to={link.href}
                    sx={{
                      color: tokens.color.base.neutral[100],
                      textDecoration: 'none',
                      fontSize: tokens.typography.sizes.base,
                      transition: tokens.animation.transition.all,
                      '&:hover': {
                        color: tokens.color.base.gold[300],
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {link.label}
                  </MuiLink>
                ))}
              </Box>
            </Box>

            {/* Services */}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: tokens.typography.weights.semibold,
                  mb: tokens.spacing.space[2],
                }}
              >
                Our Services
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space[1] }}>
                {services.map((service) => (
                  <MuiLink
                    key={service.label}
                    component={RouterLink}
                    to={service.href}
                    sx={{
                      color: tokens.color.base.neutral[100],
                      textDecoration: 'none',
                      fontSize: tokens.typography.sizes.base,
                      transition: tokens.animation.transition.all,
                      '&:hover': {
                        color: tokens.color.base.gold[300],
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {service.label}
                  </MuiLink>
                ))}
              </Box>
            </Box>

            {/* Contact Info */}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: tokens.typography.weights.semibold,
                  mb: tokens.spacing.space[2],
                }}
              >
                Contact Us
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space[2] }}>
                {contactInfo.map((contact) => (
                  <Box key={contact.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.space[1] }}>
                    <Box sx={{ color: tokens.color.base.neutral[200], mt: 0.5 }}>
                      {contact.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: tokens.color.base.neutral[200],
                          fontSize: tokens.typography.sizes.sm,
                        }}
                      >
                        {contact.label}
                      </Typography>
                      {contact.href ? (
                        <MuiLink
                          href={contact.href}
                          sx={{
                            color: tokens.color.base.neutral[100],
                            textDecoration: 'none',
                            fontSize: tokens.typography.sizes.base,
                            transition: tokens.animation.transition.all,
                            '&:hover': {
                              color: tokens.color.base.gold[300],
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {contact.value}
                        </MuiLink>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            color: tokens.color.base.neutral[100],
                            fontSize: tokens.typography.sizes.base,
                          }}
                        >
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

        <Divider sx={{ my: tokens.spacing.space[4], borderColor: alpha('#fff', 0.1) }} />

        {/* Bottom Section */}
        <AnimatedElement animation="fadeIn" delay={200}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: tokens.spacing.space[2],
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: tokens.color.base.neutral[200],
                fontSize: tokens.typography.sizes.sm,
              }}
            >
              © {new Date().getFullYear()} LifePlace Alfonso. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: tokens.spacing.space[3] }}>
              <MuiLink
                component={RouterLink}
                to="/privacy"
                sx={{
                  color: tokens.color.base.neutral[200],
                  textDecoration: 'none',
                  fontSize: tokens.typography.sizes.sm,
                  transition: tokens.animation.transition.all,
                  '&:hover': {
                    color: tokens.color.base.gold[300],
                    textDecoration: 'underline',
                  },
                }}
              >
                Privacy Policy
              </MuiLink>
              <MuiLink
                component={RouterLink}
                to="/terms"
                sx={{
                  color: tokens.color.base.neutral[200],
                  textDecoration: 'none',
                  fontSize: tokens.typography.sizes.sm,
                  transition: tokens.animation.transition.all,
                  '&:hover': {
                    color: tokens.color.base.gold[300],
                    textDecoration: 'underline',
                  },
                }}
              >
                Terms of Service
              </MuiLink>
            </Box>
          </Box>
        </AnimatedElement>
      </Container>
    </Box>
  );
};