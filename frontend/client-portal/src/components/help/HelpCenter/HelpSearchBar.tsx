import React from 'react';
import { Box, Typography, TextField, InputAdornment, alpha } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface HelpSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const HelpSearchBar: React.FC<HelpSearchBarProps> = ({ searchQuery, onSearchChange }) => (
  <AnimatedElement animation="slideDown" delay={100}>
    <Box sx={{ mb: 4, textAlign: 'center' }}>
      <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
        Help Center
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
        Find answers to your questions, browse guides, and get the most out of LifePlace
      </Typography>

      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          p: 1,
          maxWidth: 600,
          mx: 'auto',
          backgroundColor: alpha('#fff', 0.1),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.2)}`,
        }}
      >
        <TextField
          fullWidth
          placeholder="Search for help articles, FAQs, or tutorials..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: alpha('#fff', 0.7) }} />
              </InputAdornment>
            ),
            sx: {
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiInputBase-input::placeholder': {
                color: alpha('#fff', 0.6),
              },
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: 'transparent',
            },
          }}
        />
      </GlassCard>
    </Box>
  </AnimatedElement>
);
