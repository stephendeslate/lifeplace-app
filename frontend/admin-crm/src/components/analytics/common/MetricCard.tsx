// Modern Glassmorphic Metric Card Component
// Enhanced with modern design system integration

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grow,
  Fade,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { tokens } from '../../../design-system';
import { createGlassEffect, glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  trend,
  color = 'primary',
  icon,
  onClick,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUpIcon fontSize="small" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" />;
      default:
        return <TrendingFlatIcon fontSize="small" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    
    switch (trend.direction) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Grow in timeout={300}>
      <Card 
        elevation={0}
        sx={{ 
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'visible',
          borderRadius: tokens.spacing.radius.xl,
          // Glassmorphic base styling
          ...createGlassEffect({
            opacity: 0.15,
            blur: 20,
            saturation: 1.1,
            borderOpacity: 0.2,
            shadowIntensity: 'light'
          }),
          
          // Enhanced hover effects
          transition: createTransition(['transform', 'box-shadow', 'background'], 'fast'),
          
          '&:hover': onClick ? {
            ...glassPresets.medium,
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: tokens.shadow.glass.floating,
          } : {
            ...glassPresets.light,
            transform: 'translateY(-1px)',
          },
          
          '&:active': onClick ? {
            transform: 'translateY(-2px) scale(0.99)',
          } : {},
          
          // Subtle gradient overlay
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${tokens.color[color][500]}08 0%, ${tokens.color[color][600]}05 100%)`,
            borderRadius: tokens.spacing.radius.xl,
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
        onClick={onClick}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1} minWidth={0}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: tokens.color.neutral[600],
                  fontWeight: 500,
                  letterSpacing: '0.025em',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem'
                }}
                gutterBottom
              >
                {title}
              </Typography>
              
              <Fade in timeout={500}>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${tokens.color[color][600]} 0%, ${tokens.color[color][500]} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    mb: 0.5,
                    lineHeight: 1.2,
                  }}
                >
                  {value}
                </Typography>
              </Fade>
              
              {description && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: tokens.color.neutral[500],
                    fontWeight: 400,
                    mb: trend ? 1 : 0
                  }}
                >
                  {description}
                </Typography>
              )}
              
              {trend && (
                <Fade in timeout={700}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={1} 
                    sx={{
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.lg,
                      px: 1.5,
                      py: 0.5,
                      width: 'fit-content',
                      border: `1px solid ${getTrendColor()}30`,
                    }}
                  >
                    <Box 
                      sx={{ 
                        color: getTrendColor(), 
                        display: 'flex', 
                        alignItems: 'center',
                        fontSize: '0.875rem',
                      }}
                    >
                      {getTrendIcon()}
                      <Typography 
                        variant="caption" 
                        color="inherit"
                        fontWeight="600"
                        sx={{ ml: 0.25 }}
                      >
                        {trend.value > 0 ? '+' : ''}{trend.value}%
                      </Typography>
                    </Box>
                  </Box>
                </Fade>
              )}
            </Box>
            
            {icon && (
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: tokens.spacing.radius.xl,
                  background: `linear-gradient(135deg, ${tokens.color[color][500]}15 0%, ${tokens.color[color][600]}10 100%)`,
                  color: tokens.color[color][600],
                  border: `1px solid ${tokens.color[color][500]}20`,
                  backdropFilter: 'blur(10px)',
                  ml: 2,
                  minWidth: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.5rem',
                  }
                }}
              >
                {icon}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );
};