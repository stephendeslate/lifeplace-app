// pages/podcasts/components/PodcastEpisode.tsx

import React from 'react';
import { Box, Typography, Stack, IconButton } from '@mui/material';
import { PlayCircle, AccessTime, Person } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { PodcastEpisodeCardProps } from '../types/podcasts.types';

export const PodcastEpisodeCard: React.FC<PodcastEpisodeCardProps> = ({ episode, index = 0 }) => {
  return (
    <AnimatedElement animation="fadeIn" delay={100 + index * 100}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Video Placeholder */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
          }}
        >
          {episode.videoUrl ? (
            <Box
              component="iframe"
              src={episode.videoUrl}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <IconButton
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <PlayCircle sx={{ fontSize: 64 }} />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mt: 1,
                }}
              >
                Video coming soon
              </Typography>
            </Box>
          )}
        </Box>

        {/* Episode Info */}
        <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'white',
              mb: 1,
              lineHeight: 1.3,
            }}
          >
            {episode.title}
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Person sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {episode.hosts.join(', ')}
              </Typography>
            </Stack>

            {episode.duration && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {episode.duration}
                </Typography>
              </Stack>
            )}
          </Stack>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.6,
              flexGrow: 1,
            }}
          >
            {episode.description}
          </Typography>
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};
