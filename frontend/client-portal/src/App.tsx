// frontend/client-portal/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProviders } from './providers/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useToastActions } from './contexts/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PublicLayout, BookingLayout, ClientLayout } from './components/layout';
import { ProtectedRoute } from './components/auth';
import { Home } from './pages/home';
import { Login, Register } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { Messages } from './pages/messages';
import { EventsList, EventDetail } from './pages/events';
import { Profile } from './pages/profile';
import { FinancialPortal } from './pages/payments';
import AcceptInvitation from './pages/auth/AcceptInvitation';
import { BookingComplete, BookingPage } from './pages/booking';

// Import booking components


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

// Layout wrapper for protected routes
const ClientLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <Typography variant="h3" sx={{ fontWeight: 600, mb: 2, color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.9)', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
        {description}
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', textShadow: '0 1px 5px rgba(0,0,0,0.2)' }}>
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
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
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
          <PublicLayout 
            fullHeight
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
          >
            <Home
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToRegister={handleNavigateToRegister}
              onNavigateToBooking={handleNavigateToBooking}
            />
          </PublicLayout>
        } 
      />
      
      {/* Booking Routes - Using BookingLayout with original background */}
      <Route 
        path="/booking" 
        element={
          <BookingLayout
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
          >
            <BookingPage />
          </BookingLayout>
        } 
      />
      
      <Route 
        path="/booking/complete" 
        element={
          <BookingLayout
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
          >
            <BookingComplete />
          </BookingLayout>
        } 
      />
      
      {/* Public placeholder pages */}
      <Route 
        path="/about" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="About Us" 
              description="Learn about our mission to celebrate life's precious moments"
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
        path="/rates" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Rates" 
              description="Transparent pricing for all our services"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/facilities" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Facilities" 
              description="Discover our beautiful venues and amenities"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/partner" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Partner With Us" 
              description="Join our network of trusted event professionals"
            />
          </PublicLayout>
        } 
      />
      
      <Route 
        path="/reviews" 
        element={
          <PublicLayout>
            <PlaceholderPage 
              title="Reviews" 
              description="See what our clients say about their experiences"
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
            <PublicLayout
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToRegister={handleNavigateToRegister}
            >
              <Login
                onNavigateToRegister={handleNavigateToRegister}
                onNavigateToHome={handleNavigateToHome}
                onLoginSuccess={handleAuthSuccess}
              />
            </PublicLayout>
          )
        } 
      />
      
      <Route 
        path="/register" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <PublicLayout
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToRegister={handleNavigateToRegister}
            >
              <Register
                onNavigateToLogin={handleNavigateToLogin}
                onNavigateToHome={handleNavigateToHome}
                onRegisterSuccess={handleAuthSuccess}
              />
            </PublicLayout>
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
            <ClientLayoutWrapper>
              <Dashboard />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/messages" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <Messages />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <Profile />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/payments" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <FinancialPortal />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/events" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <EventsList />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/events/:id" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <EventDetail />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <PlaceholderPage 
                title="Settings" 
                description="Account settings coming soon!"
              />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/help" 
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <PlaceholderPage 
                title="Help & Support" 
                description="Support center coming soon!"
              />
            </ClientLayoutWrapper>
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
      <ErrorBoundary>
        <Router>
          <AppRouter />
        </Router>
      </ErrorBoundary>
    </AppProviders>
  );
};

export default App;