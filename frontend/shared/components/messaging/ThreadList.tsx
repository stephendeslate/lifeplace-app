/**
 * ThreadList - Placeholder component for thread list
 */

import React from 'react';
import { Box } from '@mui/material';

export interface ThreadListProps {
  threads?: any[];
  selectedThreadId?: string | null;
  onThreadSelect?: (thread: any | null) => void;
  loading?: boolean;
  // Additional props used in MessageInterface
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  userRole?: 'CLIENT' | 'ADMIN';
  compact?: boolean;
  enableSearch?: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads = [],
  selectedThreadId,
  onThreadSelect,
  loading = false,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  userRole = 'CLIENT',
  compact = false,
  enableSearch = true
}) => {
  return (
    <Box>
      <div>Thread List Placeholder</div>
    </Box>
  );
};

export default ThreadList;