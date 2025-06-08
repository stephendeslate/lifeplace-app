// frontend/admin-crm/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth';
import { AcceptInvitation } from './pages/auth/AcceptInvitation';
import { Dashboard } from './pages/dashboard';
import { AppLayout } from './components/layout';

// Settings imports
import { SettingsLayout } from './pages/settings';
import { Settings } from './pages/settings';
import { AccountSettings, AdminUsers } from './pages/settings/account';
import { BookingFlow, EventTypes } from './pages/settings/booking';
import { ContractTemplates, QuestionnaireTemplates, WorkflowTemplates } from './pages/settings/templates';
import { CommunicationTemplates, CommunicationRecords, CommunicationNotifications } from './pages/settings/communication';
import { ProductsPackages, Payments, Sales } from './pages/settings/commerce';

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

      {/* Booking Configuration */}
      <Route
        path="/settings/booking/booking-flow"
        element={
          <SettingsRoute>
            <BookingFlow />
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

      {/* Communication */}
      <Route
        path="/settings/communication/templates"
        element={
          <SettingsRoute>
            <CommunicationTemplates />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/communication/records"
        element={
          <SettingsRoute>
            <CommunicationRecords />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/communication/notifications"
        element={
          <SettingsRoute>
            <CommunicationNotifications />
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

      {/* Existing Placeholder Protected Routes */}
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