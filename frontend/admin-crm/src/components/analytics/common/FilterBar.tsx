// frontend/admin-crm/src/components/analytics/common/FilterBar.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Collapse,
  Typography,
  InputAdornment,
  Badge,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { DateRangePicker, type DateRange } from './DateRangePicker';

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'number' | 'date' | 'boolean';
  options?: Array<{ value: string | number | boolean; label: string }>;
  placeholder?: string;
  multiple?: boolean;
  width?: number | string;
}

export interface FilterValue {
  [key: string]: unknown;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  showDateRange?: boolean;
  
  filters?: FilterOption[];
  filterValues?: FilterValue;
  onFilterChange?: (filters: FilterValue) => void;
  
  resultCount?: number;
  resultLabel?: string;
  
  onRefresh?: () => void;
  showRefresh?: boolean;
  isLoading?: boolean;
  
  expandable?: boolean;
  defaultExpanded?: boolean;
  
  actions?: React.ReactNode;
  
  variant?: 'default' | 'compact' | 'minimal';
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  
  dateRange,
  onDateRangeChange,
  showDateRange = false,
  
  filters = [],
  filterValues = {},
  onFilterChange,
  
  resultCount,
  resultLabel = 'results',
  
  onRefresh,
  showRefresh = false,
  isLoading = false,
  
  expandable = false,
  defaultExpanded = true,
  
  actions,
  
  variant = 'default',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const handleFilterChange = (key: string, value: string | string[] | number | boolean | undefined) => {
    const newFilters = { ...filterValues, [key]: value };
    onFilterChange?.(newFilters);
  };

  const handleClearFilter = (key: string) => {
    const newFilters = { ...filterValues };
    delete newFilters[key];
    onFilterChange?.(newFilters);
  };

  const handleClearAllFilters = () => {
    setLocalSearch('');
    onSearchChange?.('');
    onFilterChange?.({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localSearch) count++;
    count += Object.keys(filterValues).length;
    return count;
  };

  const renderFilter = (filter: FilterOption) => {
    const value = filterValues[filter.key];
    
    switch (filter.type) {
      case 'select':
      case 'multiselect':
        return (
          <FormControl 
            key={filter.key} 
            size="small" 
            sx={{ minWidth: filter.width || 150 }}
          >
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value || (filter.multiple ? [] : '')}
              label={filter.label}
              multiple={filter.multiple}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              renderValue={filter.multiple ? (selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => {
                    const option = filter.options?.find(opt => opt.value === val);
                    return (
                      <Chip 
                        key={val} 
                        label={option?.label || val} 
                        size="small" 
                        onDelete={() => {
                          const newValue = (value as string[]).filter(v => v !== val);
                          handleFilterChange(filter.key, newValue);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    );
                  })}
                </Box>
              ) : undefined}
            >
              {filter.options?.map((option) => (
                <MenuItem
                  key={option.value.toString()}
                  value={
                    typeof option.value === 'boolean'
                      ? option.value ? 'true' : 'false'
                      : option.value
                  }
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'text':
        return (
          <TextField
            key={filter.key}
            label={filter.label}
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            size="small"
            sx={{ minWidth: filter.width || 150 }}
          />
        );

      case 'number':
        return (
          <TextField
            key={filter.key}
            label={filter.label}
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            type="number"
            size="small"
            sx={{ minWidth: filter.width || 120 }}
          />
        );

      case 'boolean':
        return (
          <FormControl key={filter.key} size="small" sx={{ minWidth: filter.width || 120 }}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value === undefined ? 'all' : value.toString()}
              label={filter.label}
              onChange={(e) => {
                const val = e.target.value;
                handleFilterChange(
                  filter.key, 
                  val === 'all' ? undefined : val === 'true'
                );
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  const isCompact = variant === 'compact' || variant === 'minimal';
  const isMinimal = variant === 'minimal';

  const primaryControls = (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={2} 
      alignItems="center"
      flexWrap="wrap"
    >
      {/* Search */}
      {showSearch && (
        <TextField
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: localSearch && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => handleSearchChange('')}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
      )}

      {/* Date Range */}
      {showDateRange && dateRange && onDateRangeChange && (
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          variant={isCompact ? 'chip' : 'button'}
          size="small"
        />
      )}

      {/* Quick Filters (only show first few in compact mode) */}
      {filters.slice(0, isCompact ? 2 : filters.length).map(renderFilter)}

      {/* Filter Toggle for Expandable */}
      {expandable && filters.length > (isCompact ? 2 : 0) && (
        <Badge badgeContent={getActiveFilterCount()} color="primary">
          <Button
            variant="outlined"
            size="small"
            startIcon={<TuneIcon />}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setExpanded(!expanded)}
          >
            Filters
          </Button>
        </Badge>
      )}

      {/* Result Count */}
      {resultCount !== undefined && (
        <Chip
          icon={<FilterIcon />}
          label={`${resultCount.toLocaleString()} ${resultLabel}`}
          variant="outlined"
          size="small"
        />
      )}

      {/* Refresh Button */}
      {showRefresh && onRefresh && (
        <Tooltip title="Refresh">
          <IconButton
            onClick={onRefresh}
            disabled={isLoading}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Actions */}
      {actions}
    </Stack>
  );

  const secondaryControls = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
      {/* Remaining Filters */}
      {filters.slice(isCompact ? 2 : 0).map(renderFilter)}

      {/* Clear All Filters */}
      {getActiveFilterCount() > 0 && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClearAllFilters}
        >
          Clear All
        </Button>
      )}
    </Stack>
  );

  if (isMinimal) {
    return (
      <Box sx={{ mb: 2 }}>
        {primaryControls}
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        {primaryControls}
        
        {expandable && (
          <Collapse in={expanded}>
            <Box>
              <Divider sx={{ my: 2 }} />
              {secondaryControls}
            </Box>
          </Collapse>
        )}
        
        {!expandable && filters.length > (isCompact ? 2 : 0) && (
          <>
            <Divider />
            {secondaryControls}
          </>
        )}

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && !isCompact && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {localSearch && (
                <Chip
                  label={`Search: "${localSearch}"`}
                  size="small"
                  onDelete={() => handleSearchChange('')}
                  color="primary"
                />
              )}
              {Object.entries(filterValues).map(([key, value]) => {
                const filter = filters.find(f => f.key === key);
                if (!filter || !value) return null;
                
                let displayValue = value;
                if (filter.type === 'select' || filter.type === 'multiselect') {
                  if (Array.isArray(value)) {
                    displayValue = value.map(v => {
                      const option = filter.options?.find(opt => opt.value === v);
                      return option?.label || v;
                    }).join(', ');
                  } else {
                    const option = filter.options?.find(opt => opt.value === value);
                    displayValue = option?.label || value;
                  }
                }
                
                return (
                  <Chip
                    key={key}
                    label={`${filter.label}: ${displayValue}`}
                    size="small"
                    onDelete={() => handleClearFilter(key)}
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

// Helper hook for managing filter state
export const useFilters = <T extends FilterValue>(initialFilters?: T) => {
  const [filters, setFilters] = useState<T>(initialFilters || {} as T);
  const [search, setSearch] = useState('');

  const updateFilter = (key: string, value: string | string[] | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({} as T);
    setSearch('');
  };

  const hasActiveFilters = () => {
    return Object.keys(filters).length > 0 || !!search;
  };

  return {
    filters,
    search,
    setFilters,
    setSearch,
    updateFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
};