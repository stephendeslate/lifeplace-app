// frontend/admin-crm/src/components/common/ModernSearch.tsx

import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Stack,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { tokens } from '../../design-system/tokens';

export interface ModernSearchFilter {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'number' | 'date';
  options?: { value: unknown; label: string }[];
  placeholder?: string;
  width?: string;
}

export interface ModernSearchProps {
  searchValue?: string;
  onSearchChange: (value: string) => void;
  filters?: ModernSearchFilter[];
  filterValues?: Record<string, unknown>;
  onFilterChange?: (key: string, value: unknown) => void;
  onClearFilters?: () => void;
  placeholder?: string;
  showFilterButton?: boolean;
  defaultExpanded?: boolean;
  className?: string;
  disabled?: boolean;
}

export const ModernSearch: React.FC<ModernSearchProps> = ({
  searchValue = '',
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  placeholder = 'Search...',
  showFilterButton = true,
  defaultExpanded = false,
  className,
  disabled = false,
}) => {
  const [filtersExpanded, setFiltersExpanded] = React.useState(defaultExpanded);

  const hasActiveFilters = Object.values(filterValues).some(
    (value) =>
      value !== undefined &&
      value !== '' &&
      value !== null &&
      (Array.isArray(value) ? value.length > 0 : true),
  );

  const handleFilterChange = (key: string, value: unknown) => {
    onFilterChange?.(key, value);
  };

  const handleClearFilters = () => {
    onClearFilters?.();
  };

  const renderFilter = (filter: ModernSearchFilter) => {
    const value = filterValues[filter.key];

    switch (filter.type) {
      case 'select':
        return (
          <FormControl size="small" sx={{ minWidth: filter.width || 140 }}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value || ''}
              label={filter.label}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              disabled={disabled}
              sx={{
                borderRadius: tokens.spacing.radius.md,
              }}
            >
              <MenuItem value="">All {filter.label}</MenuItem>
              {filter.options?.map((option) => (
                <MenuItem key={String(option.value)} value={option.value as string | number}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl size="small" sx={{ minWidth: filter.width || 180 }}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              multiple
              value={value || []}
              label={filter.label}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              disabled={disabled}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as unknown[]).slice(0, 2).map((val) => {
                    const option = filter.options?.find((opt) => opt.value === val);
                    return (
                      <Chip key={String(val)} label={option?.label || String(val)} size="small" />
                    );
                  })}
                  {(selected as unknown[]).length > 2 && (
                    <Chip label={`+${(selected as unknown[]).length - 2}`} size="small" />
                  )}
                </Box>
              )}
              sx={{
                borderRadius: tokens.spacing.radius.md,
              }}
            >
              {filter.options?.map((option) => (
                <MenuItem key={String(option.value)} value={option.value as string | number}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'text':
      case 'number':
      case 'date':
        return (
          <TextField
            size="small"
            label={filter.label}
            type={filter.type}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
            disabled={disabled}
            sx={{
              minWidth: filter.width || 140,
              '& .MuiOutlinedInput-root': {
                borderRadius: tokens.spacing.radius.md,
              },
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box className={className}>
      {/* Search Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.spacing.radius.md,
              bgcolor: 'background.paper',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: tokens.color.neutral[500] }} />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange('')} disabled={disabled}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {showFilterButton && filters.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            disabled={disabled}
            sx={{
              borderRadius: tokens.spacing.radius.md,
              minWidth: 120,
              position: 'relative',
            }}
          >
            Filters
            {hasActiveFilters && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: tokens.color.primary[500],
                }}
              />
            )}
          </Button>
        )}
      </Box>

      {/* Filters Section */}
      {filters.length > 0 && (
        <Collapse in={filtersExpanded} timeout={200}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: tokens.spacing.radius.md,
              border: `1px solid ${tokens.color.borders.subtle}`,
              p: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Filters
              </Typography>
              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={handleClearFilters}
                  disabled={disabled}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Clear All
                </Button>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
              }}
            >
              {filters.map((filter) => (
                <Box key={filter.key}>{renderFilter(filter)}</Box>
              ))}
            </Box>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${tokens.color.borders.subtle}` }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block' }}
                >
                  Active Filters:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(filterValues).map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;

                    const filter = filters.find((f) => f.key === key);
                    if (!filter) return null;

                    const displayValue = Array.isArray(value)
                      ? `${value.length} selected`
                      : value.toString();

                    return (
                      <Chip
                        key={key}
                        label={`${filter.label}: ${displayValue}`}
                        size="small"
                        onDelete={() =>
                          handleFilterChange(key, filter.type === 'multiselect' ? [] : '')
                        }
                        disabled={disabled}
                        sx={{
                          bgcolor: tokens.color.primary[50],
                          '& .MuiChip-deleteIcon': {
                            color: tokens.color.primary[700],
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default ModernSearch;
