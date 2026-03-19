import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { PlayArrow as PlayIcon, Star as StarIcon } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { VideoTutorial } from './types';

interface TutorialsTabProps {
  tutorials: VideoTutorial[];
}

export const TutorialsTab: React.FC<TutorialsTabProps> = ({ tutorials }) => {
  const theme = useTheme();

  if (tutorials.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No tutorials found matching your search
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 3,
      }}
    >
      {tutorials.map((tutorial, index) => (
        <AnimatedElement key={tutorial.id} animation="slideUp" delay={index * 100}>
          <Card
            sx={{
              backgroundColor: alpha('#fff', 0.05),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#fff', 0.1)}`,
              borderRadius: 3,
              overflow: 'hidden',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.1),
                transform: 'translateY(-4px)',
              },
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  height: 180,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <IconButton
                  sx={{
                    backgroundColor: alpha('#fff', 0.9),
                    color: theme.palette.primary.main,
                    '&:hover': { backgroundColor: '#fff' },
                    width: 64,
                    height: 64,
                  }}
                >
                  <PlayIcon sx={{ fontSize: 32 }} />
                </IconButton>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: alpha('#000', 0.7),
                    color: '#fff',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  {tutorial.duration}
                </Box>
              </Box>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {tutorial.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                {tutorial.description}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    {tutorial.rating}
                  </Box>
                  <Box>{tutorial.views} views</Box>
                </Box>
                <Chip
                  label={tutorial.category}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    color: theme.palette.secondary.main,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </AnimatedElement>
      ))}
    </Box>
  );
};
