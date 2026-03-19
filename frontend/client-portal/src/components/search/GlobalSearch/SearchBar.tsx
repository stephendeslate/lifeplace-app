// frontend/client-portal/src/components/search/GlobalSearch/SearchBar.tsx

import React from 'react';
import { Box, TextField, InputAdornment, Chip, IconButton, alpha } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

interface SearchBarProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearQuery: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchInputRef,
  searchQuery,
  onSearchChange,
  onClearQuery,
}) => {
  return (
    <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.1)}` }}>
      <Box display="flex" alignItems="center" gap={2}>
        <TextField
          inputRef={searchInputRef}
          placeholder="Search events, payments, messages..."
          value={searchQuery}
          onChange={onSearchChange}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={onClearQuery}
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.2),
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha('#fff', 0.1),
              backdropFilter: 'blur(10px)',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.15),
              },
            },
          }}
        />
        <Chip
          label="⌘K"
          size="small"
          sx={{
            backgroundColor: alpha('#fff', 0.1),
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        />
      </Box>
    </Box>
  );
};
