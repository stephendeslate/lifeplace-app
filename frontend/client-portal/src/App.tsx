// frontend/client-portal/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProviders } from './providers/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useToastActions } from './contexts/ToastContext';
import { PublicLayout, ClientLayout } from './components/layout';
import { Home } from './pages/home';
import { Login, Register } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { Messages } from './pages/messages';
import { Booking, BookingSuccess } from './pages/booking';
import AcceptInvitation from './pages/auth/AcceptInvitation';

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

// Protected Route component for client dashboard
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

  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
};

// Placeholder page component
interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
  <Box
    sx={{
      minHeight: 'calc(100vh - 160px)',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      px: { xs: 2, sm: 3, md: 4 },
    }}
  >
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h3" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
        {title}
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        {description}
      </Typography>
      <Typography variant="body1" color="text.disabled">
        This page is coming soon! We're working hard to bring you the best experience.
      </Typography>
    </Box>
  </Box>
);

// Main app router component
const AppRouter: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const { showInfo } = useToastActions();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle successful login/register
  const handleAuthSuccess = () => {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
    
    if (from !== '/dashboard') {
      showInfo('Redirected', 'You have been redirected to your requested page.');
    }
  };

  // Navigation handlers
  const handleNavigateToHome = () => navigate('/');
  const handleNavigateToLogin = () => navigate('/login');
  const handleNavigateToRegister = () => navigate('/register');
  
  // Updated booking handler - direct navigation to booking flow
  const handleNavigateToBooking = () => {
    navigate('/booking');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public Routes with PublicLayout */}
      <Route 
        path="/" 
        element={
          <PublicLayout fullHeight>
            <Home
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToRegister={handleNavigateToRegister}
              onNavigateToBooking={handleNavigateToBooking}
            />
          </PublicLayout>
        } 
      />
      
      {/* Booking Flow Routes - Public access */}
      <Route 
        path="/booking" 
        element={
          <PublicLayout>
            <Booking 
              maxWidth="lg"
              enableAutoSave={true}
              showBackButton={true}
              onBackNavigation={() => navigate('/')}
            />
          </PublicLayout>
        } 
      />

      <Route 
        path="/booking/:sessionId" 
        element={
          <PublicLayout>
            <Booking 
              maxWidth="lg"
              enableAutoSave={true}
              showBackButton={true}
              onBackNavigation={() => navigate('/')}
            />
          </PublicLayout>
        } 
      />

      <Route 
        path="/booking/success/:sessionId" 
        element={
          <PublicLayout>
            <BookingSuccess 
              maxWidth="md"
              showPrintOption={true}
              showShareOption={false}
              onHomeNavigation={() => navigate('/')}
            />
          </PublicLayout>
        } 
      />
      
      {/* Public placeholder pages */}
      <Route 
        path="/venues" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Our Venues" 
              description="Discover our beautiful ceremony and event spaces"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/services" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Our Services" 
              description="Comprehensive packages for weddings, retreats, team building, and camping"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/gallery" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Gallery" 
              description="See our stunning venues and past events"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/packages" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Event Packages" 
              description="Choose from our carefully curated event packages"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/about" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="About LifePlace" 
              description="Learn about our mission to celebrate life's precious moments"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/contact" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Contact Us" 
              description="Get in touch to discuss your event needs"
            />
          </PublicLayout>
        } 
      />
      
      {/* Auth routes - redirect if already authenticated */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
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
            <Navigate to="/dashboard" replace />
          ) : (
            <Register
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToHome={handleNavigateToHome}
              onRegisterSuccess={handleAuthSuccess}
            />
          )
        } 
      />

      {/* Accept Client Invitation Route - Public but redirects to dashboard after success */}
      <Route 
        path="/accept-invitation/:invitationId" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AcceptInvitation />
          )
        } 
      />

      {/* Protected Client Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/messages" 
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                My Profile
              </Typography>
              <Typography color="text.secondary">
                Profile management coming soon!
              </Typography>
            </Box>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/bookings" 
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                My Bookings
              </Typography>
              <Typography color="text.secondary">
                Booking management coming soon!
              </Typography>
            </Box>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/events" 
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                My Events
              </Typography>
              <Typography color="text.secondary">
                Event management coming soon!
              </Typography>
            </Box>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Notifications
              </Typography>
              <Typography color="text.secondary">
                Notification center coming soon!
              </Typography>
            </Box>
          </ProtectedRoute>
        } 
      />

      {/* Legal pages */}
      <Route 
        path="/privacy" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Privacy Policy" 
              description="Your privacy is important to us"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/terms" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Terms of Service" 
              description="Terms and conditions for using our services"
            />
          </PublicLayout>
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