// Integration Example: How to use the new LifePlace Design System
// This file demonstrates proper integration patterns for both applications

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Typography, Stack, Box } from '@mui/material';
import {
  // Design system imports
  createAdminTheme,
  createClientTheme,
  GlassCard,
  InteractiveGlassCard,
  ColoredGlassCard,
  AccessibleButton,
  PrimaryButton,
  SecondaryButton,
  designTokens,
  injectDesignTokens,
  mediaQuery,
  createContainer,
  flex,
} from '../index';

// Initialize design tokens as CSS variables
injectDesignTokens();

// Admin Application Example
export const AdminExample: React.FC = () => {
  const [darkMode, setDarkMode] = React.useState(false);
  const theme = createAdminTheme(darkMode ? 'dark' : 'light');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h1" gutterBottom>
          Admin Dashboard - Professional Interface
        </Typography>

        {/* Professional Data Cards */}
        <Stack spacing={3} sx={{ mb: 4 }}>
          <GlassCard intensity="subtle" sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Analytics Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Professional glassmorphism with subtle intensity for data focus
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <PrimaryButton size="small">View Details</PrimaryButton>
              <SecondaryButton size="small">Export Data</SecondaryButton>
            </Stack>
          </GlassCard>

          <InteractiveGlassCard intensity="medium">
            <Box sx={flex.between}>
              <Typography variant="h6">Interactive Card with Hover Effects</Typography>
              <AccessibleButton
                color="primary"
                glass
                keyboardShortcut="Ctrl+E"
                description="Edit this dashboard section"
              >
                Edit
              </AccessibleButton>
            </Box>
          </InteractiveGlassCard>
        </Stack>

        {/* Theme Toggle */}
        <GlassCard>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Current Theme: {darkMode ? 'Dark' : 'Light'}</Typography>
            <AccessibleButton onClick={() => setDarkMode(!darkMode)} variant="outlined">
              Toggle Theme
            </AccessibleButton>
          </Stack>
        </GlassCard>
      </Container>
    </ThemeProvider>
  );
};

// Client Portal Example
export const ClientExample: React.FC = () => {
  const [darkMode, setDarkMode] = React.useState(false);
  const theme = createClientTheme(darkMode ? 'dark' : 'light');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h1" gutterBottom sx={{ textAlign: 'center' }}>
          Welcome to Your Event Portal
        </Typography>

        {/* Nature-inspired welcome section */}
        <ColoredGlassCard
          color="primary"
          intensity="medium"
          sx={{
            mb: 4,
            textAlign: 'center',
            background:
              'linear-gradient(135deg, rgba(45, 80, 22, 0.1) 0%, rgba(90, 124, 71, 0.05) 100%)',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Plan Your Perfect Event
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Experience the beauty of nature-inspired event planning with our organic design
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center">
            <PrimaryButton size="large" rounded>
              Start Planning
            </PrimaryButton>
            <SecondaryButton size="large" rounded>
              View Gallery
            </SecondaryButton>
          </Stack>
        </ColoredGlassCard>

        {/* Feature cards with organic feel */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 3,
            mb: 4,
          }}
        >
          <InteractiveGlassCard elevated>
            <Typography variant="h6" gutterBottom>
              Venue Selection
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Choose from our curated collection of stunning venues
            </Typography>
            <AccessibleButton
              color="success"
              fullWidth
              description="Browse available venues for your event"
            >
              Browse Venues
            </AccessibleButton>
          </InteractiveGlassCard>

          <InteractiveGlassCard elevated>
            <Typography variant="h6" gutterBottom>
              Catering Options
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Discover delicious catering options for every taste
            </Typography>
            <AccessibleButton
              color="warning"
              fullWidth
              description="View catering menu and options"
            >
              View Menu
            </AccessibleButton>
          </InteractiveGlassCard>
        </Box>

        {/* Booking progress with organic styling */}
        <GlassCard intensity="strong">
          <Typography variant="h5" gutterBottom>
            Your Booking Progress
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              [mediaQuery.down('sm')]: {
                flexDirection: 'column',
              },
            }}
          >
            <Typography variant="body1" sx={{ flex: 1 }}>
              You're 60% complete with your event planning
            </Typography>
            <AccessibleButton color="primary" loading={false} loadingText="Saving progress...">
              Continue Planning
            </AccessibleButton>
          </Box>
        </GlassCard>

        {/* Theme toggle */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <AccessibleButton
            onClick={() => setDarkMode(!darkMode)}
            variant="text"
            description="Switch between light and dark theme modes"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </AccessibleButton>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

// Responsive Design Example
export const ResponsiveExample: React.FC = () => {
  return (
    <Box
      sx={{
        // Using design system responsive utilities
        ...createContainer('xl'),
        py: { xs: 2, sm: 4, lg: 6 }, // Responsive padding
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontSize: {
            xs: designTokens.typography.fontSize['2xl'],
            sm: designTokens.typography.fontSize['3xl'],
            lg: designTokens.typography.fontSize['4xl'],
          },
          textAlign: 'center',
          mb: 4,
        }}
      >
        Responsive Design System
      </Typography>

      {/* Responsive grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: designTokens.spacing.space[4],
        }}
      >
        {[1, 2, 3].map((item) => (
          <GlassCard key={item} intensity="medium">
            <Typography variant="h6">Card {item}</Typography>
            <Typography variant="body2">Responsive card that adapts to screen size</Typography>
          </GlassCard>
        ))}
      </Box>
    </Box>
  );
};

// Performance Optimized Example
export const PerformanceExample: React.FC = () => {
  // Memoize theme creation
  const theme = React.useMemo(() => createAdminTheme('light'), []);

  // Stable component references
  const handleClick = React.useCallback(() => {
    console.log('Optimized click handler');
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GlassCard>
        <Typography variant="h6">Performance Optimized</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This example shows performance best practices
        </Typography>

        <AccessibleButton onClick={handleClick} color="primary">
          Optimized Button
        </AccessibleButton>
      </GlassCard>
    </ThemeProvider>
  );
};

// Accessibility Example
export const AccessibilityExample: React.FC = () => {
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <GlassCard>
      <Typography variant="h5" gutterBottom>
        Accessibility Features
      </Typography>

      <Stack spacing={2}>
        <AccessibleButton
          color="primary"
          loading={loading}
          loadingText="Processing your request..."
          description="Submit the form with enhanced accessibility features"
          keyboardShortcut="Ctrl+Enter"
          onClick={handleSubmit}
        >
          Submit Form
        </AccessibleButton>

        <AccessibleButton
          color="secondary"
          variant="outlined"
          description="Cancel the current operation"
          keyboardShortcut="Escape"
        >
          Cancel
        </AccessibleButton>

        <Typography variant="caption" color="text.secondary">
          These buttons include enhanced accessibility features: keyboard shortcuts, screen reader
          support, and loading states.
        </Typography>
      </Stack>
    </GlassCard>
  );
};

export default {
  AdminExample,
  ClientExample,
  ResponsiveExample,
  PerformanceExample,
  AccessibilityExample,
};
