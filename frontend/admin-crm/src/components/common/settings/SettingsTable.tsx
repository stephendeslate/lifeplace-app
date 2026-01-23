// frontend/admin-crm/src/components/common/settings/SettingsTable.tsx

import { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Typography,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  ModernTable,
  ModernCard,
  ModernEmptyState,
  ModernLoadingStates,
  type ModernTableColumn,
  type ModernTableAction,
} from '../';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { useThemeColors } from '../../../hooks/useThemeColors';

export interface SettingsTableColumn<T = Record<string, unknown>> extends ModernTableColumn<T> {
  searchable?: boolean;
  filterable?: boolean;
}

export interface SettingsTableFilter {
  key: string;
  label: string;
  options: { value: unknown; label: string }[];
  multiple?: boolean;
}

export interface SettingsTableProps<T = Record<string, unknown>> {
  // Data
  data: T[];
  columns: SettingsTableColumn<T>[];
  
  // Actions
  actions?: ModernTableAction<T>[];
  onRowClick?: (row: T, index: number) => void;
  
  // Search & Filter
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  filters?: SettingsTableFilter[];
  
  // Loading & Error states
  isLoading?: boolean;
  error?: string;
  
  // Empty state
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    primaryAction?: {
      label: string;
      onClick: () => void;
      icon?: React.ReactNode;
    };
  };
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  
  // UI
  className?: string;
  maxHeight?: string;
}

export const SettingsTable = <T extends Record<string, unknown>>({
  data,
  columns,
  actions = [],
  onRowClick,
  searchable = true,
  searchPlaceholder = "Search...",
  searchFields,
  filters = [],
  isLoading = false,
  error,
  emptyState,
  sortBy,
  sortOrder,
  onSort,
  className,
  maxHeight,
}: SettingsTableProps<T>) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const themeColors = useThemeColors();

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchQuery && searchFields) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query);
          }
          if (typeof value === 'object' && value && 'name' in value) {
            return String((value as { name: unknown }).name).toLowerCase().includes(query);
          }
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        filtered = filtered.filter(item => {
          const itemValue = item[key as keyof T];
          if (Array.isArray(value)) {
            return (value as unknown[]).includes(itemValue);
          }
          return itemValue === value;
        });
      }
    });

    return filtered;
  }, [data, searchQuery, searchFields, activeFilters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (filterKey: string, value: unknown) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
  };

  // Show error state
  if (error) {
    return (
      <ModernCard className={className}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </ModernCard>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <ModernCard className={className}>
        {searchable && (
          <Box sx={{ mb: 3 }}>
            <ModernLoadingStates.ModernTableSkeleton
              rows={1}
              columns={1}
              hasHeader={false}
            />
          </Box>
        )}
        <ModernLoadingStates.ModernTableSkeleton
          rows={5}
          columns={columns.length}
          hasHeader
        />
      </ModernCard>
    );
  }

  return (
    <ModernCard 
      className={className}
      sx={{ 
        ...glassPresets.light,
        ...(maxHeight && { maxHeight, overflow: 'hidden' })
      }}
    >
      {/* Search and Filters */}
      {(searchable || filters.length > 0) && (
        <Box sx={{ mb: 3 }}>
          {searchable && (
            <TextField
              fullWidth
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: themeColors.text.secondary }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: filters.length > 0 ? 2 : 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: themeColors.surface.level2,
                  '&:hover': {
                    backgroundColor: themeColors.surface.level3,
                  },
                  '&.Mui-focused': {
                    backgroundColor: themeColors.surface.level3,
                  },
                },
              }}
            />
          )}

          {/* Active Filters Display */}
          {(searchQuery || Object.keys(activeFilters).length > 0) && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: themeColors.text.secondary, mr: 1 }}>
                Active filters:
              </Typography>

              {searchQuery && (
                <Chip
                  label={`Search: "${searchQuery}"`}
                  size="small"
                  onDelete={() => setSearchQuery('')}
                  sx={{ backgroundColor: themeColors.surface.level3 }}
                />
              )}

              {Object.entries(activeFilters).map(([key, value]) => {
                if (!value) return null;
                const filter = filters.find(f => f.key === key);
                const displayValue = Array.isArray(value)
                  ? `${value.length} selected`
                  : String(value);

                return (
                  <Chip
                    key={key}
                    label={`${filter?.label || key}: ${displayValue}`}
                    size="small"
                    onDelete={() => handleFilterChange(key, null)}
                    sx={{ backgroundColor: themeColors.surface.level3 }}
                  />
                );
              })}

              <Chip
                label="Clear all"
                size="small"
                variant="outlined"
                onClick={clearFilters}
                sx={{
                  borderColor: themeColors.border.prominent,
                  color: themeColors.text.secondary,
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Table */}
      {filteredData.length === 0 && !isLoading ? (
        <ModernEmptyState
          icon={emptyState?.icon}
          title={emptyState?.title || "No items found"}
          description={emptyState?.description || "There are no items to display."}
          primaryAction={emptyState?.primaryAction}
          size="medium"
        />
      ) : (
        <Box sx={{ ...(maxHeight && { maxHeight: `calc(${maxHeight} - 120px)`, overflowY: 'auto' }) }}>
          <ModernTable
            columns={columns}
            data={filteredData}
            actions={actions}
            onRowClick={onRowClick}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
            loading={false}
          />
        </Box>
      )}
    </ModernCard>
  );
};

export default SettingsTable;