import React from 'react';
import {
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewModule as MonthIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format, startOfWeek as startOfWeekDate, endOfWeek as endOfWeekDate } from 'date-fns';
import { isTodayInManila, formatInManila } from '@/utils/timezone';
import { ModernCard } from '@/components/common/ModernCard';
import { EVENT_STATUSES } from '@/types/events.types';

import type { EventFilters } from '@/types/events.types';
import type { AvailabilityFilters } from '@/types/availability.types';
import type { CalendarView } from './types';

interface CalendarControlsProps {
  currentDate: Date;
  view: CalendarView;
  searchValue: string;
  setSearchValue: (value: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  filters: EventFilters;
  availabilityFilters: AvailabilityFilters;
  eventTypes: Array<{ id: number; name: string }>;
  hasActiveFilters: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  onFilterChange: (key: keyof EventFilters, value: string) => void;
  onAvailabilityFilterChange: (key: keyof AvailabilityFilters, value: unknown) => void;
  onClearFilters: () => void;
}

export const CalendarControls: React.FC<CalendarControlsProps> = ({
  currentDate,
  view,
  searchValue,
  setSearchValue,
  filtersOpen,
  setFiltersOpen,
  filters,
  availabilityFilters,
  eventTypes,
  hasActiveFilters,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onFilterChange,
  onAvailabilityFilterChange,
  onClearFilters,
}) => {
  return (
    <ModernCard variant="flat" size="medium" sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Navigation Controls */}
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={onPrevious}>
            <ChevronLeftIcon />
          </IconButton>

          <Button
            variant="outlined"
            onClick={onToday}
            startIcon={<TodayIcon />}
            sx={{
              minWidth: 100,
              backgroundColor: isTodayInManila(currentDate) ? 'primary.light' : 'transparent',
            }}
          >
            Today
          </Button>

          <IconButton onClick={onNext}>
            <ChevronRightIcon />
          </IconButton>

          <Typography variant="h6" sx={{ ml: 2, minWidth: 200 }}>
            {view === 'month'
              ? formatInManila(currentDate, 'MMMM yyyy')
              : `${format(startOfWeekDate(currentDate), 'MMM d')} - ${format(endOfWeekDate(currentDate), 'MMM d, yyyy')}`}
          </Typography>
        </Stack>

        {/* View Controls and Filters */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search events..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ minWidth: 200 }}
          />

          <IconButton
            onClick={() => setFiltersOpen(!filtersOpen)}
            color={hasActiveFilters ? 'primary' : 'default'}
          >
            <FilterIcon />
          </IconButton>

          <Stack direction="row" spacing={0}>
            <IconButton
              onClick={() => onViewChange('month')}
              color={view === 'month' ? 'primary' : 'default'}
            >
              <MonthIcon />
            </IconButton>
            <IconButton
              onClick={() => onViewChange('week')}
              color={view === 'week' ? 'primary' : 'default'}
            >
              <WeekIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Stack>

      {/* Expandable Filters */}
      {filtersOpen && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || 'all'}
                label="Status"
                onChange={(e) => onFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                {EVENT_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filters.event_type || 'all'}
                label="Event Type"
                onChange={(e) => onFilterChange('event_type', String(e.target.value))}
              >
                <MenuItem value="all">All Types</MenuItem>
                {eventTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Availability</InputLabel>
              <Select
                value={
                  availabilityFilters.show_conflicts !== undefined
                    ? availabilityFilters.show_conflicts
                      ? 'conflicts'
                      : 'available'
                    : 'all'
                }
                label="Availability"
                onChange={(e) =>
                  onAvailabilityFilterChange(
                    'show_conflicts',
                    e.target.value === 'conflicts'
                      ? true
                      : e.target.value === 'available'
                        ? false
                        : undefined,
                  )
                }
              >
                <MenuItem value="all">All Dates</MenuItem>
                <MenuItem value="available">Available Only</MenuItem>
                <MenuItem value="conflicts">With Conflicts</MenuItem>
              </Select>
            </FormControl>

            {hasActiveFilters && (
              <Button variant="outlined" size="small" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
          </Stack>
        </>
      )}
    </ModernCard>
  );
};
