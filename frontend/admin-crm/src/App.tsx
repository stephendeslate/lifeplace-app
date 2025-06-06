// frontend/admin-crm/src/App.tsx

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Placeholder for future router implementation
const AppRouter: React.FC = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading LifePlace Admin...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        sx={{ p: 3 }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          LifePlace Admin CRM
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Please log in to access the admin dashboard.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Authentication system is ready. Login page will be implemented next.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
      sx={{ p: 3 }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to LifePlace Admin CRM
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Hello, {user?.first_name || user?.email}!
      </Typography>
      <Typography variant="body1" textAlign="center">
        You are successfully authenticated as an admin user.
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Dashboard and routing will be implemented next.
      </Typography>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <AppProviders>
      <Router>
        <AppRouter />
      </Router>
    </AppProviders>
  );
};

export default App;