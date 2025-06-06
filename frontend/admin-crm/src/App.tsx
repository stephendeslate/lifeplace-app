// frontend/admin-crm/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { AppLayout } from './components/layout';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

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

  return isAuthenticated ? (
    <AppLayout>
      {children}
    </AppLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

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

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

// Main App Router Component
const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Placeholder Protected Routes for Navigation */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Users Management</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/invitations"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Invitations</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Roles & Permissions</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizations"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Organizations</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Settings</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Analytics</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Notifications</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Security</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Integrations</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Support</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
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