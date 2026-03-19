// frontend/client-portal/src/components/search/GlobalSearch/GlobalSearch.tsx

import React from 'react';
import {
  Box,
  Typography,
  Popover,
  Stack,
  Divider,
  IconButton,
  CircularProgress,
  alpha,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { useGlobalSearchLogic } from './useGlobalSearchLogic';
import { SearchBar } from './SearchBar';
import { SearchCategories } from './SearchCategories';
import { SearchResultItem } from './SearchResultItem';
import { SearchEmptyState } from './SearchEmptyState';

export const GlobalSearch: React.FC = () => {
  const {
    anchorEl,
    open,
    searchQuery,
    isSearching,
    searchResults,
    recentSearches,
    selectedCategory,
    searchInputRef,
    categories,
    filteredResults,
    handleSearchClick,
    handleClose,
    handleSearchChange,
    handleResultClick,
    handleRecentSearchClick,
    clearSearchQuery,
    toggleCategory,
    navigate,
  } = useGlobalSearchLogic();

  return (
    <>
      <IconButton
        onClick={handleSearchClick}
        data-search-trigger
        sx={{
          backgroundColor: alpha('#fff', 0.1),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha('#fff', 0.1)}`,
          '&:hover': {
            backgroundColor: alpha('#fff', 0.2),
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <SearchIcon />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            backgroundImage: 'none',
            mt: 1,
          },
        }}
      >
        <AnimatedElement animation="slideDown" delay={0}>
          <GlassCard
            variant="light"
            intensity="strong"
            sx={{
              width: 600,
              maxHeight: 700,
              backgroundColor: alpha('#fff', 0.95),
              backdropFilter: 'blur(25px)',
              border: `1px solid ${alpha('#fff', 0.2)}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Search Header */}
            <SearchBar
              searchInputRef={searchInputRef}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onClearQuery={clearSearchQuery}
            />

            {/* Search Categories */}
            {searchQuery && searchResults.length > 0 && (
              <SearchCategories
                categories={categories}
                selectedCategory={selectedCategory}
                onToggleCategory={toggleCategory}
              />
            )}

            {/* Search Content */}
            <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
              {isSearching ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Searching...
                  </Typography>
                </Box>
              ) : searchQuery && filteredResults.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <SearchIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No results found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try searching for events, payments, or messages
                  </Typography>
                </Box>
              ) : searchQuery && filteredResults.length > 0 ? (
                <Stack divider={<Divider sx={{ borderColor: alpha('#fff', 0.1) }} />}>
                  {filteredResults.map((result, index) => (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      index={index}
                      onClick={handleResultClick}
                    />
                  ))}
                </Stack>
              ) : (
                <SearchEmptyState
                  recentSearches={recentSearches}
                  onRecentSearchClick={handleRecentSearchClick}
                  onNavigate={navigate}
                />
              )}
            </Box>
          </GlassCard>
        </AnimatedElement>
      </Popover>
    </>
  );
};
