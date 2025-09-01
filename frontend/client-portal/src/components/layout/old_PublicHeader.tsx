// components/layout/PublicHeader.tsx

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  useTheme,
  alpha,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface PublicHeaderProps {
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onNavigateToLogin,
  onNavigateToRegister,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const navigationItems = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/#services' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          LifePlace Alfonso
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <List sx={{ px: 2, py: 1 }}>
        {navigationItems.map((item) => (
          <ListItem
            key={item.label}
            disablePadding
            sx={{
              mb: 1,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <Button
              fullWidth
              onClick={() => handleNavigation(item.path)}
              sx={{
                justifyContent: 'flex-start',
                px: 2,
                py: 1.5,
                color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                fontWeight: location.pathname === item.path ? 600 : 400,
              }}
            >
              {item.label}
            </Button>
          </ListItem>
        ))}
        
        <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          {!isAuthenticated ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  onNavigateToLogin?.();
                  setMobileOpen(false);
                }}
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  onNavigateToRegister?.();
                  setMobileOpen(false);
                }}
              >
                Get Started
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 2, px: 2 }}>
                Welcome, {user?.first_name || user?.email}!
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleNavigation('/dashboard')}
              >
                Dashboard
              </Button>
            </Box>
          )}
        </Box>
      </List>
    </Box>
  );

  return (
    <>
      <AnimatedElement animation="fadeIn" delay={0}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
            color: 'white',
          }}
        >
          <Toolbar sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
            {/* Logo */}
            <Typography
              variant="h6"
              component="div"
              onClick={() => handleNavigation('/')}
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                '&:hover': {
                  opacity: 0.8,
                },
                transition: 'opacity 0.2s',
              }}
            >
              LifePlace Alfonso
            </Typography>

            {/* Desktop Navigation */}
            {!isMobile && (
              <>
                <Box sx={{ display: 'flex', gap: 1, mr: 3 }}>
                  {navigationItems.map((item) => (
                    <Button
                      key={item.label}
                      color="inherit"
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        color: 'white',
                        fontWeight: location.pathname === item.path ? 600 : 400,
                        opacity: location.pathname === item.path ? 1 : 0.8,
                        px: 2,
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.1),
                          opacity: 1,
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>

                {/* Desktop Auth Buttons */}
                {!isAuthenticated ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      color="inherit"
                      variant="outlined"
                      onClick={onNavigateToLogin}
                      sx={{
                        borderColor: alpha('#fff', 0.3),
                        color: 'white',
                        '&:hover': {
                          borderColor: '#fff',
                          backgroundColor: alpha('#fff', 0.1),
                        },
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onNavigateToRegister}
                      sx={{
                        backgroundColor: alpha('#fff', 0.2),
                        color: 'white',
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      Get Started
                    </Button>
                  </Box>
                ) : (
                  <GlassCard variant="light" intensity="subtle" sx={{ px: 2, py: 1 }}>
                    <Button
                      color="inherit"
                      onClick={() => handleNavigation('/dashboard')}
                      sx={{ color: 'white' }}
                    >
                      Dashboard
                    </Button>
                  </GlassCard>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
      </AnimatedElement>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))',
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Spacer for fixed AppBar */}
      <Toolbar />
    </>
  );
};