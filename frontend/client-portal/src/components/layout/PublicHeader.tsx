// frontend/client-portal/src/components/layout/PublicHeader.tsx

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Phone,
  Email,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import type { NavigationItem } from '../../types/layout.types';

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'venues', label: 'Venues', path: '/venues' },
  { id: 'services', label: 'Services', path: '/services' },
  { id: 'gallery', label: 'Gallery', path: '/gallery' },
  { id: 'packages', label: 'Packages', path: '/packages' },
  { id: 'about', label: 'About', path: '/about' },
  { id: 'contact', label: 'Contact', path: '/contact' },
];

export const PublicHeader: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const { isAuthenticated } = useAuth();
  // @ts-ignore
  const { showInfo } = useToastActions();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // FIXED: Book Now should always lead to booking, regardless of auth status
  const handleBookNow = () => {
    navigate('/booking');
    setMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // FIXED: Consider booking pages as non-home for header styling
  const isHomePage = location.pathname === '/';
  const isBookingPage = location.pathname.startsWith('/booking');

  const headerBackground = isScrolled || !isHomePage
    ? 'rgba(255, 255, 255, 0.95)' 
    : 'rgba(255, 255, 255, 0.1)';

  const textColor = isScrolled || !isHomePage
    ? 'text.primary' 
    : 'white';

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: headerBackground,
          backdropFilter: 'blur(20px)',
          color: textColor,
          transition: 'all 0.3s ease',
          borderBottom: (isScrolled || !isHomePage) ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Left Section: Logo */}
          <Box
            display="flex"
            alignItems="center"
            sx={{ 
              cursor: 'pointer',
              mr: { xs: 2, md: 6 },
            }}
            onClick={() => handleNavigation('/')}
          >
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                color: 'inherit',
                letterSpacing: '-0.02em',
              }}
            >
              LifePlace
            </Typography>
            <Typography
              variant="body2"
              sx={{
                ml: 1,
                opacity: 0.8,
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Alfonso
            </Typography>
          </Box>

          {/* Center Section: Navigation (Desktop) */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: 'inherit',
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                    ...(isActivePath(item.path) && {
                      color: 'primary.main',
                      fontWeight: 600,
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 24,
                        height: 2,
                        backgroundColor: 'primary.main',
                        borderRadius: 1,
                      },
                    }),
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Right Section: Actions */}
          <Box display="flex" alignItems="center" gap={2}>
            {/* Contact Info (Desktop) */}
            {!isMobile && (
              <Box display="flex" alignItems="center" gap={3} mr={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Phone sx={{ fontSize: 16, opacity: 0.7 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    (02) 123-4567
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Email sx={{ fontSize: 16, opacity: 0.7 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    info@lifeplacealfonso.com
                  </Typography>
                </Box>
              </Box>
            )}

            {/* User Actions */}
            <Box display="flex" alignItems="center" gap={1}>
              {/* Show dashboard link for authenticated users */}
              {isAuthenticated && (
                <Button
                  variant="outlined"
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    borderColor: 'currentColor',
                    color: 'inherit',
                    display: { xs: 'none', md: 'flex' },
                    '&:hover': {
                      borderColor: 'currentColor',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  My Dashboard
                </Button>
              )}
              
              {/* Show login link for unauthenticated users on desktop */}
              {!isAuthenticated && !isMobile && (
                <Button
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  Sign In
                </Button>
              )}
              
              {/* Book Now button - always visible and leads to booking */}
              <Button
                variant="contained"
                onClick={handleBookNow}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 3,
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    transform: 'translateY(-1px)',
                  },
                  // Highlight if on booking page
                  ...(isBookingPage && {
                    backgroundColor: 'primary.dark',
                  }),
                }}
              >
                {isBookingPage ? 'Booking...' : 'Book Now'}
              </Button>
            </Box>

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <IconButton
                edge="end"
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: 'inherit', ml: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              LifePlace Alfonso
            </Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Navigation */}
          <List sx={{ flex: 1, px: 1 }}>
            {navigationItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={isActivePath(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: isActivePath(item.path) ? 600 : 500,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            
            {/* Add Book Now to mobile menu for easy access */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleBookNow}
                selected={isBookingPage}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  mb: 0.5,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    color: 'primary.main',
                  },
                }}
              >
                <ListItemText
                  primary={isBookingPage ? 'Booking...' : 'Book Event'}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      color: 'primary.main',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>

          {/* Actions */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {!isAuthenticated ? (
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleNavigation('/login')}
                >
                  Sign In
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => handleNavigation('/register')}
                  sx={{ color: 'text.secondary' }}
                >
                  Create Account
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleNavigation('/dashboard')}
              >
                My Dashboard
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};