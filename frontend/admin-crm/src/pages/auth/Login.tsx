// frontend/admin-crm/src/pages/auth/Login.tsx

import React from 'react';
import { Box, Paper } from '@mui/material';
import { LoginForm } from '../../components/auth/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
        padding: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <LoginForm onSuccess={handleLoginSuccess} />
        
        {/* Footer info */}
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Box
            component="div"
            sx={{
              typography: 'caption',
              color: 'text.secondary',
            }}
          >
            For support, contact your system administrator
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};