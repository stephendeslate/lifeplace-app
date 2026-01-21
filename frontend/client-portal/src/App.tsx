// frontend/client-portal/src/App.tsx

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProviders } from './providers/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useToastActions } from './contexts/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PublicLayout, BookingLayout, ClientLayout } from './components/layout';
import { ProtectedRoute } from './components/auth';

// Critical path imports - keep static for performance
import { Home } from './pages/home';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import AcceptInvitation from './pages/auth/AcceptInvitation';
import { BookingComplete, BookingPage } from './pages/booking';

// Lazy-loaded page components for code splitting
const AboutPage = React.lazy(() => import('./pages/about').then(m => ({ default: m.AboutPage })));
const ServicesPage = React.lazy(() => import('./pages/services').then(m => ({ default: m.ServicesPage })));
const RatesPage = React.lazy(() => import('./pages/rates').then(m => ({ default: m.RatesPage })));
const FacilitiesPage = React.lazy(() => import('./pages/facilities').then(m => ({ default: m.FacilitiesPage })));
const PartnerPage = React.lazy(() => import('./pages/partner').then(m => ({ default: m.PartnerPage })));
const ReviewsPage = React.lazy(() => import('./pages/reviews').then(m => ({ default: m.ReviewsPage })));
const ContactPage = React.lazy(() => import('./pages/contact').then(m => ({ default: m.ContactPage })));
const PodcastsPage = React.lazy(() => import('./pages/podcasts').then(m => ({ default: m.PodcastsPage })));

// Protected route lazy imports
const Profile = React.lazy(() => import('./pages/profile').then(m => ({ default: m.Profile })));
const FinancialPortal = React.lazy(() => import('./pages/payments').then(m => ({ default: m.FinancialPortal })));
const EventsList = React.lazy(() => import('./pages/events').then(m => ({ default: m.EventsList })));
const EventDetail = React.lazy(() => import('./pages/events').then(m => ({ default: m.EventDetail })));
const DocumentsPage = React.lazy(() => import('./pages/documents/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const RecordsPage = React.lazy(() => import('./pages/records/RecordsPage').then(m => ({ default: m.RecordsPage })));
const ActionCenterPage = React.lazy(() => import('./pages/actions/ActionCenterPage').then(m => ({ default: m.ActionCenterPage })));
const ContractDetail = React.lazy(() => import('./pages/contracts').then(m => ({ default: m.ContractDetail })));
const SupportPage = React.lazy(() => import('./pages/support').then(m => ({ default: m.SupportPage })));

// Legal pages lazy imports
const TermsPage = React.lazy(() => import('./pages/legal').then(m => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import('./pages/legal').then(m => ({ default: m.PrivacyPage })));

// NotFound page (404) lazy import
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

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
    <Suspense fallback={<LoadingSpinner />}>
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
      
      {/* Public About page */}
      <Route
        path="/about"
        element={
          <PublicLayout fullHeight>
            <AboutPage onNavigateToBooking={handleNavigateToBooking} />
          </PublicLayout>
        }
      />
      
      <Route
        path="/services"
        element={
          <PublicLayout fullHeight>
            <ServicesPage onNavigateToBooking={handleNavigateToBooking} />
          </PublicLayout>
        }
      />
      
      <Route
        path="/rates"
        element={
          <PublicLayout fullHeight>
            <RatesPage onNavigateToBooking={handleNavigateToBooking} />
          </PublicLayout>
        }
      />
      
      <Route
        path="/facilities"
        element={
          <PublicLayout fullHeight>
            <FacilitiesPage onNavigateToBooking={handleNavigateToBooking} />
          </PublicLayout>
        }
      />
      
      <Route
        path="/partner"
        element={
          <PublicLayout fullHeight>
            <PartnerPage />
          </PublicLayout>
        }
      />
      
      <Route
        path="/reviews"
        element={
          <PublicLayout fullHeight>
            <ReviewsPage onNavigateToBooking={handleNavigateToBooking} />
          </PublicLayout>
        }
      />
      
      <Route
        path="/contact"
        element={
          <PublicLayout fullHeight>
            <ContactPage />
          </PublicLayout>
        }
      />

      <Route
        path="/podcasts"
        element={
          <PublicLayout fullHeight>
            <PodcastsPage />
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

      {/* Password Reset Routes - Public */}
      <Route
        path="/forgot-password"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <PublicLayout
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToRegister={handleNavigateToRegister}
            >
              <ForgotPassword
                onNavigateToLogin={handleNavigateToLogin}
                onNavigateToHome={handleNavigateToHome}
              />
            </PublicLayout>
          )
        }
      />

      <Route
        path="/reset-password/:tokenId"
        element={
          <PublicLayout
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
          >
            <ResetPassword
              onNavigateToLogin={handleNavigateToLogin}
              onNavigateToHome={handleNavigateToHome}
            />
          </PublicLayout>
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
        path="/documents"
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <DocumentsPage />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        }
      />
      {/* Contract detail page */}
      <Route
        path="/contracts/:id"
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <ContractDetail />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        }
      />
      {/* Redirect old contracts list route to documents for backward compatibility */}
      <Route
        path="/contracts"
        element={<Navigate to="/documents" replace />}
      />

      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <RecordsPage />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        }
      />

      {/* Action Center Route */}
      <Route
        path="/actions"
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <ActionCenterPage />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        }
      />
      {/* Redirect old messages route to actions for backward compatibility */}
      <Route
        path="/messages"
        element={<Navigate to="/actions" replace />}
      />
      <Route
        path="/messages/*"
        element={<Navigate to="/actions" replace />}
      />

      {/* Support Route */}
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <ClientLayoutWrapper>
              <SupportPage />
            </ClientLayoutWrapper>
          </ProtectedRoute>
        }
      />
      {/* Redirect /help to /support for backward compatibility */}
      <Route path="/help" element={<Navigate to="/support" replace />} />

      {/* Legal pages */}
      <Route
        path="/privacy"
        element={
          <PublicLayout>
            <PrivacyPage />
          </PublicLayout>
        }
      />

      <Route
        path="/terms"
        element={
          <PublicLayout>
            <TermsPage />
          </PublicLayout>
        }
      />


        {/* 404 Not Found - Better for SEO than redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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