// frontend/client-portal/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProviders } from './providers/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useToastActions } from './contexts/ToastContext';
import { Home } from './pages/home';
import { Login, Register } from './pages/auth';

// Loading component
const LoadingSpinner: React.FC = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading LifePlace Client Portal...
    </Typography>
  </Box>
);

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Main app router component
const AppRouter: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const { showInfo } = useToastActions();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle successful login/register
  const handleAuthSuccess = () => {
    const from = (location.state as any)?.from?.pathname || '/';
    navigate(from, { replace: true });
    
    if (from !== '/') {
      showInfo('Redirected', 'You have been redirected to your requested page.');
    }
  };

  // Navigation handlers
  const handleNavigateToHome = () => navigate('/');
  const handleNavigateToLogin = () => navigate('/login');
  const handleNavigateToRegister = () => navigate('/register');
  const handleNavigateToBooking = () => {
    // Placeholder for events/booking page
    showInfo('Coming Soon', 'Event booking functionality will be available soon!');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Home route */}
      <Route 
        path="/" 
        element={
          <Home
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
            onNavigateToBooking={handleNavigateToBooking}
          />
        } 
      />
      
      {/* Auth routes - redirect if already authenticated */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login
              onNavigateToRegister={handleNavigateToRegister}
              onNavigateToHome={handleNavigateToHome}
              onLoginSuccess={handleAuthSuccess}
            />
          )
        } 
      />
      
      <Route 
        path="/register" 
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToHome={handleNavigateToHome}
              onRegisterSuccess={handleAuthSuccess}
            />
          )
        } 
      />

      {/* Protected routes - placeholder for future implementation */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Box
              sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                <Typography variant="h4" gutterBottom>
                  Profile Page
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Profile management coming soon!
                </Typography>
              </Box>
            </Box>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/events" 
        element={
          <ProtectedRoute>
            <Box
              sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                <Typography variant="h4" gutterBottom>
                  Events
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Event browsing and booking coming soon!
                </Typography>
              </Box>
            </Box>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/bookings" 
        element={
          <ProtectedRoute>
            <Box
              sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                <Typography variant="h4" gutterBottom>
                  My Bookings
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Booking management coming soon!
                </Typography>
              </Box>
            </Box>
          </ProtectedRoute>
        } 
      />

      {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App component
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