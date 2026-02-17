// frontend/admin-crm/src/components/common/settings/SettingsTable.tsx

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Typography,
  Alert,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import {
  ModernTable,
  ModernCard,
  ModernEmptyState,
  ModernLoadingStates,
  type ModernTableColumn,
  type ModernTableAction,
} from "../";
import { glassPresets } from "../../../design-system/utils/glassmorphism";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { ServerPaginationConfig } from "../../../types/common.types";

export interface SettingsTableColumn<
  T = Record<string, unknown>,
> extends ModernTableColumn<T> {
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
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;

  // UI
  className?: string;
  maxHeight?: string;

  // Server-side pagination
  pagination?: ServerPaginationConfig;
  onSearchChange?: (search: string) => void;
  onFilterChange?: (filters: Record<string, unknown>) => void;
  serverSideMode?: boolean;
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
  pagination,
  onSearchChange,
  onFilterChange,
  serverSideMode = false,
}: SettingsTableProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>(
    {},
  );
  const themeColors = useThemeColors();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Display data: skip client-side filtering in server-side mode
  const displayData = useMemo(() => {
    if (serverSideMode) {
      return data;
    }

    let filtered = [...data];

    // Apply search (client-side)
    if (searchQuery && searchFields) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(query);
          }
          if (typeof value === "object" && value && "name" in value) {
            return String((value as { name: unknown }).name)
              .toLowerCase()
              .includes(query);
          }
          return String(value).toLowerCase().includes(query);
        }),
      );
    }

    // Apply filters (client-side)
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        filtered = filtered.filter((item) => {
          const itemValue = item[key as keyof T];
          if (Array.isArray(value)) {
            return (value as unknown[]).includes(itemValue);
          }
          return itemValue === value;
        });
      }
    });

    return filtered;
  }, [data, searchQuery, searchFields, activeFilters, serverSideMode]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchQuery(value);

      if (serverSideMode && onSearchChange) {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
          onSearchChange(value);
        }, 300);
      }
    },
    [serverSideMode, onSearchChange],
  );

  const handleFilterChange = (filterKey: string, value: unknown) => {
    const newFilters = { ...activeFilters };
    if (value === null || value === undefined || value === "") {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }
    setActiveFilters(newFilters);

    if (serverSideMode && onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveFilters({});
    if (serverSideMode) {
      onSearchChange?.("");
      onFilterChange?.({});
    }
  };

  const hasActiveFilters =
    searchQuery.length > 0 || Object.keys(activeFilters).length > 0;

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
        ...(maxHeight && { maxHeight, overflow: "hidden" }),
      }}
    >
      {/* Search and Filters */}
      {(searchable || filters.length > 0) && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {searchable && (
              <TextField
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
                  flex: 1,
                  minWidth: 200,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: themeColors.surface.level2,
                    "&:hover": {
                      backgroundColor: themeColors.surface.level3,
                    },
                    "&.Mui-focused": {
                      backgroundColor: themeColors.surface.level3,
                    },
                  },
                }}
              />
            )}

            {/* Filter dropdowns */}
            {filters.map((filter) => (
              <FormControl key={filter.key} size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{filter.label}</InputLabel>
                <Select
                  value={
                    activeFilters[filter.key] !== undefined
                      ? String(activeFilters[filter.key])
                      : ""
                  }
                  label={filter.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleFilterChange(filter.key, val || null);
                  }}
                  sx={{
                    backgroundColor: themeColors.surface.level2,
                  }}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {filter.options.map((opt) => (
                    <MenuItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Box>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
                mt: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: themeColors.text.secondary, mr: 1 }}
              >
                Active filters:
              </Typography>

              {searchQuery && !serverSideMode && (
                <Chip
                  label={`Search: "${searchQuery}"`}
                  size="small"
                  onDelete={() => {
                    setSearchQuery("");
                    if (serverSideMode) onSearchChange?.("");
                  }}
                  sx={{ backgroundColor: themeColors.surface.level3 }}
                />
              )}

              {Object.entries(activeFilters).map(([key, value]) => {
                if (!value) return null;
                const filter = filters.find((f) => f.key === key);
                const option = filter?.options.find(
                  (o) => String(o.value) === String(value),
                );
                const displayValue = option
                  ? option.label
                  : Array.isArray(value)
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
      {displayData.length === 0 && !isLoading ? (
        <ModernEmptyState
          icon={emptyState?.icon}
          title={
            hasActiveFilters
              ? "No matching items"
              : emptyState?.title || "No items found"
          }
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters."
              : emptyState?.description || "There are no items to display."
          }
          primaryAction={
            hasActiveFilters
              ? { label: "Clear Filters", onClick: clearFilters }
              : emptyState?.primaryAction
          }
          size="medium"
        />
      ) : (
        <Box
          sx={{
            ...(maxHeight && {
              maxHeight: `calc(${maxHeight} - 120px)`,
              overflowY: "auto",
            }),
          }}
        >
          <ModernTable
            columns={columns}
            data={displayData}
            actions={actions}
            onRowClick={onRowClick}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
            loading={false}
          />
        </Box>
      )}

      {/* Pagination */}
      {pagination && (
        <Box sx={{ borderTop: 1, borderColor: "divider" }}>
          <TablePagination
            component="div"
            count={pagination.totalCount}
            page={pagination.currentPage}
            rowsPerPage={pagination.pageSize}
            onPageChange={(_event, newPage) => pagination.onPageChange(newPage)}
            onRowsPerPageChange={(event) =>
              pagination.onPageSizeChange(parseInt(event.target.value, 10))
            }
            rowsPerPageOptions={
              pagination.rowsPerPageOptions || [10, 25, 50, 100]
            }
          />
        </Box>
      )}
    </ModernCard>
  );
};

export default SettingsTable;
