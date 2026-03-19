// frontend/client-portal/src/components/search/GlobalSearch/useGlobalSearchLogic.ts

import { useState, useEffect, useRef, useCallback, createElement } from 'react';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCurrencySettings } from '@/hooks/useCurrency';
import type { SearchResult, SearchCategory } from './types';

export function useGlobalSearchLogic() {
  const navigate = useNavigate();
  const { formatAmount } = useCurrencySettings();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Wedding ceremony',
    'Payment due',
    'Contact Sarah',
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock search results - in a real app, this would come from API
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'event',
      title: 'Smith-Johnson Wedding',
      subtitle: 'Ceremony & Reception',
      description: 'Wedding event scheduled for March 15, 2024 at LifePlace Alfonso',
      url: '/events/1',
      metadata: {
        date: '2024-03-15',
        status: 'confirmed',
        priority: 'high',
      },
    },
    {
      id: '2',
      type: 'payment',
      title: 'Final Payment Due',
      subtitle: 'Wedding Services',
      description: 'Outstanding balance for wedding ceremony services',
      url: '/payments',
      metadata: {
        amount: formatAmount(1500),
        date: '2024-02-20',
        status: 'pending',
        priority: 'high',
      },
    },
    {
      id: '3',
      type: 'invoice',
      title: 'Invoice #INV-2024-001',
      subtitle: 'Wedding Services',
      description: 'Invoice for venue rental and catering services',
      url: '/payments',
      metadata: {
        amount: formatAmount(5000),
        date: '2024-01-15',
        status: 'paid',
      },
    },
    {
      id: '5',
      type: 'page',
      title: 'My Profile',
      subtitle: 'Account Settings',
      description: 'Update your personal information and preferences',
      url: '/profile',
    },
  ];

  const open = Boolean(anchorEl);

  const handleSearchClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setSearchQuery('');
    setSelectedCategory(null);
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);

      if (query.trim()) {
        setIsSearching(true);
        // Simulate API search delay
        setTimeout(() => {
          const filteredResults = mockResults.filter(
            (result) =>
              result.title.toLowerCase().includes(query.toLowerCase()) ||
              result.description.toLowerCase().includes(query.toLowerCase()) ||
              result.subtitle?.toLowerCase().includes(query.toLowerCase()),
          );
          setSearchResults(filteredResults);
          setIsSearching(false);
        }, 300);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    },
    [mockResults],
  );

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      // Add to recent searches
      setRecentSearches((prev) => {
        const newSearches = [result.title, ...prev.filter((s) => s !== result.title)].slice(0, 5);
        return newSearches;
      });

      navigate(result.url);
      handleClose();
    },
    [navigate, handleClose],
  );

  const handleRecentSearchClick = useCallback(
    (searchTerm: string) => {
      setSearchQuery(searchTerm);
      handleSearchChange({ target: { value: searchTerm } } as React.ChangeEvent<HTMLInputElement>);
    },
    [handleSearchChange],
  );

  const clearSearchQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  const toggleCategory = useCallback(
    (categoryType: string) => {
      setSelectedCategory(selectedCategory === categoryType ? null : categoryType);
    },
    [selectedCategory],
  );

  const categories: SearchCategory[] = [
    {
      type: 'all',
      label: 'All',
      icon: createElement(SearchIcon, { fontSize: 'small' }),
      count: searchResults.length,
    },
    {
      type: 'event',
      label: 'Events',
      icon: createElement(EventIcon, { fontSize: 'small' }),
      count: searchResults.filter((r) => r.type === 'event').length,
    },
    {
      type: 'payment',
      label: 'Payments',
      icon: createElement(PaymentIcon, { fontSize: 'small' }),
      count: searchResults.filter((r) => r.type === 'payment' || r.type === 'invoice').length,
    },
  ];

  const filteredResults =
    selectedCategory && selectedCategory !== 'all'
      ? searchResults.filter((result) => {
          if (selectedCategory === 'payment') {
            return result.type === 'payment' || result.type === 'invoice';
          }
          return result.type === selectedCategory;
        })
      : searchResults;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (!open) {
          const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement;
          if (searchButton) {
            searchButton.click();
          }
        }
      }
      if (event.key === 'Escape' && open) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  return {
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
  };
}
