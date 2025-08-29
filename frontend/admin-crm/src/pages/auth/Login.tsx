// frontend/admin-crm/src/pages/auth/Login.tsx

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ModernPageLayout, ModernGlassCard } from '../../components/common';
import { ModernLoginForm } from '../../components/auth/ModernLoginForm';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

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
    <ModernPageLayout 
      backgroundPattern="vibrant" 
      maxWidth={false}
      disableGutters
      paddingY={0}
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
          // Ensure content stays centered with proper spacing
          mx: 'auto',
          // Add vertical padding to prevent cutoff
          py: { xs: 4, sm: 6 },
          px: { xs: 3, sm: 4 },
          // Prevent horizontal overflow on small screens
          minWidth: { xs: 300, sm: 360 },
        }}
      >
        {/* Main Login Card */}
        <ModernGlassCard 
          size="large" 
          color="primary"
          animation="none"
          borderRadius="xxl"
          sx={{
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            
            // Enhanced glass effect for login card
            ...glassPresets.strong,
            border: `1px solid ${tokens.color.borders.glass}`,
            
            // Subtle gradient overlay
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.secondary[500]}06 50%, ${tokens.color.success[500]}04 100%)`,
              pointerEvents: 'none',
              zIndex: 0,
            },
            
            // Content positioning
            '& > *': {
              position: 'relative',
              zIndex: 1,
            },
          }}
        >
          <ModernLoginForm onSuccess={handleLoginSuccess} />
        </ModernGlassCard>
        
        {/* Support Footer */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 460,
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xl,
            border: `1px solid ${tokens.color.borders.glass}`,
            p: { xs: 2.5, sm: 3 },
            textAlign: 'center',
            position: 'relative',
            
            // Subtle background pattern
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${tokens.color.neutral[500]}02 0%, ${tokens.color.neutral[600]}01 100%)`,
              borderRadius: tokens.spacing.radius.xl,
              pointerEvents: 'none',
            },
            
            '& > *': {
              position: 'relative',
              zIndex: 1,
            },
          }}
        >
          <Typography 
            variant="body2" 
            sx={{
              color: tokens.color.neutral[600],
              fontWeight: 500,
              letterSpacing: '0.025em',
            }}
          >
            Need help? Contact your system administrator
          </Typography>
        </Box>
        
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '-10%',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tokens.color.primary[500]}08 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '20%',
            right: '-5%',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tokens.color.success[500]}06 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      </Box>
    </ModernPageLayout>
  );
};