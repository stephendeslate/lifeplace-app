// frontend/admin-crm/src/App.tsx

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout';
import { WalkthroughProvider } from './contexts/walkthrough';

// Critical path - keep static imports
import { Login, AcceptInvitation, ForgotPassword, ResetPassword } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { NotFound } from './pages/NotFound';

// Route-level code splitting with React.lazy
const ClientsOverview = React.lazy(() =>
  import('./pages/clients').then((m) => ({ default: m.ClientsOverview })),
);
const ClientProfile = React.lazy(() =>
  import('./pages/clients').then((m) => ({ default: m.ClientProfile })),
);
const NewClient = React.lazy(() =>
  import('./pages/clients').then((m) => ({ default: m.NewClient })),
);
const EventsOverview = React.lazy(() =>
  import('./pages/events').then((m) => ({ default: m.EventsOverview })),
);
const EventProfile = React.lazy(() =>
  import('./pages/events').then((m) => ({ default: m.EventProfile })),
);
const EventsCalendar = React.lazy(() =>
  import('./pages/events').then((m) => ({ default: m.EventsCalendar })),
);
const NewEvent = React.lazy(() => import('./pages/events').then((m) => ({ default: m.NewEvent })));
const ContractEdit = React.lazy(() =>
  import('./pages/contracts').then((m) => ({ default: m.ContractEdit })),
);
const ContractView = React.lazy(() =>
  import('./pages/contracts').then((m) => ({ default: m.ContractView })),
);
const ContractSign = React.lazy(() =>
  import('./pages/contracts').then((m) => ({ default: m.ContractSign })),
);
const TasksPage = React.lazy(() => import('./pages/tasks').then((m) => ({ default: m.TasksPage })));
const CommunicationRecords = React.lazy(() =>
  import('./pages/records').then((m) => ({ default: m.CommunicationRecords })),
);
const NotificationsPage = React.lazy(() =>
  import('./pages/notifications').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const AnalyticsDashboard = React.lazy(() =>
  import('./pages/analytics').then((m) => ({ default: m.AnalyticsDashboard })),
);
const MetricsDashboard = React.lazy(() =>
  import('./pages/metrics').then((m) => ({ default: m.MetricsDashboard })),
);
const PaymentsOverview = React.lazy(() =>
  import('./pages/payments').then((m) => ({ default: m.PaymentsOverview })),
);
const PaymentProfile = React.lazy(() =>
  import('./pages/payments').then((m) => ({ default: m.PaymentProfile })),
);
const NewPayment = React.lazy(() =>
  import('./pages/payments').then((m) => ({ default: m.NewPayment })),
);
const SupportPage = React.lazy(() =>
  import('./pages/support').then((m) => ({ default: m.SupportPage })),
);
const SupportDetailPage = React.lazy(() =>
  import('./pages/support').then((m) => ({ default: m.SupportDetailPage })),
);
const EnhancedSettingsLayout = React.lazy(() =>
  import('./pages/settings/EnhancedSettingsLayout').then((m) => ({
    default: m.EnhancedSettingsLayout,
  })),
);
const EnhancedSettings = React.lazy(() =>
  import('./pages/settings/EnhancedSettings').then((m) => ({
    default: m.EnhancedSettings,
  })),
);
const AccountSettings = React.lazy(() =>
  import('./pages/settings/account').then((m) => ({
    default: m.AccountSettings,
  })),
);
const AdminUsers = React.lazy(() =>
  import('./pages/settings/account').then((m) => ({ default: m.AdminUsers })),
);
const CompanySettings = React.lazy(() =>
  import('./pages/settings/account').then((m) => ({
    default: m.CompanySettings,
  })),
);
const GuidedTours = React.lazy(() =>
  import('./pages/settings/account').then((m) => ({ default: m.GuidedTours })),
);
const PushDevices = React.lazy(() =>
  import('./pages/settings/account').then((m) => ({ default: m.PushDevices })),
);
const Notifications = React.lazy(() =>
  import('./pages/settings/account/Notifications').then((m) => ({
    default: m.Notifications,
  })),
);
const BookingFlows = React.lazy(() =>
  import('./pages/settings/booking').then((m) => ({ default: m.BookingFlows })),
);
const BookingFlowDetails = React.lazy(() =>
  import('./pages/settings/booking').then((m) => ({
    default: m.BookingFlowDetails,
  })),
);
const EventTypes = React.lazy(() =>
  import('./pages/settings/booking').then((m) => ({ default: m.EventTypes })),
);
const BookingFlowPreviewPage = React.lazy(() =>
  import('./pages/settings/booking').then((m) => ({
    default: m.BookingFlowPreviewPage,
  })),
);
const ContractTemplates = React.lazy(() =>
  import('./pages/settings/templates').then((m) => ({
    default: m.ContractTemplates,
  })),
);
const QuestionnaireTemplates = React.lazy(() =>
  import('./pages/settings/templates').then((m) => ({
    default: m.QuestionnaireTemplates,
  })),
);
const WorkflowTemplates = React.lazy(() =>
  import('./pages/settings/templates').then((m) => ({
    default: m.WorkflowTemplates,
  })),
);
const WorkflowTemplateDetails = React.lazy(() =>
  import('./pages/settings/templates').then((m) => ({
    default: m.WorkflowTemplateDetails,
  })),
);
const WorkflowWebhooks = React.lazy(() =>
  import('./pages/settings/templates').then((m) => ({
    default: m.WorkflowWebhooks,
  })),
);
const CommunicationTemplates = React.lazy(() =>
  import('./pages/settings/templates/CommunicationTemplates').then((m) => ({
    default: m.CommunicationTemplates,
  })),
);
const EmailLayouts = React.lazy(() =>
  import('./pages/settings/templates/EmailLayouts').then((m) => ({
    default: m.EmailLayouts,
  })),
);
const NotificationTypes = React.lazy(() =>
  import('./pages/settings/templates/NotificationTypes').then((m) => ({
    default: m.NotificationTypes,
  })),
);
const ProductsPackages = React.lazy(() =>
  import('./pages/settings/commerce').then((m) => ({
    default: m.ProductsPackages,
  })),
);
const Payments = React.lazy(() =>
  import('./pages/settings/commerce').then((m) => ({ default: m.Payments })),
);
const Sales = React.lazy(() =>
  import('./pages/settings/commerce').then((m) => ({ default: m.Sales })),
);
const CurrencyTaxes = React.lazy(() =>
  import('./pages/settings/commerce/CurrencyTaxes').then((m) => ({
    default: m.CurrencyTaxes,
  })),
);
const VIPProgram = React.lazy(() =>
  import('./pages/settings/vip/VIPProgram').then((m) => ({
    default: m.VIPProgram,
  })),
);
const Gallery = React.lazy(() =>
  import('./pages/settings/content').then((m) => ({ default: m.Gallery })),
);
const LegalDocumentsPage = React.lazy(() =>
  import('./pages/settings/legal').then((m) => ({
    default: m.LegalDocumentsPage,
  })),
);
const HelpLayout = React.lazy(() =>
  import('./pages/help').then((m) => ({ default: m.HelpLayout })),
);
const HelpHome = React.lazy(() => import('./pages/help').then((m) => ({ default: m.HelpHome })));
const HelpCollection = React.lazy(() =>
  import('./pages/help').then((m) => ({ default: m.HelpCollection })),
);
const HelpArticle = React.lazy(() =>
  import('./pages/help').then((m) => ({ default: m.HelpArticle })),
);
const HelpSearchResults = React.lazy(() =>
  import('./pages/help').then((m) => ({ default: m.HelpSearchResults })),
);

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

  return isAuthenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
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
      <EnhancedSettingsLayout>{children}</EnhancedSettingsLayout>
    </AppLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

// Suspense fallback for lazy-loaded routes
const PageLoader = () => (
  <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

// Main App Router Component
const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/reset-password/:tokenId" element={<ResetPassword />} />

        {/* Accept Invitation Route - Always accessible, no auth required */}
        <Route path="/accept-invitation/:invitationId" element={<AcceptInvitation />} />

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

        {/* Metrics Dashboard - Platform Impact, System Health, DORA */}
        <Route
          path="/metrics"
          element={
            <ProtectedRoute>
              <MetricsDashboard />
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
        <Route
          path="/settings/account/guided-tours"
          element={
            <SettingsRoute>
              <GuidedTours />
            </SettingsRoute>
          }
        />
        <Route
          path="/settings/account/push-devices"
          element={
            <SettingsRoute>
              <PushDevices />
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

        {/* Content */}
        <Route
          path="/settings/content/gallery"
          element={
            <SettingsRoute>
              <Gallery />
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
        <Route
          path="/settings/templates/notification-types"
          element={
            <SettingsRoute>
              <NotificationTypes />
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

        {/* Help Center Routes */}
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HelpHome />} />
          <Route path="search" element={<HelpSearchResults />} />
          <Route path=":collection" element={<HelpCollection />} />
          <Route path=":collection/:article" element={<HelpArticle />} />
        </Route>

        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support/:id"
          element={
            <ProtectedRoute>
              <SupportDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 Not Found - Better for SEO than redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <AppProviders>
      <ErrorBoundary>
        <Router>
          <WalkthroughProvider>
            <AppRouter />
          </WalkthroughProvider>
        </Router>
      </ErrorBoundary>
    </AppProviders>
  );
};

export default App;
