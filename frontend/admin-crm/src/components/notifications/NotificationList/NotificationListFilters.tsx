import React from 'react';
import {
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import { Search, FilterList } from '@mui/icons-material';
import type { NotificationFilters } from '@/types/notifications.types';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from '@/types/notifications.types';

interface NotificationListFiltersProps {
  filters: NotificationFilters;
  searchValue: string;
  showFilters: boolean;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (field: keyof NotificationFilters, value: string | boolean | undefined) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

export const NotificationListFilters: React.FC<NotificationListFiltersProps> = ({
  filters,
  searchValue,
  showFilters,
  hasActiveFilters,
  onSearchChange,
  onFilterChange,
  onToggleFilters,
  onClearFilters,
}) => {
  return (
    <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search notifications..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
          />

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={onToggleFilters}
            color={hasActiveFilters ? 'primary' : 'inherit'}
            size="small"
          >
            Filters
            {hasActiveFilters && (
              <Chip size="small" label="•" sx={{ ml: 1, minWidth: 'auto', width: 8, height: 8 }} />
            )}
          </Button>
        </Stack>

        {showFilters && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.is_read !== undefined ? (filters.is_read ? 'read' : 'unread') : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    onFilterChange(
                      'is_read',
                      (value as string) === '' ? undefined : value === 'read',
                    );
                  }}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="unread">Unread</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ''}
                  onChange={(e) => onFilterChange('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {NOTIFICATION_CATEGORIES.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority || ''}
                  onChange={(e) => onFilterChange('priority', e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  {NOTIFICATION_PRIORITIES.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="text"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
                size="small"
              >
                Clear Filters
              </Button>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};
