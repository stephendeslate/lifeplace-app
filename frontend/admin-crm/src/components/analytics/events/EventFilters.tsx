// Modern EventFilters component with ModernDesignSystem

import React, { useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  InputAdornment,
  Autocomplete,
  Typography,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { EventFilters as EventFiltersType, EventCategory } from '../../../types/analytics.types';
import { ModernCard } from '../../common/ModernCard';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

interface EventFiltersProps {
  filters: EventFiltersType;
  onFiltersChange: (filters: EventFiltersType) => void;
  availableCategories?: EventCategory[];
  availableDomains?: string[];
  availableUsers?: Array<{ id: number; name: string }>;
  compact?: boolean;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  onFiltersChange,
  availableCategories = [],
  availableDomains = [],
  availableUsers = [],
  compact = false,
}) => {
  const [localFilters, setLocalFilters] = useState<EventFiltersType>(filters);

  const handleFilterChange = (field: keyof EventFiltersType, value: unknown) => {
    const newFilters = { ...localFilters, [field]: value || undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: EventFiltersType = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  const renderCompactFilters = () => (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <TextField
        placeholder="Search events..."
        size="small"
        value={localFilters.search || ''}
        onChange={(e) => handleFilterChange('search', e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ 
          minWidth: 280,
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.full,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.color.primary[300],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.color.primary[500],
            },
          }
        }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={localFilters.event_category || ''}
          label="Category"
          onChange={(e) => handleFilterChange('event_category', e.target.value)}
          sx={{
            borderRadius: tokens.spacing.radius.lg,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <MenuItem value="">All Categories</MenuItem>
          {availableCategories.map((category) => (
            <MenuItem key={category} value={category}>
              {category.replace('_', ' ')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Domain</InputLabel>
        <Select
          value={localFilters.source_domain || ''}
          label="Domain"
          onChange={(e) => handleFilterChange('source_domain', e.target.value)}
          sx={{
            borderRadius: tokens.spacing.radius.lg,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <MenuItem value="">All Domains</MenuItem>
          {availableDomains.map((domain) => (
            <MenuItem key={domain} value={domain}>
              {domain}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Badge 
        badgeContent={getActiveFilterCount()}
        color="primary"
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: tokens.color.primary[500],
          }
        }}
      >
        <Chip
          icon={<FilterIcon />}
          label={`Filter${getActiveFilterCount() !== 1 ? 's' : ''}`}
          variant="outlined"
          sx={{
            borderRadius: tokens.spacing.radius.full,
            border: `1px solid ${tokens.color.neutral[300]}`,
            color: tokens.color.neutral[600],
            fontWeight: 500,
          }}
        />
      </Badge>

      {getActiveFilterCount() > 0 && (
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          variant="text"
          sx={{
            color: tokens.color.warning[600],
            fontWeight: 600,
            borderRadius: tokens.spacing.radius.full,
            '&:hover': {
              backgroundColor: `${tokens.color.warning[500]}08`,
            }
          }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );

  const renderFullFilters = () => (
    <Stack spacing={3}>
      {/* Search and Basic Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField
          placeholder="Search events by name or content..."
          size="small"
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ 
            flex: 1, 
            minWidth: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.spacing.radius.lg,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: tokens.color.primary[300],
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: tokens.color.primary[500],
              },
            }
          }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={localFilters.event_category || ''}
            label="Category"
            onChange={(e) => handleFilterChange('event_category', e.target.value)}
            sx={{
              borderRadius: tokens.spacing.radius.lg,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {availableCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category.replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Source Domain</InputLabel>
          <Select
            value={localFilters.source_domain || ''}
            label="Source Domain"
            onChange={(e) => handleFilterChange('source_domain', e.target.value)}
            sx={{
              borderRadius: tokens.spacing.radius.lg,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <MenuItem value="">All Domains</MenuItem>
            {availableDomains.map((domain) => (
              <MenuItem key={domain} value={domain}>
                {domain}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Divider sx={{ borderColor: tokens.color.borders.glass }} />

      {/* Advanced Filters */}
      <ModernCard
        variant="glass"
        sx={{
          p: 3,
          border: `1px solid ${tokens.color.borders.glass}`,
        }}
      >
        <Typography variant="subtitle2" gutterBottom fontWeight={600} color={tokens.color.neutral[700]}>
          Advanced Filters
        </Typography>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {availableUsers.length > 0 && (
            <Autocomplete
              size="small"
              sx={{ 
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  borderRadius: tokens.spacing.radius.lg,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }
              }}
              options={availableUsers}
              getOptionLabel={(option) => option.name}
              value={availableUsers.find(user => user.id === localFilters.user_id) || null}
              onChange={(_, newValue) => handleFilterChange('user_id', newValue?.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="User"
                  placeholder="Select user..."
                />
              )}
            />
          )}

          <DatePicker
            label="Start Date"
            value={localFilters.start_date ? new Date(localFilters.start_date) : null}
            onChange={(date) => handleFilterChange('start_date', date?.toISOString().split('T')[0])}
            slotProps={{
              textField: {
                size: 'small',
                sx: { 
                  minWidth: 150,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  }
                },
                InputProps: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRangeIcon color="action" />
                    </InputAdornment>
                  ),
                },
              },
            }}
          />

          <DatePicker
            label="End Date"
            value={localFilters.end_date ? new Date(localFilters.end_date) : null}
            onChange={(date) => handleFilterChange('end_date', date?.toISOString().split('T')[0])}
            slotProps={{
              textField: {
                size: 'small',
                sx: { 
                  minWidth: 150,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  }
                },
                InputProps: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRangeIcon color="action" />
                    </InputAdornment>
                  ),
                },
              },
            }}
          />
        </Stack>
      </ModernCard>

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              Active filters:
            </Typography>
            
            {localFilters.search && (
              <Chip
                label={`Search: "${localFilters.search}"`}
                size="small"
                onDelete={() => handleFilterChange('search', '')}
              />
            )}
            
            {localFilters.event_category && (
              <Chip
                label={`Category: ${localFilters.event_category.replace('_', ' ')}`}
                size="small"
                onDelete={() => handleFilterChange('event_category', '')}
              />
            )}
            
            {localFilters.source_domain && (
              <Chip
                label={`Domain: ${localFilters.source_domain}`}
                size="small"
                onDelete={() => handleFilterChange('source_domain', '')}
              />
            )}
            
            {localFilters.user_id && (
              <Chip
                label={`User: ${availableUsers.find(u => u.id === localFilters.user_id)?.name || 'Unknown'}`}
                size="small"
                onDelete={() => handleFilterChange('user_id', undefined)}
              />
            )}
            
            {localFilters.start_date && (
              <Chip
                label={`From: ${localFilters.start_date}`}
                size="small"
                onDelete={() => handleFilterChange('start_date', '')}
              />
            )}
            
            {localFilters.end_date && (
              <Chip
                label={`To: ${localFilters.end_date}`}
                size="small"
                onDelete={() => handleFilterChange('end_date', '')}
              />
            )}

            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              variant="text"
              sx={{
                color: tokens.color.warning[600],
                fontWeight: 600,
                borderRadius: tokens.spacing.radius.full,
                '&:hover': {
                  backgroundColor: `${tokens.color.warning[500]}08`,
                }
              }}
            >
              Clear All
            </Button>
          </Stack>
        </Box>
      )}
    </Stack>
  );

  if (compact) {
    return (
      <ModernCard 
        variant="glass" 
        sx={{ 
          ...glassPresets.light,
          border: `1px solid ${tokens.color.borders.subtle}`,
        }}
      >
        {renderCompactFilters()}
      </ModernCard>
    );
  }

  return (
    <ModernCard 
      variant="glass" 
      sx={{ 
        ...glassPresets.light,
        border: `1px solid ${tokens.color.borders.subtle}`,
      }}
    >
      {renderFullFilters()}
    </ModernCard>
  );
};