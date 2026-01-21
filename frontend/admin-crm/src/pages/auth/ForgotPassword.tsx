// Forgot Password Page
// Public page for requesting password reset

import React from 'react';
import { Box, Typography } from '@mui/material';
import { ForgotPasswordForm } from '../../components/auth';

export const ForgotPassword: React.FC = () => {
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
        {/* Main Card */}
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
          <ForgotPasswordForm />
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
