// pages/podcasts/components/PodcastEpisode.tsx
// Modern Organic Luxury redesign using design system tokens

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { PlayCircle, AccessTime, Person } from '@mui/icons-material';
import { ModernCard } from '../../../design-system/components/ModernCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { Button } from '../../../../../shared/design-system/components/Button';
import { tokens } from '../../../design-system/tokens';
import type { PodcastEpisodeCardProps } from '../types/podcasts.types';

export const PodcastEpisodeCard: React.FC<PodcastEpisodeCardProps> = ({ episode, index = 0 }) => {
  const handlePlayClick = () => {
    // TODO: Implement play/listen functionality
    console.log('Play episode:', episode.title);
  };

  return (
    <AnimatedElement animation="slideUp" delay={100 + index * 100}>
      <ModernCard
        variant="elevated"
        size="medium"
        hover
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Episode Artwork/Thumbnail */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio
            backgroundColor: tokens.color.base.neutral[100],
            borderRadius: tokens.spacing.radius.lg,
            overflow: 'hidden',
            mb: tokens.spacing.space[4],
          }}
        >
          {episode.videoUrl ? (
            <Box
              component="iframe"
              src={episode.videoUrl}
              title={episode.title}
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
          ) : episode.thumbnailUrl ? (
            <Box
              component="img"
              src={episode.thumbnailUrl}
              alt={episode.title}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
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
                gap: tokens.spacing.space[2],
                background: `linear-gradient(135deg, ${tokens.color.base.sage[100]} 0%, ${tokens.color.base.sage[500]} 100%)`,
              }}
            >
              <PlayCircle
                sx={{
                  fontSize: 64,
                  color: tokens.color.base.neutral[50],
                  opacity: 0.9,
                }}
              />
              <Typography
                sx={{
                  ...tokens.typography.styles.caption,
                  color: tokens.color.base.neutral[50],
                  opacity: 0.85,
                }}
              >
                Episode coming soon
              </Typography>
            </Box>
          )}
        </Box>

        {/* Episode Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {/* Title */}
          <Typography
            sx={{
              ...tokens.typography.styles.h4,
              fontSize: { xs: tokens.typography.sizes.xl, md: tokens.typography.sizes['2xl'] },
              color: tokens.color.base.neutral[900],
              mb: tokens.spacing.space[2],
            }}
          >
            {episode.title}
          </Typography>

          {/* Metadata */}
          <Stack
            direction="row"
            spacing={tokens.spacing.space[3]}
            alignItems="center"
            sx={{ mb: tokens.spacing.space[3] }}
          >
            <Stack direction="row" spacing={tokens.spacing.space[1]} alignItems="center">
              <Person
                sx={{
                  fontSize: 16,
                  color: tokens.color.base.neutral[600],
                }}
              />
              <Typography
                sx={{
                  ...tokens.typography.styles.bodySmall,
                  color: tokens.color.base.neutral[600],
                }}
              >
                {episode.hosts.join(', ')}
              </Typography>
            </Stack>

            {episode.duration && (
              <Stack direction="row" spacing={tokens.spacing.space[1]} alignItems="center">
                <AccessTime
                  sx={{
                    fontSize: 16,
                    color: tokens.color.base.neutral[600],
                  }}
                />
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodySmall,
                    color: tokens.color.base.neutral[600],
                  }}
                >
                  {episode.duration}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Description */}
          <Typography
            sx={{
              ...tokens.typography.styles.body,
              color: tokens.color.base.neutral[700],
              mb: tokens.spacing.space[4],
              flexGrow: 1,
            }}
          >
            {episode.description}
          </Typography>

          {/* Listen Button */}
          <Box>
            <Button
              variant="primary"
              size="medium"
              onClick={handlePlayClick}
              startIcon={<PlayCircle />}
              fullWidth
              ariaLabel={`Listen to ${episode.title}`}
            >
              Listen
            </Button>
          </Box>
        </Box>
      </ModernCard>
    </AnimatedElement>
  );
};
