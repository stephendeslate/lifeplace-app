// frontend/client-portal/src/pages/home/Home.tsx

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Church,
  Home as HomeIcon,
  Groups,
  Nature,
  ArrowForward,
  LocationOn,
  Phone,
  Email,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface HomeProps {
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToBooking?: () => void;
}

const Home: React.FC<HomeProps> = ({
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToBooking,
}) => {
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();

  // Updated to always navigate to booking flow
  const handleBookNow = () => {
    onNavigateToBooking?.();
  };

  const venues = [
    {
      icon: <Church sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: 'Sanctuary Chapel',
      description: 'Say your vows in our picturesque chapel, designed for a truly unforgettable wedding ceremony.',
      capacity: 'Up to 150 guests',
    },
    {
      icon: <HomeIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
      title: 'The Pavilion',
      description: 'A spacious multipurpose hall perfect for larger celebrations and events.',
      capacity: 'Up to 200 guests',
    },
    {
      icon: <Nature sx={{ fontSize: 48, color: theme.palette.success.main }} />,
      title: 'Open Fields',
      description: 'The Open-Field and Angelic Field offer stunning natural surroundings for outdoor events.',
      capacity: 'Flexible outdoor space',
    },
    {
      icon: <Groups sx={{ fontSize: 48, color: theme.palette.info.main }} />,
      title: 'Cabanas & Hostel',
      description: '4 comfortable cabanas (10 guests each) and Havila hostel for overnight accommodations.',
      capacity: '40+ overnight guests',
    },
  ];

  const services = [
    {
      title: 'Weddings',
      description: 'Create timeless memories in our beautiful venues with comprehensive wedding packages.',
      image: '💒',
    },
    {
      title: 'Team Building',
      description: 'Strengthen bonds and foster creativity through hands-on activities in a peaceful environment.',
      image: '🤝',
    },
    {
      title: 'Retreats',
      description: 'Connect with others and find spiritual renewal in our tranquil retreat setting.',
      image: '🙏',
    },
    {
      title: 'Camping',
      description: 'Experience nature and community in our safe and comfortable camping facilities.',
      image: '🏕️',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw' }}>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)} 0%, ${alpha(theme.palette.secondary.main, 0.6)} 100%)`,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: alpha('#fff', 0.05),
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-20px)' },
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            left: '5%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: alpha('#fff', 0.03),
            animation: 'float 8s ease-in-out infinite reverse',
          }}
        />

        <Box
          sx={{
            width: '100%',
            px: { xs: 2, sm: 3, md: 4 },
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <Stack spacing={4} alignItems="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
                fontWeight: 700,
                maxWidth: 900,
                lineHeight: 1.1,
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              Celebrate Life's Most
              <Box component="span" sx={{ display: 'block', color: alpha('#fff', 0.9) }}>
                Precious Moments
              </Box>
            </Typography>

            <Typography
              variant="h5"
              sx={{
                maxWidth: 700,
                opacity: 0.95,
                fontWeight: 400,
                lineHeight: 1.6,
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              }}
            >
              Experience the cozy ambience and peaceful environment at LifePlace Alfonso. 
              Our breathtaking venue offers the perfect blend of beauty and luxury for your special occasions.
            </Typography>

            <Box
              sx={{
                p: 3,
                backgroundColor: alpha('#fff', 0.1),
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.2)}`,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontStyle: 'italic',
                  opacity: 0.9,
                  fontWeight: 400,
                }}
              >
                "I have come that they may have life, and have it to the full."
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                John 10:10b
              </Typography>
            </Box>

            {!isAuthenticated ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ mt: 4, width: { xs: '100%', sm: 'auto' } }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleBookNow}
                  endIcon={<ArrowForward />}
                  sx={{
                    backgroundColor: 'white',
                    color: theme.palette.primary.main,
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.9),
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Book Your Event
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onNavigateToLogin}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderWidth: 2,
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: alpha('#fff', 0.15),
                      borderWidth: 2,
                      transform: 'translateY(-3px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Client Portal
                </Button>
              </Stack>
            ) : (
              <Stack spacing={3} alignItems="center">
                <Typography variant="h6" sx={{ opacity: 0.95 }}>
                  Welcome back, {user?.first_name || user?.email}! 🌿
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={3}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleBookNow}
                    endIcon={<ArrowForward />}
                    sx={{
                      backgroundColor: 'white',
                      color: theme.palette.primary.main,
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.9),
                        transform: 'translateY(-3px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Book Your Event
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => window.location.href = '/dashboard'}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderWidth: 2,
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: alpha('#fff', 0.15),
                        borderWidth: 2,
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Venues Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100vw' }}>
        <Box sx={{ width: '100%' }}>
          <Stack spacing={6}>
            <Stack spacing={3} textAlign="center">
              <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Our Beautiful Venues
              </Typography>
              <Typography variant="h6" color="text.secondary">
                From intimate ceremonies to grand celebrations, we have the perfect space for your special occasion
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                flexWrap: 'wrap',
                gap: 3,
                maxWidth: 1400,
                mx: 'auto',
              }}
            >
              {venues.map((venue, index) => (
                <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.shadows[12],
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Stack spacing={3} alignItems="center">
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          }}
                        >
                          {venue.icon}
                        </Box>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                            {venue.title}
                          </Typography>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500, mb: 2 }}>
                            {venue.capacity}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                            {venue.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Services Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'primary.main', color: 'white', width: '100vw' }}>
        <Box sx={{ width: '100%' }}>
          <Stack spacing={6}>
            <Stack spacing={3} textAlign="center">
              <Typography variant="h2" sx={{ fontWeight: 600 }}>
                Our Services
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                We provide comprehensive packages for every type of celebration and gathering
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                maxWidth: 1400,
                mx: 'auto',
              }}
            >
              {services.map((service, index) => (
                <Box key={index} sx={{ flex: 1 }}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                      color: 'white',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        backgroundColor: alpha('#fff', 0.15),
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Stack spacing={3} alignItems="center">
                        <Typography variant="h1" sx={{ fontSize: '4rem' }}>
                          {service.image}
                        </Typography>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                            {service.title}
                          </Typography>
                          <Typography variant="body1" sx={{ lineHeight: 1.7, opacity: 0.9 }}>
                            {service.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Contact CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100vw' }}>
        <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
          <Stack spacing={4}>
            <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Ready to Create Memories?
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Contact us today to discuss your event and let us help bring your vision to life at LifePlace Alfonso.
            </Typography>
            
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 4,
                justifyContent: 'center',
                alignItems: 'center',
                my: 4,
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOn color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Alfonso, Cavite
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Phone color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  (02) 123-4567
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Email color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  info@lifeplacealfonso.com
                </Typography>
              </Box>
            </Box>
            
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              justifyContent="center"
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleBookNow}
                sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
              >
                Book Your Event Now
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onNavigateToRegister}
                  sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
                >
                  Create Account
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;