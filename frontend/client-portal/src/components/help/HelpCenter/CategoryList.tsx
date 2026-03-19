import React from 'react';
import { Box, Typography, Avatar, alpha, useTheme, Stack } from '@mui/material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { getCategories } from './data';

export const CategoryList: React.FC = () => {
  const theme = useTheme();
  const categories = getCategories();

  return (
    <AnimatedElement animation="slideUp" delay={200}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={2}>
          {categories.map((category, index) => (
            <AnimatedElement key={category.id} animation="slideUp" delay={200 + index * 50}>
              <GlassCard
                variant="light"
                intensity="subtle"
                hover
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: alpha('#fff', 0.08),
                  backdropFilter: 'blur(15px)',
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  minWidth: 120,
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.15),
                    transform: 'translateY(-4px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Avatar
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  {category.icon}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {category.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {category.count} items
                </Typography>
              </GlassCard>
            </AnimatedElement>
          ))}
        </Stack>
      </Box>
    </AnimatedElement>
  );
};
