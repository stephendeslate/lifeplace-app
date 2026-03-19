// frontend/client-portal/src/components/search/GlobalSearch/SearchEmptyState.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha } from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface SearchEmptyStateProps {
  recentSearches: string[];
  onRecentSearchClick: (searchTerm: string) => void;
  onNavigate: (path: string) => void;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  recentSearches,
  onRecentSearchClick,
  onNavigate,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Recent Searches */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Recent Searches
          </Typography>
        </Box>
        <Stack spacing={1}>
          {recentSearches.map((search, index) => (
            <AnimatedElement key={search} animation="slideRight" delay={index * 100}>
              <Button
                variant="text"
                startIcon={<SearchIcon fontSize="small" />}
                onClick={() => onRecentSearchClick(search)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.secondary',
                  backgroundColor: alpha('#fff', 0.05),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.1),
                    color: 'text.primary',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {search}
              </Button>
            </AnimatedElement>
          ))}
        </Stack>
      </Box>

      {/* Quick Actions */}
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
          Quick Actions
        </Typography>
        <Stack spacing={1}>
          <Button
            variant="text"
            startIcon={<EventIcon fontSize="small" />}
            onClick={() => onNavigate('/events')}
            sx={{
              justifyContent: 'flex-start',
              backgroundColor: alpha('#fff', 0.05),
              '&:hover': {
                backgroundColor: alpha('#fff', 0.1),
              },
            }}
          >
            View My Events
          </Button>
          <Button
            variant="text"
            startIcon={<PaymentIcon fontSize="small" />}
            onClick={() => onNavigate('/payments')}
            sx={{
              justifyContent: 'flex-start',
              backgroundColor: alpha('#fff', 0.05),
              '&:hover': {
                backgroundColor: alpha('#fff', 0.1),
              },
            }}
          >
            Check Payments
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};
