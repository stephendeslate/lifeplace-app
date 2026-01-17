// Modern App Layout with Clean, Flat Design
// Enhanced layout system with simplified visual approach

import React, { useState, useEffect } from 'react';
import { Box, useTheme, Fade, Fab, Tooltip } from '@mui/material';
import { KeyboardArrowUp, Palette } from '@mui/icons-material';
import { ModernHeader } from '../ModernHeader';
import { ContextualContentArea } from '../ContextualContentArea';
import { useLayout } from '../../../contexts/LayoutContext';
import { tokens } from '../../../design-system';
import { createTransition } from '../../../design-system/utils/animations';

interface ModernAppLayoutProps {
  children: React.ReactNode;
  enableScrollEffects?: boolean;
}

export const ModernAppLayout: React.FC<ModernAppLayoutProps> = ({
  children,
  enableScrollEffects = true
}) => {
  const theme = useTheme();

  const {
    headerHeight = 64,
  } = useLayout();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    if (!enableScrollEffects) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowScrollTop(currentScrollY > 300);
      
      // Track scrolling state for performance
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [enableScrollEffects]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Simple Background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: tokens.color.neutral[100],
          zIndex: -3,
        }}
      />

      {/* ModernHeader - duplicate file issue resolved */}
      <ModernHeader />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: `${headerHeight}px`,
          minHeight: `calc(100vh - ${headerHeight}px)`,
          position: 'relative',
          width: '100%',
        }}
      >
        {/* Enhanced Contextual Content Area */}
        <ContextualContentArea>
          {children}
        </ContextualContentArea>
      </Box>

      {/* Scroll to Top FAB */}
      <Fade in={showScrollTop}>
        <Tooltip title="Back to top" placement="left">
          <Fab
            size="small"
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: theme.zIndex.fab,
              background: 'white',
              border: `1px solid ${tokens.color.neutral[200]}`,
              color: tokens.color.primary[600],
              transition: createTransition(['background'], 'fast'),

              '&:hover': {
                background: tokens.color.neutral[50],
              },

              '&:active': {
                background: tokens.color.neutral[100],
              }
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </Tooltip>
      </Fade>

      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'fixed',
            top: headerHeight + 10,
            right: 10,
            zIndex: 9999,
            background: 'white',
            border: `1px solid ${tokens.color.neutral[200]}`,
            borderRadius: tokens.spacing.radius.md,
            px: 1,
            py: 0.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Palette sx={{ fontSize: 12, color: tokens.color.primary[600] }} />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isScrolling
                  ? tokens.color.warning[500]
                  : tokens.color.success[500],
                transition: createTransition('background-color', 'fast'),
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};