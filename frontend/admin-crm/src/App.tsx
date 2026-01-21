// frontend/admin-crm/src/App.tsx
// UPDATED: Added comprehensive analytics routes and error boundary

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Login, AcceptInvitation, ForgotPassword, ResetPassword } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { ClientsOverview, ClientProfile, NewClient } from './pages/clients';
import { EventsOverview, EventProfile, EventsCalendar, NewEvent } from './pages/events';
import { ContractEdit, ContractView, ContractSign } from './pages/contracts';
import { NotFound } from './pages/NotFound';
import { TasksPage } from './pages/tasks';
import { CommunicationRecords } from './pages/records';
import { NotificationsPage } from './pages/notifications';
import { AppLayout } from './components/layout';

// Analytics imports - New simplified dashboard
import { AnalyticsDashboard } from './pages/analytics';

// Enhanced Settings imports
import { EnhancedSettingsLayout } from './pages/settings/EnhancedSettingsLayout';
import { EnhancedSettings } from './pages/settings/EnhancedSettings';
import { AccountSettings, AdminUsers, CompanySettings } from './pages/settings/account';
import { Notifications } from './pages/settings/account/Notifications';
import { BookingFlows, BookingFlowDetails, EventTypes, BookingFlowPreviewPage } from './pages/settings/booking';
import { ContractTemplates, QuestionnaireTemplates, WorkflowTemplates, WorkflowTemplateDetails, WorkflowWebhooks } from './pages/settings/templates';
import { ProductsPackages, Payments, Sales } from './pages/settings/commerce';
import { CurrencyTaxes } from './pages/settings/commerce/CurrencyTaxes';
import { VIPProgram } from './pages/settings/vip/VIPProgram';
import { CommunicationTemplates } from './pages/settings/templates/CommunicationTemplates';
import { EmailLayouts } from './pages/settings/templates/EmailLayouts';
import { LegalDocumentsPage } from './pages/settings/legal';
import { PaymentsOverview, PaymentProfile, NewPayment } from './pages/payments';
import { SupportPage } from './pages/support';
// FunnelAnalytics removed - functionality now in AnalyticsDashboard

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

// Settings Route Component - Uses Enhanced Settings Layout
const SettingsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <EnhancedSettingsLayout>
        {children}
      </EnhancedSettingsLayout>
    </AppLayout>
  ) : (
    <Navigate to="/login" replace />
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

      {/* Password Reset Routes - Public */}
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password/:tokenId"
        element={<ResetPassword />}
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

      {/* Analytics Routes - Simplified single dashboard */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />
      {/* Legacy routes redirect to main analytics */}
      <Route path="/analytics/*" element={<Navigate to="/analytics" replace />} />

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
        path="/events/new"
        element={
          <ProtectedRoute>
            <NewEvent />
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

      {/* Calendar Route */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <EventsCalendar />
          </ProtectedRoute>
        }
      />

      {/* Contract Management Routes */}
      <Route
        path="/contracts/:contractId"
        element={
          <ProtectedRoute>
            <ContractView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:contractId/edit"
        element={
          <ProtectedRoute>
            <ContractEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:contractId/sign"
        element={
          <ProtectedRoute>
            <ContractSign />
          </ProtectedRoute>
        }
      />

      {/* Tasks Route */}
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy quotes route redirects to tasks */}
      <Route path="/quotes" element={<Navigate to="/tasks" replace />} />

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
        path="/clients/new"
        element={
          <ProtectedRoute>
            <NewClient />
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

      {/* Payments Routes */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentsOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments/new"
        element={
          <ProtectedRoute>
            <NewPayment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments/:id"
        element={
          <ProtectedRoute>
            <PaymentProfile />
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

      {/* Notifications Route */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Settings Routes */}
      <Route
        path="/settings"
        element={
          <SettingsRoute>
            <EnhancedSettings />
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
            <Notifications />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/account/company-settings"
        element={
          <SettingsRoute>
            <CompanySettings />
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
        path="/settings/templates/workflow-templates/:id"
        element={
          <SettingsRoute>
            <WorkflowTemplateDetails />
          </SettingsRoute>
        }
      />
      <Route
        path="/settings/templates/workflow-webhooks"
        element={
          <SettingsRoute>
            <WorkflowWebhooks />
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
      <Route
        path="/settings/templates/email-layouts"
        element={
          <SettingsRoute>
            <EmailLayouts />
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
        path="/settings/commerce/currency-taxes"
        element={
          <SettingsRoute>
            <CurrencyTaxes />
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
      <Route
        path="/settings/commerce/vip-loyalty"
        element={
          <SettingsRoute>
            <VIPProgram />
          </SettingsRoute>
        }
      />

      {/* Legal & Compliance */}
      <Route
        path="/settings/legal/legal-documents"
        element={
          <SettingsRoute>
            <LegalDocumentsPage />
          </SettingsRoute>
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
            <SupportPage />
          </ProtectedRoute>
        }
      />


      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Not Found - Better for SEO than redirect */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

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