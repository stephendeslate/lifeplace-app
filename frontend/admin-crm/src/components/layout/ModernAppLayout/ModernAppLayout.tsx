// Modern App Layout with Glassmorphism - Bug Fixed
// Enhanced layout system with modern design patterns

import React, { useState, useEffect } from 'react';
import { Box, useTheme, useMediaQuery, Fade, Fab, Tooltip } from '@mui/material';
import { KeyboardArrowUp, Palette } from '@mui/icons-material';
import { ModernHeader } from '../ModernHeader';
import { ContextualContentArea } from '../ContextualContentArea';
import { useLayout } from '../../../contexts/LayoutContext';
import { tokens } from '../../../design-system';
import { createGlassEffect } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

interface ModernAppLayoutProps {
  children: React.ReactNode;
  enableParallax?: boolean;
  enableScrollEffects?: boolean;
}

export const ModernAppLayout: React.FC<ModernAppLayoutProps> = ({ 
  children, 
  enableParallax = true,
  enableScrollEffects = true 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    headerHeight = 64,
  } = useLayout();

  const [scrollY, setScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    if (!enableScrollEffects) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
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

  // Parallax background effect
  const parallaxStyle = enableParallax ? {
    transform: `translateY(${scrollY * 0.1}px)`,
  } : {};

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
      {/* Animated Background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: tokens.color.backgrounds.default,
          zIndex: -3,
          ...parallaxStyle,
        }}
      />

      {/* Subtle animated gradient overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}08 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}08 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, ${tokens.color.secondary[500]}05 0%, transparent 50%)
          `,
          opacity: isScrolling ? 0.3 : 0.6,
          transition: createTransition('opacity', 'slow'),
          zIndex: -2,
          pointerEvents: 'none',
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
              ...createGlassEffect({
                opacity: 0.9,
                blur: 20,
                borderOpacity: 0.3,
                shadowIntensity: 'strong'
              }),
              background: 'rgba(255, 255, 255, 0.9)',
              color: tokens.color.primary[600],
              transition: createTransition(['transform', 'box-shadow'], 'fast'),
              
              '&:hover': {
                transform: 'translateY(-2px) scale(1.05)',
                boxShadow: tokens.shadow.glass.floating,
                background: 'rgba(255, 255, 255, 0.95)',
              },
              
              '&:active': {
                transform: 'translateY(0) scale(0.95)',
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
            ...createGlassEffect({
              opacity: 0.8,
              blur: 10,
              borderOpacity: 0.2,
            }),
            borderRadius: tokens.spacing.radius.lg,
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