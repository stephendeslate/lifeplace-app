// frontend/admin-crm/src/pages/auth/Login.tsx

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ModernLoginForm } from '../../components/auth/ModernLoginForm';

export const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLoginSuccess = () => {
    // Navigation will happen automatically via the useEffect above
    // when isAuthenticated becomes true
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        p: 0,
        m: 0,
        bgcolor: 'grey.50',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 460,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 3, sm: 4 },
          position: 'relative',
          mx: 'auto',
          py: { xs: 4, sm: 6 },
          px: { xs: 3, sm: 4 },
          minWidth: { xs: 300, sm: 360 },
        }}
      >
        {/* Main Login Card */}
        <Box
          sx={{
            width: '100%',
            borderRadius: 2,
            bgcolor: 'background.paper',
            p: { xs: 3, sm: 4 },
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <ModernLoginForm onSuccess={handleLoginSuccess} />
        </Box>

        {/* Support Footer */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 460,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2.5, sm: 3 },
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            Need help? Contact your system administrator
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
