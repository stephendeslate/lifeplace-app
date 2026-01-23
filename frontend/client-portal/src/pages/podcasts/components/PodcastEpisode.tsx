// pages/podcasts/components/PodcastEpisode.tsx
// Modern Organic Luxury redesign using design system tokens

import React, { useState } from 'react';
import { Box, Typography, Stack, Dialog, IconButton } from '@mui/material';
import { PlayCircle, AccessTime, Person, Close } from '@mui/icons-material';
import { ModernCard } from '../../../design-system/components/ModernCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { Button } from '../../../design-system';
import { tokens } from '../../../design-system/tokens';
import type { PodcastEpisodeCardProps } from '../types/podcasts.types';

// Extract YouTube video ID from embed URL
const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(/youtube\.com\/embed\/([^?&]+)/);
  return match ? match[1] : null;
};

// Get YouTube thumbnail URL from video ID
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

export const PodcastEpisodeCard: React.FC<PodcastEpisodeCardProps> = ({ episode, index = 0 }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const videoId = episode.videoUrl ? getYouTubeVideoId(episode.videoUrl) : null;
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : episode.thumbnailUrl;

  const handleOpenModal = () => {
    if (episode.videoUrl) {
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <>
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
          {/* Episode Thumbnail - Click to open modal */}
          <Box
            onClick={handleOpenModal}
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', // 16:9 aspect ratio
              backgroundColor: tokens.color.base.neutral[100],
              borderRadius: tokens.spacing.radius.lg,
              overflow: 'hidden',
              mb: tokens.spacing.space[4],
              cursor: episode.videoUrl ? 'pointer' : 'default',
              '&:hover .play-overlay': {
                opacity: episode.videoUrl ? 1 : 0,
              },
            }}
          >
            {thumbnailUrl ? (
              <>
                <Box
                  component="img"
                  src={thumbnailUrl}
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
                {/* Play overlay */}
                {episode.videoUrl && (
                  <Box
                    className="play-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <PlayCircle
                      sx={{
                        fontSize: 72,
                        color: tokens.color.base.neutral[50],
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      }}
                    />
                  </Box>
                )}
              </>
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

            {/* Watch Button */}
            <Box>
              <Button
                variant="primary"
                size="medium"
                onClick={handleOpenModal}
                startIcon={<PlayCircle />}
                fullWidth
                ariaLabel={`Watch ${episode.title}`}
                disabled={!episode.videoUrl}
              >
                Watch
              </Button>
            </Box>
          </Box>
        </ModernCard>
      </AnimatedElement>

      {/* Video Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth={false}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            margin: { xs: 2, md: 4 },
            width: '100%',
            maxWidth: '1200px',
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
            },
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          {/* Close button */}
          <IconButton
            onClick={handleCloseModal}
            aria-label="Close video"
            sx={{
              position: 'absolute',
              top: -48,
              right: 0,
              color: tokens.color.base.neutral[50],
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Close sx={{ fontSize: 32 }} />
          </IconButton>

          {/* Video player */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', // 16:9 aspect ratio
              backgroundColor: tokens.color.base.neutral[900],
              borderRadius: tokens.spacing.radius.lg,
              overflow: 'hidden',
            }}
          >
            {episode.videoUrl && (
              <Box
                component="iframe"
                src={modalOpen ? `${episode.videoUrl}?autoplay=1` : episode.videoUrl}
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
            )}
          </Box>

          {/* Video title */}
          <Typography
            sx={{
              ...tokens.typography.styles.h4,
              color: tokens.color.base.neutral[50],
              mt: tokens.spacing.space[3],
              textAlign: 'center',
            }}
          >
            {episode.title}
          </Typography>
        </Box>
      </Dialog>
    </>
  );
};
