// frontend/client-portal/src/components/layout/PublicFooter.tsx

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import {
  LocationOn,
  Phone,
  Email,
  Facebook,
  Instagram,
  AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const PublicFooter: React.FC = () => {
  const navigate = useNavigate();

  const quickLinks = [
    { label: 'Venues', path: '/venues' },
    { label: 'Services', path: '/services' },
    { label: 'Packages', path: '/packages' },
    { label: 'Gallery', path: '/gallery' },
  ];

  const services = [
    { label: 'Weddings', path: '/services/weddings' },
    { label: 'Team Building', path: '/services/team-building' },
    { label: 'Retreats', path: '/services/retreats' },
    { label: 'Camping', path: '/services/camping' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        pt: { xs: 6, md: 8 },
        pb: 3,
        width: '100vw',
      }}
    >
      <Box
        sx={{
          width: '100%',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 4, md: 6 },
            mb: 4,
          }}
        >
          {/* Brand Section */}
          <Box sx={{ flex: { md: 2 } }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              LifePlace Alfonso
            </Typography>
            
            <Typography
              variant="body1"
              sx={{
                mb: 3,
                lineHeight: 1.7,
                opacity: 0.9,
                maxWidth: 400,
              }}
            >
              Experience the cozy ambience and peaceful environment at LifePlace. 
              Celebrate life's most precious moments in our breathtaking venue that 
              offers the perfect blend of beauty and luxury.
            </Typography>

            <Typography
              variant="body2"
              sx={{
                fontStyle: 'italic',
                opacity: 0.8,
                mb: 3,
              }}
            >
              "I have come that they may have life, and have it to the full." - John 10:10b
            </Typography>

            {/* Social Media */}
            <Box display="flex" gap={1}>
              <Button
                size="small"
                sx={{
                  minWidth: 40,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: alpha('#fff', 0.1),
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => window.open('https://www.facebook.com/lifeplacealfonso/', '_blank')}
              >
                <Facebook />
              </Button>
              <Button
                size="small"
                sx={{
                  minWidth: 40,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: alpha('#fff', 0.1),
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => window.open('https://www.instagram.com/lifeplacealfonso/', '_blank')}
              >
                <Instagram />
              </Button>
            </Box>
          </Box>

          {/* Quick Links */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
              }}
            >
              Quick Links
            </Typography>
            <Stack spacing={1}>
              {quickLinks.map((link) => (
                <Button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'inherit',
                    opacity: 0.8,
                    px: 0,
                    py: 0.5,
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Services */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
              }}
            >
              Our Services
            </Typography>
            <Stack spacing={1}>
              {services.map((service) => (
                <Button
                  key={service.path}
                  onClick={() => navigate(service.path)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'inherit',
                    opacity: 0.8,
                    px: 0,
                    py: 0.5,
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {service.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Contact Info */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
              }}
            >
              Contact Us
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <LocationOn sx={{ fontSize: 20, mt: 0.2, opacity: 0.8 }} />
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Alfonso, Cavite<br />
                    Near Tagaytay City
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <Phone sx={{ fontSize: 20, opacity: 0.8 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  (02) 123-4567
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <Email sx={{ fontSize: 20, opacity: 0.8 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  info@lifeplacealfonso.com
                </Typography>
              </Box>

              <Box display="flex" alignItems="flex-start" gap={1}>
                <AccessTime sx={{ fontSize: 20, mt: 0.2, opacity: 0.8 }} />
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Open Daily<br />
                    8:00 AM - 10:00 PM
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ borderColor: alpha('#fff', 0.2), mb: 3 }} />

        {/* Bottom Footer */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              opacity: 0.7,
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            © 2025 LifePlace Alfonso. All rights reserved. Celebrating life's precious moments.
          </Typography>
          
          <Box
            display="flex"
            flexDirection={{ xs: 'column', sm: 'row' }}
            gap={{ xs: 1, sm: 3 }}
            alignItems="center"
          >
            <Button
              size="small"
              onClick={() => navigate('/privacy')}
              sx={{
                color: 'inherit',
                opacity: 0.7,
                fontSize: '0.75rem',
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              Privacy Policy
            </Button>
            <Button
              size="small"
              onClick={() => navigate('/terms')}
              sx={{
                color: 'inherit',
                opacity: 0.7,
                fontSize: '0.75rem',
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              Terms of Service
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};