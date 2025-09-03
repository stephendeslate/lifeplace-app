// frontend/client-portal/src/components/loading/LoadingStates.tsx

import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Typography,
  useTheme,
  alpha,
  Fade,
  Grow,
} from '@mui/material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface LoadingStateProps {
  variant?: 'default' | 'glass' | 'minimal';
  size?: 'small' | 'medium' | 'large';
}

// Individual skeleton components
export const SkeletonText: React.FC<LoadingStateProps & { lines?: number }> = ({ 
  variant = 'default',
  lines = 1 
}) => {
  
  const getSkeletonProps = () => {
    const baseProps = {
      animation: 'wave' as const,
      sx: variant === 'glass' ? {
        backgroundColor: alpha('#fff', 0.1),
        '&::after': {
          background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
        }
      } : {}
    };
    
    return baseProps;
  };

  return (
    <Box>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          {...getSkeletonProps()}
          height={24}
          sx={{ 
            mb: index < lines - 1 ? 1 : 0,
            ...getSkeletonProps().sx
          }}
        />
      ))}
    </Box>
  );
};

export const SkeletonAvatar: React.FC<LoadingStateProps> = ({ 
  variant = 'default',
  size = 'medium'
}) => {
  const sizes = { small: 32, medium: 48, large: 64 };
  
  return (
    <Skeleton
      variant="circular"
      width={sizes[size]}
      height={sizes[size]}
      animation="wave"
      sx={variant === 'glass' ? {
        backgroundColor: alpha('#fff', 0.1),
        '&::after': {
          background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
        }
      } : {}}
    />
  );
};

export const SkeletonCard: React.FC<LoadingStateProps> = ({ 
  variant = 'default' 
}) => {
  
  if (variant === 'glass') {
    return (
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          backgroundColor: alpha('#fff', 0.08),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.1)}`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <SkeletonAvatar variant={variant} />
            <Box sx={{ flex: 1 }}>
              <SkeletonText variant={variant} />
              <Box sx={{ mt: 1 }}>
                <Skeleton
                  animation="wave"
                  width="60%"
                  height={16}
                  sx={{
                    backgroundColor: alpha('#fff', 0.08),
                    '&::after': {
                      background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.15)}, transparent)`,
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>
          <SkeletonText variant={variant} lines={3} />
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <Card sx={{ backgroundColor: alpha('#fff', 0.02) }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <SkeletonAvatar variant={variant} />
          <Box sx={{ flex: 1 }}>
            <SkeletonText variant={variant} />
            <Box sx={{ mt: 1 }}>
              <Skeleton
                animation="wave"
                width="60%"
                height={16}
              />
            </Box>
          </Box>
        </Box>
        <SkeletonText variant={variant} lines={3} />
      </CardContent>
    </Card>
  );
};

export const SkeletonChart: React.FC<LoadingStateProps & { height?: number }> = ({ 
  height = 300
}) => {
  
  return (
    <GlassCard
      variant="light"
      intensity="medium"
      sx={{
        p: 3,
        backgroundColor: alpha('#fff', 0.08),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha('#fff', 0.1)}`,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Skeleton animation="wave" width="40%" height={24} sx={{
          backgroundColor: alpha('#fff', 0.1),
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
          }
        }} />
        <Skeleton animation="wave" width="60%" height={16} sx={{ 
          mt: 1,
          backgroundColor: alpha('#fff', 0.08),
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.15)}, transparent)`,
          }
        }} />
      </Box>
      <Box sx={{ 
        height,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 1,
        px: 2,
        pb: 2
      }}>
        {Array.from({ length: 12 }).map((_, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              height: `${Math.random() * 80 + 20}%`,
              backgroundColor: alpha('#fff', 0.1),
              borderRadius: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
                animation: 'skeleton-wave 2s infinite',
                animationDelay: `${index * 0.1}s`,
              },
            }}
          />
        ))}
      </Box>
    </GlassCard>
  );
};

