// frontend/admin-crm/src/pages/auth/Login.tsx

import React, { useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode, Brightness4 } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { ModernLoginForm } from '../../components/auth/ModernLoginForm';

export const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { mode, effectiveMode, toggleMode } = useTheme();
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

  const getThemeTooltip = () => {
    if (mode === 'light') return 'Switch to Dark Mode';
    if (mode === 'dark') return 'Use System Theme';
    return 'Switch to Light Mode';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'auto',
        p: 0,
        m: 0,
        bgcolor: effectiveMode === 'dark' ? 'background.default' : 'grey.50',
      }}
    >
      {/* Theme Toggle Button */}
      <Tooltip title={getThemeTooltip()} arrow>
        <IconButton
          onClick={toggleMode}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          {mode === 'light' && <DarkMode fontSize="small" />}
          {mode === 'dark' && <Brightness4 fontSize="small" />}
          {mode === 'system' && <LightMode fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 2.5, sm: 3 },
          position: 'relative',
          mx: 'auto',
          py: { xs: 3, sm: 4 },
          px: { xs: 2.5, sm: 3 },
          minWidth: { xs: 300, sm: 360 },
        }}
      >
        {/* Main Login Card */}
        <Box
          sx={{
            width: '100%',
            borderRadius: 2,
            bgcolor: 'background.paper',
            p: { xs: 2.5, sm: 3.5 },
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
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2, sm: 2.5 },
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
