// frontend/admin-crm/src/hooks/useSettingsPagination.ts

import { useState, useCallback } from 'react';

export interface UseSettingsPaginationOptions {
  defaultPageSize?: number;
}

export const useSettingsPagination = (options?: UseSettingsPaginationOptions) => {
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed for MUI
  const [pageSize, setPageSize] = useState(options?.defaultPageSize || 25);
  const [search, setSearchRaw] = useState('');
  const [filters, setFiltersRaw] = useState<Record<string, unknown>>({});
  const [ordering, setOrderingRaw] = useState('');

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setCurrentPage(0);
  }, []);

  const setFilters = useCallback((value: Record<string, unknown>) => {
    setFiltersRaw(value);
    setCurrentPage(0);
  }, []);

  const setOrdering = useCallback((value: string) => {
    setOrderingRaw(value);
    setCurrentPage(0);
  }, []);

  const onPageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const onPageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(0);
  }, []);

  return {
    // For API calls (1-indexed page)
    page: currentPage + 1,
    pageSize,
    search,
    filters,
    ordering,

    // Setters (all reset page to 0)
    setSearch,
    setFilters,
    setOrdering,

    // For MUI TablePagination (0-indexed)
    currentPage,
    onPageChange,
    onPageSizeChange,
  };
};
