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
  EventAvailable,
  LocationOn,
  Star,
  ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';

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
  const { isAuthenticated, user, logout } = useAuth();
  const { showInfo } = useToastActions();
  const theme = useTheme();

  const handleBookNow = () => {
    if (!isAuthenticated) {
      showInfo('Login Required', 'Please log in to book events and experiences.');
      onNavigateToLogin?.();
    } else {
      onNavigateToBooking?.();
    }
  };

  const features = [
    {
      icon: <EventAvailable sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Life-Changing Events',
      description: 'Discover transformative experiences that will reshape your perspective and create lasting memories.',
    },
    {
      icon: <LocationOn sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'Amazing Venues',
      description: 'Experience events at carefully curated venues that enhance every moment of your journey.',
    },
    {
      icon: <Star sx={{ fontSize: 40, color: theme.palette.warning.main }} />,
      title: 'Premium Experiences',
      description: 'Join exclusive events designed to inspire, connect, and transform your life.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Stack spacing={4} alignItems="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontWeight: 700,
                maxWidth: 800,
                lineHeight: 1.1,
              }}
            >
              Transform Your Life with
              <Box component="span" sx={{ display: 'block', color: alpha('#fff', 0.9) }}>
                Extraordinary Experiences
              </Box>
            </Typography>

            <Typography
              variant="h5"
              sx={{
                maxWidth: 600,
                opacity: 0.9,
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Discover life-changing events, connect with like-minded people, and embark on
              journeys that will reshape your perspective forever.
            </Typography>

            {!isAuthenticated ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
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
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.9),
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Book Now
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
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: alpha('#fff', 0.1),
                      borderWidth: 2,
                    },
                  }}
                >
                  Sign In
                </Button>
              </Stack>
            ) : (
              <Stack spacing={3} alignItems="center">
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Welcome back, {user?.first_name || user?.email}! 🎉
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
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
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.9),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Book Now
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      logout();
                      showInfo('Logged Out', 'You have been successfully logged out.');
                    }}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderWidth: 2,
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: alpha('#fff', 0.1),
                        borderWidth: 2,
                      },
                    }}
                  >
                    Log Out
                  </Button>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack spacing={6}>
            <Stack spacing={2} textAlign="center">
              <Typography variant="h2" sx={{ fontWeight: 600 }}>
                Why Choose LifePlace?
              </Typography>
    
            </Stack>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                mt: 6,
              }}
            >
              {features.map((feature, index) => (
                <Box key={index} sx={{ flex: 1 }}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={2} alignItems="center">
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          {feature.description}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* CTA Section */}
      {!isAuthenticated && (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            py: { xs: 6, md: 8 },
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Box
            sx={{
              maxWidth: 800,
              mx: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Stack spacing={4}>
              <Typography variant="h3" sx={{ fontWeight: 600 }}>
                Ready to Begin Your Journey?
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 500 }}>
                Join thousands of others who have discovered life-changing experiences through
                LifePlace.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={onNavigateToRegister}
                  sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
                >
                  Create Account
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onNavigateToLogin}
                  sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
                >
                  Sign In
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: theme.palette.grey[900],
          color: 'white',
          py: 4,
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              LifePlace
            </Typography>
            <Typography variant="body2" color="text.secondary">
              © 2025 LifePlace. Transforming lives through extraordinary experiences.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;