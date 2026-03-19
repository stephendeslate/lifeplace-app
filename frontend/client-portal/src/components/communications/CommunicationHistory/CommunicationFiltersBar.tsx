import React from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  alpha,
} from '@mui/material';
import { Refresh as RefreshIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { CommunicationFilters } from '@/types/communications.types';

interface CommunicationFiltersBarProps {
  filters: CommunicationFilters;
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof CommunicationFilters, value: string) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

export const CommunicationFiltersBar: React.FC<CommunicationFiltersBarProps> = ({
  filters,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
  onRefresh,
}) => {
  return (
    <AnimatedElement animation="slideUp" delay={200}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          mb: 4,
          p: 3,
          border: `1px solid ${alpha('#fff', 0.1)}`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search messages..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Channel</InputLabel>
            <Select
              value={filters.channel || 'all'}
              label="Channel"
              onChange={(e) => onFilterChange('channel', e.target.value)}
            >
              <MenuItem value="all">All Channels</MenuItem>
              <MenuItem value="EMAIL">Email</MenuItem>
              <MenuItem value="SMS">SMS</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.category || 'all'}
              label="Type"
              onChange={(e) => onFilterChange('category', e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="SYSTEM">System</MenuItem>
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="AUTO">Automated</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.is_opened ?? 'all'}
              label="Status"
              onChange={(e) => onFilterChange('is_opened', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Read</MenuItem>
              <MenuItem value="false">Unread</MenuItem>
            </Select>
          </FormControl>

          <Box display="flex" gap={1}>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={onClearFilters}
                startIcon={<FilterIcon />}
              >
                Clear
              </Button>
            )}
            <IconButton
              size="small"
              onClick={onRefresh}
              title="Refresh"
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.1)}`,
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.2),
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Stack>
      </GlassCard>
    </AnimatedElement>
  );
};
