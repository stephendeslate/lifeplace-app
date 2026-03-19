import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Article as GuideIcon,
  Bookmark as BookmarkIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { HelpArticle } from './types';

interface GuidesTabProps {
  articles: HelpArticle[];
}

export const GuidesTab: React.FC<GuidesTabProps> = ({ articles }) => {
  const theme = useTheme();

  if (articles.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No guides found matching your search
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: 3,
      }}
    >
      {articles.map((article, index) => (
        <AnimatedElement key={article.id} animation="slideUp" delay={index * 100}>
          <Card
            sx={{
              backgroundColor: alpha('#fff', 0.05),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#fff', 0.1)}`,
              borderRadius: 3,
              '&:hover': {
                backgroundColor: alpha('#fff', 0.1),
                transform: 'translateY(-4px)',
              },
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Avatar
                  sx={{
                    backgroundColor: alpha(theme.palette.info.main, 0.15),
                    color: 'info.main',
                  }}
                >
                  <GuideIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {article.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {article.content}
                  </Typography>
                </Box>
                <IconButton size="small">
                  <BookmarkIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {article.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: alpha('#fff', 0.05),
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                    }}
                  />
                ))}
              </Box>

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
                    <PersonIcon fontSize="small" />
                    {article.author}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon fontSize="small" />
                    {article.readTime} min read
                  </Box>
                </Box>
                <Box>{article.views} views</Box>
              </Box>
            </CardContent>
          </Card>
        </AnimatedElement>
      ))}
    </Box>
  );
};
