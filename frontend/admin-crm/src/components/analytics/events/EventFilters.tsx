// frontend/admin-crm/src/components/analytics/events/EventFilters.tsx

import React, { useState } from 'react';
import {
  Box,
  Paper,
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
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { EventFilters as EventFiltersType, EventCategory } from '../../../types/analytics.types';

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

  const handleFilterChange = (field: keyof EventFiltersType, value: any) => {
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
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 250 }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={localFilters.event_category || ''}
          label="Category"
          onChange={(e) => handleFilterChange('event_category', e.target.value)}
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
        >
          <MenuItem value="">All Domains</MenuItem>
          {availableDomains.map((domain) => (
            <MenuItem key={domain} value={domain}>
              {domain}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Chip
        icon={<FilterIcon />}
        label={`${getActiveFilterCount()} filter${getActiveFilterCount() !== 1 ? 's' : ''}`}
        variant="outlined"
      />

      {getActiveFilterCount() > 0 && (
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          color="secondary"
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
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 300 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={localFilters.event_category || ''}
            label="Category"
            onChange={(e) => handleFilterChange('event_category', e.target.value)}
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

      <Divider />

      {/* Advanced Filters */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Advanced Filters
        </Typography>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {availableUsers.length > 0 && (
            <Autocomplete
              size="small"
              sx={{ minWidth: 200 }}
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
                sx: { minWidth: 150 },
                InputProps: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRangeIcon />
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
                sx: { minWidth: 150 },
                InputProps: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRangeIcon />
                    </InputAdornment>
                  ),
                },
              },
            }}
          />
        </Stack>
      </Box>

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
              color="secondary"
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
      <Paper variant="outlined" sx={{ p: 2 }}>
        {renderCompactFilters()}
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      {renderFullFilters()}
    </Paper>
  );
};