export const SkeletonTable: React.FC<LoadingStateProps & { rows?: number }> = ({ 
  rows = 5
}) => {
  
  return (
    <GlassCard
      variant="light"
      intensity="medium"
      sx={{
        backgroundColor: alpha('#fff', 0.08),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha('#fff', 0.1)}`,
        overflow: 'hidden',
      }}
    >
      {/* Table Header */}
      <Box sx={{ 
        display: 'flex', 
        p: 2, 
        borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
        gap: 2
      }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            animation="wave"
            width="25%"
            height={20}
            sx={{
              backgroundColor: alpha('#fff', 0.1),
              '&::after': {
                background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
              }
            }}
          />
        ))}
      </Box>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ 
          display: 'flex', 
          p: 2, 
          borderBottom: `1px solid ${alpha('#fff', 0.05)}`,
          gap: 2,
          '&:last-child': { borderBottom: 'none' }
        }}>
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              animation="wave"
              width="25%"
              height={16}
              sx={{
                backgroundColor: alpha('#fff', 0.08),
                '&::after': {
                  background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.15)}, transparent)`,
                }
              }}
            />
          ))}
        </Box>
      ))}
    </GlassCard>
  );
};

// Loading spinners with glass morphism
export const GlassSpinner: React.FC<{
  size?: number;
  message?: string;
}> = ({ size = 40, message }) => {
  const theme = useTheme();
  
  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 4,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: size + 20,
              height: size + 20,
              borderRadius: '50%',
              backgroundColor: alpha('#fff', 0.1),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#fff', 0.2)}`,
              animation: 'pulse 2s infinite',
            }}
          />
          <CircularProgress
            size={size}
            thickness={2}
            sx={{
              color: theme.palette.primary.main,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
            }}
          />
        </Box>
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              animation: 'fade-in-out 2s infinite',
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );
};

export const GlassProgressBar: React.FC<{
  progress?: number;
  message?: string;
  showPercentage?: boolean;
}> = ({ progress, message, showPercentage = true }) => {
  const theme = useTheme();
  
  return (
    <Grow in timeout={500}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          p: 3,
          backgroundColor: alpha('#fff', 0.1),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.15)}`,
          textAlign: 'center',
          minWidth: 300,
        }}
      >
        {message && (
          <Typography
            variant="body1"
            sx={{
              mb: 2,
              fontWeight: 500,
              color: 'text.primary',
            }}
          >
            {message}
          </Typography>
        )}
        
        <Box sx={{ position: 'relative', mb: showPercentage ? 1 : 0 }}>
          <LinearProgress
            variant={progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha('#fff', 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: theme.palette.primary.main,
                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
              '& .MuiLinearProgress-bar1Indeterminate': {
                backgroundImage: `linear-gradient(45deg, 
                  ${theme.palette.primary.main} 0%, 
                  ${theme.palette.secondary.main} 50%, 
                  ${theme.palette.primary.main} 100%)`,
                backgroundSize: '40px 40px',
                animation: 'gradient-shift 2s infinite linear, indeterminate1 2s infinite linear',
              },
            }}
          />
        </Box>
        
        {showPercentage && progress !== undefined && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {Math.round(progress)}%
          </Typography>
        )}
      </GlassCard>
    </Grow>
  );
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{
  message?: string;
  progress?: number;
}> = ({ message = 'Loading...', progress }) => {
  
  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: alpha('#000', 0.5),
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {progress !== undefined ? (
          <GlassProgressBar 
            progress={progress} 
            message={message}
            showPercentage={true}
          />
        ) : (
          <GlassSpinner message={message} size={50} />
        )}
      </Box>
    </Fade>
  );
};

// Page loading skeleton layouts
export const DashboardSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Skeleton animation="wave" width="40%" height={40} sx={{ mb: 1 }} />
          <Skeleton animation="wave" width="60%" height={20} />
        </Box>
      </AnimatedElement>

      <AnimatedElement animation="slideUp" delay={200}>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 3,
          mb: 4
        }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} variant="glass" />
          ))}
        </Box>
      </AnimatedElement>

      <AnimatedElement animation="slideUp" delay={300}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          <SkeletonChart height={350} />
          <SkeletonChart height={350} />
        </Box>
      </AnimatedElement>
    </Box>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 8 }) => {
  return (
    <Box sx={{ p: 3 }}>
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton animation="wave" width="30%" height={32} />
          <Skeleton animation="wave" width="20%" height={36} />
        </Box>
      </AnimatedElement>

      <AnimatedElement animation="slideUp" delay={200}>
        <SkeletonTable rows={items} />
      </AnimatedElement>
    </Box>
  );
};

// Add global keyframes for animations
const globalStyles = `
  @keyframes skeleton-wave {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  
  @keyframes fade-in-out {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  
  @keyframes gradient-shift {
    0% { background-position: 0% 0%; }
    100% { background-position: 100% 100%; }
  }
`;

// Inject global styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('loading-states-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'loading-states-styles';
    style.textContent = globalStyles;
    document.head.appendChild(style);
  }
}