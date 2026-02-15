// frontend/client-portal/src/App.tsx
//
// Auth routes, protected routes, and redirects.
// Public marketing routes have been migrated to individual route modules
// in src/routes/ with per-route meta() exports for SEO.

import React, { Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./contexts/AuthContext";
import { useToastActions } from "./contexts/ToastContext";
import { PublicLayout, ClientLayout } from "./components/layout";
import { ProtectedRoute } from "./components/auth";

// Critical path imports - keep static for performance
import { Login, Register, ForgotPassword, ResetPassword } from "./pages/auth";
import { Dashboard } from "./pages/dashboard";
import AcceptInvitation from "./pages/auth/AcceptInvitation";

// Protected route lazy imports
const Profile = React.lazy(() =>
  import("./pages/profile").then((m) => ({ default: m.Profile })),
);
const FinancialPortal = React.lazy(() =>
  import("./pages/payments").then((m) => ({ default: m.FinancialPortal })),
);
const EventsList = React.lazy(() =>
  import("./pages/events").then((m) => ({ default: m.EventsList })),
);
const EventDetail = React.lazy(() =>
  import("./pages/events").then((m) => ({ default: m.EventDetail })),
);
const DocumentsPage = React.lazy(() =>
  import("./pages/documents/DocumentsPage").then((m) => ({
    default: m.DocumentsPage,
  })),
);
const RecordsPage = React.lazy(() =>
  import("./pages/records/RecordsPage").then((m) => ({
    default: m.RecordsPage,
  })),
);
const ActionCenterPage = React.lazy(() =>
  import("./pages/actions/ActionCenterPage").then((m) => ({
    default: m.ActionCenterPage,
  })),
);
const ContractDetail = React.lazy(() =>
  import("./pages/contracts").then((m) => ({ default: m.ContractDetail })),
);
const SupportPage = React.lazy(() =>
  import("./pages/support").then((m) => ({ default: m.SupportPage })),
);
const NotificationsPage = React.lazy(() =>
  import("./pages/notifications").then((m) => ({
    default: m.NotificationsPage,
  })),
);

// NotFound page (404) lazy import
const NotFound = React.lazy(() =>
  import("./pages/NotFound").then((m) => ({ default: m.NotFound })),
);

// Loading component
const LoadingSpinner: React.FC = () => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
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
const ClientLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <ClientLayout>{children}</ClientLayout>;
};

// Main app router component — exported for use by catchall.tsx
export const AppRouter: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const { showInfo } = useToastActions();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle successful login/register
  const handleAuthSuccess = () => {
    const from =
      (location.state as { from?: { pathname: string } })?.from?.pathname ||
      "/dashboard";
    navigate(from, { replace: true });

    if (from !== "/dashboard") {
      showInfo(
        "Redirected",
        "You have been redirected to your requested page.",
      );
    }
  };

  // Navigation handlers
  const handleNavigateToHome = () => navigate("/");
  const handleNavigateToLogin = () => navigate("/login");
  const handleNavigateToRegister = () => navigate("/register");

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Auth routes - redirect if already authenticated */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <PublicLayout>
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
              <PublicLayout>
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
              <PublicLayout>
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
            <PublicLayout>
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

        {/* Notifications Route */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <ClientLayoutWrapper>
                <NotificationsPage />
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
        <Route path="/messages" element={<Navigate to="/actions" replace />} />
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

        {/* 404 Not Found - Better for SEO than redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};
