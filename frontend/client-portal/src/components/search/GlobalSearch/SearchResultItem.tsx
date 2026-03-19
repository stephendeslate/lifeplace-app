// frontend/client-portal/src/components/search/GlobalSearch/SearchResultItem.tsx

import React from 'react';
import { Box, Typography, Chip, Avatar, useTheme, type Theme, alpha } from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { SearchResult } from './types';

interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  onClick: (result: SearchResult) => void;
}

function getResultIcon(type: string) {
  switch (type) {
    case 'event':
      return <EventIcon fontSize="small" />;
    case 'payment':
      return <PaymentIcon fontSize="small" />;
    case 'invoice':
      return <ReceiptIcon fontSize="small" />;
    case 'contact':
      return <PersonIcon fontSize="small" />;
    case 'page':
      return <TrendingUpIcon fontSize="small" />;
    default:
      return <SearchIcon fontSize="small" />;
  }
}

function getResultColor(type: string, theme: Theme) {
  switch (type) {
    case 'event':
      return theme.palette.primary.main;
    case 'payment':
      return theme.palette.success.main;
    case 'invoice':
      return theme.palette.info.main;
    case 'message':
      return theme.palette.warning.main;
    case 'contact':
      return theme.palette.secondary.main;
    case 'page':
      return theme.palette.grey[600];
    default:
      return theme.palette.primary.main;
  }
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, index, onClick }) => {
  const theme = useTheme<Theme>();
  const resultColor = getResultColor(result.type, theme);

  return (
    <AnimatedElement key={result.id} animation="slideRight" delay={index * 50}>
      <Box
        sx={{
          p: 3,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: alpha('#fff', 0.1),
          },
          transition: 'all 0.2s ease',
        }}
        onClick={() => onClick(result)}
      >
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              backgroundColor: alpha(resultColor, 0.15),
              color: resultColor,
            }}
          >
            {getResultIcon(result.type)}
          </Avatar>

          <Box flex={1} minWidth={0}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box flex={1}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {result.title}
                </Typography>
                {result.subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {result.subtitle}
                  </Typography>
                )}
              </Box>
              <ArrowRightIcon fontSize="small" color="action" />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.4 }}>
              {result.description}
            </Typography>

            {result.metadata && (
              <Box display="flex" gap={1} flexWrap="wrap">
                {result.metadata.amount && (
                  <Chip
                    label={result.metadata.amount}
                    size="small"
                    color="success"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      fontSize: '0.75rem',
                    }}
                  />
                )}
                {result.metadata.status && (
                  <Chip
                    label={result.metadata.status}
                    size="small"
                    color={
                      result.metadata.status === 'paid'
                        ? 'success'
                        : result.metadata.status === 'pending'
                          ? 'warning'
                          : result.metadata.status === 'confirmed'
                            ? 'info'
                            : 'default'
                    }
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      fontSize: '0.75rem',
                    }}
                  />
                )}
                {result.metadata.date && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(result.metadata.date).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </AnimatedElement>
  );
};
