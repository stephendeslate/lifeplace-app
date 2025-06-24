// frontend/admin-crm/src/App.tsx
// UPDATED: Added calendar route

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth';
import { AcceptInvitation } from './pages/auth/AcceptInvitation';
import { Dashboard } from './pages/dashboard';
import { ClientsOverview, ClientProfile } from './pages/clients';
import { EventsOverview, EventProfile, EventsCalendar } from './pages/events';
import { CommunicationRecords } from './pages/records';
import { AppLayout } from './components/layout';

// Settings imports
import { SettingsLayout } from './pages/settings';
import { Settings } from './pages/settings';
import { AccountSettings, AdminUsers } from './pages/settings/account';
import { BookingFlows, BookingFlowDetails, EventTypes, BookingFlowPreviewPage } from './pages/settings/booking';
import { ContractTemplates, QuestionnaireTemplates, WorkflowTemplates } from './pages/settings/templates';
import { ProductsPackages, Payments, Sales } from './pages/settings/commerce';
import { CommunicationNotifications } from './pages/settings/account/Notifications';
import { CommunicationTemplates } from './pages/settings/templates/CommunicationTemplates';

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

// Settings Route Component
const SettingsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute>
      <SettingsLayout>
        {children}
      </SettingsLayout>
    </ProtectedRoute>
  );
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

      {/* Accept Invitation Route - Always accessible, no auth required */}
      <Route
        path="/accept-invitation/:invitationId"
        element={<AcceptInvitation />}
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

      {/* Event Management Routes */}
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <EventsOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <EventProfile />
          </ProtectedRoute>
        }
      />

      {/* Calendar Route - NEW */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <EventsCalendar />
          </ProtectedRoute>
        }
      />

      {/* Client Management Routes */}
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <ClientsOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute>
            <ClientProfile />
          </ProtectedRoute>
        }
      />

      {/* Records Route */}
      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <CommunicationRecords />
          </ProtectedRoute>
        }
      />

      {/* Settings Routes */}
      <Route
        path="/settings"
        element={
          <SettingsRoute>
            <Settings />
          </SettingsRoute>
        }
      />
      
      {/* Account Management */}
      <Route
        path="/settings/account/account-settings"
        element={
          <SettingsRoute>
            <AccountSettings />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/account/admin-users"
        element={
          <SettingsRoute>
            <AdminUsers />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/account/notifications"
        element={
          <SettingsRoute>
            <CommunicationNotifications />
          </SettingsRoute>
        }
      />

      {/* Booking Configuration */}
      <Route
        path="/settings/booking/booking-flow"
        element={
          <SettingsRoute>
            <BookingFlows />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/booking/booking-flow/:id"
        element={
          <SettingsRoute>
            <BookingFlowDetails />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/booking/booking-flow/preview/:id"
        element={
          <SettingsRoute>
            <BookingFlowPreviewPage />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/booking/event-types"
        element={
          <SettingsRoute>
            <EventTypes />
          </SettingsRoute>
        }
      />

      {/* Template Management */}
      <Route
        path="/settings/templates/contract-templates"
        element={
          <SettingsRoute>
            <ContractTemplates />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/templates/questionnaire-templates"
        element={
          <SettingsRoute>
            <QuestionnaireTemplates />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/templates/workflow-templates"
        element={
          <SettingsRoute>
            <WorkflowTemplates />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/templates/communication-templates"
        element={
          <SettingsRoute>
            <CommunicationTemplates />
          </SettingsRoute>
        }
      />

      {/* Commerce */}
      <Route
        path="/settings/commerce/products-packages"
        element={
          <SettingsRoute>
            <ProductsPackages />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/commerce/payments"
        element={
          <SettingsRoute>
            <Payments />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/commerce/sales"
        element={
          <SettingsRoute>
            <Sales />
          </SettingsRoute>
        }
      />

      {/* Placeholder Protected Routes */}
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
        path="/payments"
        element={
          <ProtectedRoute>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h4">Payments</Typography>
              <Typography color="text.secondary">Coming soon...</Typography>
            </Box>
          </ProtectedRoute>
        }
      />

      {/* Legacy Routes for backward compatibility */}
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