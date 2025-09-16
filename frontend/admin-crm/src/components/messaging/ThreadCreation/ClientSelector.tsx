/**
 * ClientSelector - Client selection component for thread creation
 *
 * Features:
 * - Autocomplete with search functionality
 * - Uses existing useClients hook
 * - Debounced search for performance
 * - Shows client names and email for identification
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { useClients } from '../../../hooks/useClients';
import type { Client } from '../../../types/clients.types';

export interface ClientSelectorProps {
  value: Client | null;
  onChange: (client: Client | null) => void;
  error?: string;
  disabled?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Use the clients hook with search filter
  const clientFilters = useMemo(() => ({
    search: searchTerm || undefined,
    page: 1,
    page_size: 50, // Limit results for performance
  }), [searchTerm]);

  const { clients, isLoadingClients } = useClients(clientFilters);

  // Debounced search update
  const handleInputChange = useCallback((_event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);

    // Debounce search term update
    const timeoutId = setTimeout(() => {
      setSearchTerm(newInputValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleChange = useCallback((_event: React.SyntheticEvent, newValue: Client | null) => {
    onChange(newValue);
  }, [onChange]);

  // Format option label for display
  const getOptionLabel = useCallback((option: Client | string) => {
    if (typeof option === 'string') {
      return option;
    }
    return `${option.first_name} ${option.last_name}`;
  }, []);

  // Check if options are equal
  const isOptionEqualToValue = useCallback((option: Client, value: Client) => {
    return option.id === value.id;
  }, []);

  // Render option with avatar and details
  const renderOption = useCallback((props: React.HTMLAttributes<HTMLLIElement>, option: Client) => (
    <Box
      component="li"
      {...props}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'primary.main',
          fontSize: '0.875rem',
        }}
      >
        {option.first_name.charAt(0)}{option.last_name.charAt(0)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {option.first_name} {option.last_name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: 'block' }}
        >
          {option.email}
        </Typography>
      </Box>
    </Box>
  ), []);

  return (
    <Autocomplete
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={clients}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      loading={isLoadingClients}
      disabled={disabled}
      filterOptions={(x) => x} // Disable client-side filtering since we're doing server-side search
      noOptionsText={searchTerm ? "No clients found" : "Start typing to search clients"}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Client *"
          error={!!error}
          helperText={error}
          placeholder="Search for a client..."
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
            ),
            endAdornment: (
              <>
                {isLoadingClients ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{
        '& .MuiAutocomplete-inputRoot': {
          pl: 1,
        },
      }}
    />
  );
};