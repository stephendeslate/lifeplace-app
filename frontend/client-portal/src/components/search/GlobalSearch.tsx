// frontend/client-portal/src/components/search/GlobalSearch.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Popover,
  Stack,
  Button,
  Chip,
  Avatar,
  Divider,
  useTheme,
  alpha,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Close as CloseIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useNavigate } from 'react-router-dom';
import { useCurrencySettings } from '../../hooks/useCurrency';

interface SearchResult {
  id: string;
  type: 'event' | 'payment' | 'invoice' | 'contact' | 'page';
  title: string;
  subtitle?: string;
  description: string;
  url: string;
  metadata?: {
    date?: string;
    amount?: string;
    status?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  highlighted?: boolean;
}

interface SearchCategory {
  type: string;
  label: string;
  icon: React.ReactNode;
  count: number;
}

export const GlobalSearch: React.FC = () => {
  const theme = useTheme();
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

  const handleSearchClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleResultClick = (result: SearchResult) => {
    // Add to recent searches
    setRecentSearches((prev) => {
      const newSearches = [result.title, ...prev.filter((s) => s !== result.title)].slice(0, 5);
      return newSearches;
    });

    navigate(result.url);
    handleClose();
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    handleSearchChange({ target: { value: searchTerm } } as React.ChangeEvent<HTMLInputElement>);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <EventIcon fontSize="small" />;
      case 'payment':
        return <PaymentIcon fontSize="small" />;
      case 'invoice':
        return <ReceiptIcon fontSize="small" />;
      case 'contact':
        return <PersonIcon fontSize="small" />;
      case 'page':
        return <TrendingUpIcon fontSize="small" />;
      default:
        return <SearchIcon fontSize="small" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'event':
        return theme.palette.primary.main;
      case 'payment':
        return theme.palette.success.main;
      case 'invoice':
        return theme.palette.info.main;
      case 'message':
        return theme.palette.warning.main;
      case 'contact':
        return theme.palette.secondary.main;
      case 'page':
        return theme.palette.grey[600];
      default:
        return theme.palette.primary.main;
    }
  };

  const categories: SearchCategory[] = [
    {
      type: 'all',
      label: 'All',
      icon: <SearchIcon fontSize="small" />,
      count: searchResults.length,
    },
    {
      type: 'event',
      label: 'Events',
      icon: <EventIcon fontSize="small" />,
      count: searchResults.filter((r) => r.type === 'event').length,
    },
    {
      type: 'payment',
      label: 'Payments',
      icon: <PaymentIcon fontSize="small" />,
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
  }, [open]);

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
            <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.1)}` }}>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  inputRef={searchInputRef}
                  placeholder="Search events, payments, messages..."
                  value={searchQuery}
                  onChange={handleSearchChange}
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
                          onClick={() => setSearchQuery('')}
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

            {/* Search Categories */}
            {searchQuery && searchResults.length > 0 && (
              <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.1)}` }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {categories.map((category) => (
                    <Chip
                      key={category.type}
                      label={`${category.label} (${category.count})`}
                      clickable
                      variant={selectedCategory === category.type ? 'filled' : 'outlined'}
                      color={selectedCategory === category.type ? 'primary' : 'default'}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === category.type ? null : category.type,
                        )
                      }
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
                  {filteredResults.map((result, index) => {
                    const resultColor = getResultColor(result.type);

                    return (
                      <AnimatedElement key={result.id} animation="slideRight" delay={index * 50}>
                        <Box
                          sx={{
                            p: 3,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: alpha('#fff', 0.1),
                            },
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => handleResultClick(result)}
                        >
                          <Box display="flex" alignItems="flex-start" gap={2}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                backgroundColor: alpha(resultColor, 0.15),
                                color: resultColor,
                              }}
                            >
                              {getResultIcon(result.type)}
                            </Avatar>

                            <Box flex={1} minWidth={0}>
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                mb={1}
                              >
                                <Box flex={1}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {result.title}
                                  </Typography>
                                  {result.subtitle && (
                                    <Typography variant="caption" color="text.secondary">
                                      {result.subtitle}
                                    </Typography>
                                  )}
                                </Box>
                                <ArrowRightIcon fontSize="small" color="action" />
                              </Box>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1, lineHeight: 1.4 }}
                              >
                                {result.description}
                              </Typography>

                              {result.metadata && (
                                <Box display="flex" gap={1} flexWrap="wrap">
                                  {result.metadata.amount && (
                                    <Chip
                                      label={result.metadata.amount}
                                      size="small"
                                      color="success"
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        fontSize: '0.75rem',
                                      }}
                                    />
                                  )}
                                  {result.metadata.status && (
                                    <Chip
                                      label={result.metadata.status}
                                      size="small"
                                      color={
                                        result.metadata.status === 'paid'
                                          ? 'success'
                                          : result.metadata.status === 'pending'
                                            ? 'warning'
                                            : result.metadata.status === 'confirmed'
                                              ? 'info'
                                              : 'default'
                                      }
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        fontSize: '0.75rem',
                                      }}
                                    />
                                  )}
                                  {result.metadata.date && (
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(result.metadata.date).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </AnimatedElement>
                    );
                  })}
                </Stack>
              ) : (
                <Box sx={{ p: 3 }}>
                  {/* Recent Searches */}
                  <Box mb={3}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <HistoryIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Recent Searches
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {recentSearches.map((search, index) => (
                        <AnimatedElement key={search} animation="slideRight" delay={index * 100}>
                          <Button
                            variant="text"
                            startIcon={<SearchIcon fontSize="small" />}
                            onClick={() => handleRecentSearchClick(search)}
                            sx={{
                              justifyContent: 'flex-start',
                              color: 'text.secondary',
                              backgroundColor: alpha('#fff', 0.05),
                              '&:hover': {
                                backgroundColor: alpha('#fff', 0.1),
                                color: 'text.primary',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {search}
                          </Button>
                        </AnimatedElement>
                      ))}
                    </Stack>
                  </Box>

                  {/* Quick Actions */}
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      Quick Actions
                    </Typography>
                    <Stack spacing={1}>
                      <Button
                        variant="text"
                        startIcon={<EventIcon fontSize="small" />}
                        onClick={() => navigate('/events')}
                        sx={{
                          justifyContent: 'flex-start',
                          backgroundColor: alpha('#fff', 0.05),
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.1),
                          },
                        }}
                      >
                        View My Events
                      </Button>
                      <Button
                        variant="text"
                        startIcon={<PaymentIcon fontSize="small" />}
                        onClick={() => navigate('/payments')}
                        sx={{
                          justifyContent: 'flex-start',
                          backgroundColor: alpha('#fff', 0.05),
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.1),
                          },
                        }}
                      >
                        Check Payments
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Box>
          </GlassCard>
        </AnimatedElement>
      </Popover>
    </>
  );
};
