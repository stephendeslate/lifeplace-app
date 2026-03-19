// frontend/client-portal/src/components/search/GlobalSearch/SearchCategories.tsx

import React from 'react';
import { Box, Stack, Chip, useTheme, alpha } from '@mui/material';
import type { SearchCategory } from './types';

interface SearchCategoriesProps {
  categories: SearchCategory[];
  selectedCategory: string | null;
  onToggleCategory: (categoryType: string) => void;
}

export const SearchCategories: React.FC<SearchCategoriesProps> = ({
  categories,
  selectedCategory,
  onToggleCategory,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.1)}` }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
        {categories.map((category) => (
          <Chip
            key={category.type}
            label={`${category.label} (${category.count})`}
            clickable
            variant={selectedCategory === category.type ? 'filled' : 'outlined'}
            color={selectedCategory === category.type ? 'primary' : 'default'}
            onClick={() => onToggleCategory(category.type)}
            sx={{
              backgroundColor:
                selectedCategory === category.type
                  ? alpha(theme.palette.primary.main, 0.1)
                  : alpha('#fff', 0.1),
              backdropFilter: 'blur(5px)',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.2),
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};
