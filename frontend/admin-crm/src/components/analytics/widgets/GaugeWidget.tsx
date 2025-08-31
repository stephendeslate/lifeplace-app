// Modern Glassmorphic Gauge Widget
// Enhanced with modern design patterns and smooth animations

import React, { useState, useEffect } from 'react';
import { Box, Typography, Fade, Grow } from '@mui/material';
import type { Widget } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

interface GaugeWidgetProps {
  widget: Widget;
  data: { value: number; target?: number; min?: number; max?: number; };
  compact?: boolean;
}

export const GaugeWidget: React.FC<GaugeWidgetProps> = ({ data, compact }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const maxValue = data.max || 1000;
  const actualPercentage = Math.min(100, Math.max(0, (data.value / maxValue) * 100));
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      // Animate the gauge fill
      const steps = 60;
      let currentStep = 0;
      
      const animate = () => {
        currentStep++;
        const progress = currentStep / steps;
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        setAnimatedValue(easedProgress * actualPercentage);
        
        if (currentStep < steps) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [actualPercentage]);

  const getColor = (percentage: number) => {
    if (percentage >= 80) return tokens.color.success[500];
    if (percentage >= 60) return tokens.color.warning[500];
    if (percentage >= 40) return tokens.color.primary[500];
    return tokens.color.error[500];
  };

  const color = getColor(actualPercentage);
  const size = compact ? { width: 140, height: 70, strokeWidth: 6 } : { width: 180, height: 90, strokeWidth: 8 };
  
  return (
    <Grow in={isLoaded} timeout={800}>
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2
      }}>
        <Box
          sx={{
            width: size.width,
            height: size.height,
            position: 'relative',
            mb: 3,
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.full,
            p: 2,
            transition: createTransition(['transform', 'box-shadow'], 'fast'),
            
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: `0 12px 40px ${color}20`,
            }
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 180 90" style={{ overflow: 'visible' }}>
            {/* Background arc */}
            <path
              d="M 30 70 A 60 60 0 0 1 150 70"
              fill="none"
              stroke={tokens.color.neutral[200]}
              strokeWidth={size.strokeWidth}
              strokeLinecap="round"
            />
            {/* Animated progress arc */}
            <path
              d={`M 30 70 A 60 60 0 0 1 ${30 + (120 * animatedValue / 100)} ${70 - Math.sin((animatedValue / 100) * Math.PI) * 60}`}
              fill="none"
              stroke={color}
              strokeWidth={size.strokeWidth}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${color}40)`,
                transition: createTransition(['stroke'], 'normal'),
              }}
            />
            {/* Glow effect */}
            <path
              d={`M 30 70 A 60 60 0 0 1 ${30 + (120 * animatedValue / 100)} ${70 - Math.sin((animatedValue / 100) * Math.PI) * 60}`}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.6}
              style={{
                filter: `blur(3px)`,
              }}
            />
          </svg>
        </Box>
        
        <Fade in={isLoaded} timeout={1200}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant={compact ? "h4" : "h3"} 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1
              }}
            >
              {data.value.toLocaleString()}
            </Typography>
            
            <Box
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.full,
                px: 2,
                py: 0.5,
                border: `1px solid ${color}30`,
                background: `linear-gradient(135deg, ${color}10 0%, transparent 100%)`,
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: tokens.color.neutral[600],
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                {actualPercentage.toFixed(1)}% of target
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Box>
    </Grow>
  );
};