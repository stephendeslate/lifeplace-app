// frontend/admin-crm/src/components/auth/AuthPageLayout.tsx
// Reusable page layout for auth pages
// Replaces 3 identical page layouts

import React from 'react';
import { Box, Container } from '@mui/material';
import { tokens } from '../../design-system';
import { useTheme } from '../../contexts/ThemeContext';

interface AuthPageLayoutProps {
  children: React.ReactNode;
  /** Maximum width of the content container */
  maxWidth?: number;
}

export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  children,
  maxWidth = 400,
}) => {
  const { effectiveMode } = useTheme();
  const isDarkMode = effectiveMode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDarkMode
          ? `linear-gradient(135deg, ${tokens.color.neutral[900]} 0%, ${tokens.color.neutral[950]} 100%)`
          : `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.neutral[50]} 50%, ${tokens.color.secondary[50]} 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth }}>
        {children}
      </Container>
    </Box>
  );
};

export default AuthPageLayout;
