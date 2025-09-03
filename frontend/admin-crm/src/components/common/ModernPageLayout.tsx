// Modern Page Layout Component
// Reusable layout component with glassmorphic background and consistent structure

import React from 'react';
import {
  Box,
  Container,
} from '@mui/material';
import { tokens } from '../../design-system';

interface ModernPageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  backgroundPattern?: 'default' | 'minimal' | 'vibrant';
  className?: string;
  sx?: object;
  paddingY?: object | number;
}

export const ModernPageLayout: React.FC<ModernPageLayoutProps> = ({
  children,
  maxWidth = 'xl',
  disableGutters = false,
  backgroundPattern = 'default',
  className,
  sx,
  paddingY,
}) => {
  const getBackgroundPattern = () => {
    switch (backgroundPattern) {
      case 'minimal':
        return `
          radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}02 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}02 0%, transparent 50%)
        `;
      case 'vibrant':
        return `
          radial-gradient(circle at 15% 25%, ${tokens.color.primary[500]}08 0%, transparent 50%),
          radial-gradient(circle at 85% 75%, ${tokens.color.success[500]}08 0%, transparent 50%),
          radial-gradient(circle at 50% 10%, ${tokens.color.secondary[500]}06 0%, transparent 50%),
          radial-gradient(circle at 25% 90%, ${tokens.color.warning[500]}04 0%, transparent 50%)
        `;
      default:
        return `
          radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}04 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}04 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, ${tokens.color.secondary[500]}03 0%, transparent 50%)
        `;
    }
  };

  return (
    <Box 
      className={className}
      sx={{ 
        minHeight: '100vh',
        position: 'relative',
        
        // Glassmorphic background pattern
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: getBackgroundPattern(),
          pointerEvents: 'none',
          zIndex: -1,
        },
        
        ...sx,
      }}
    >
      {maxWidth === false ? (
        // Full width layout - no container constraints (for auth pages, etc.)
        <Box
          sx={{ 
            py: paddingY || { xs: 2, sm: 3, md: 4 },
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            ...(disableGutters && { px: 0 }),
          }}
        >
          {children}
        </Box>
      ) : (
        // Standard container layout
        <Container 
          maxWidth={maxWidth} 
          disableGutters={disableGutters}
          sx={{ 
            py: paddingY || { xs: 2, sm: 3, md: 4 },
            px: disableGutters ? 0 : {
              xs: 'clamp(8px, 2vw, 16px)',  // Tighter: 8px to 16px
              sm: 'clamp(12px, 3vw, 24px)', // Tighter: 12px to 24px  
              md: 'clamp(16px, 4vw, 32px)', // Tighter: 16px to 32px
            },
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Container>
      )}
    </Box>
  );
};

// Specialized layout variants for common use cases
export const ModernDashboardLayout: React.FC<Omit<ModernPageLayoutProps, 'backgroundPattern'>> = (props) => (
  <ModernPageLayout {...props} backgroundPattern="default" />
);

export const ModernSettingsLayout: React.FC<Omit<ModernPageLayoutProps, 'backgroundPattern'>> = (props) => (
  <ModernPageLayout 
    {...props} 
    backgroundPattern="minimal" 
    paddingY={{
      xs: 'clamp(4px, 1vw, 8px)',    // Tighter: 4px to 8px  
      sm: 'clamp(6px, 1.5vw, 12px)', // Tighter: 6px to 12px
      md: 'clamp(8px, 2vw, 16px)',   // Tighter: 8px to 16px
    }} 
  />
);

export const ModernOverviewLayout: React.FC<Omit<ModernPageLayoutProps, 'backgroundPattern'>> = (props) => (
  <ModernPageLayout {...props} backgroundPattern="vibrant" />
);