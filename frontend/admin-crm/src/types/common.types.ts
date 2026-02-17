// frontend/admin-crm/src/types/common.types.ts

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page_count: number;
  current_page: number;
  page_size: number;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface ServerPaginationConfig {
  totalCount: number;
  currentPage: number; // 0-indexed (MUI convention)
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  rowsPerPageOptions?: number[];
}
