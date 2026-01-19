// frontend/admin-crm/src/pages/support/SupportPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  SupportAgent as SupportIcon,
  CheckCircle as ResolvedIcon,
  HourglassEmpty as PendingIcon,
  ErrorOutline as UrgentIcon,
} from '@mui/icons-material';
import { useSupport } from '../../hooks/useSupport';
import { InquiryList } from './components/InquiryList';
import { InquiryDetail } from './components/InquiryDetail';
import type { SupportFilters, SupportInquiry } from '../../types/support.types';

const SupportPage: React.FC = () => {
  const [selectedInquiry, setSelectedInquiry] = useState<SupportInquiry | null>(null);
  const [filters, setFilters] = useState<SupportFilters>({});

  const { useSupportStats, useSupportInquiries } = useSupport();
  const { data: stats, isLoading: statsLoading } = useSupportStats();
  const { data: inquiries, isLoading: inquiriesLoading, error: inquiriesError } = useSupportInquiries(filters);

  const handleInquirySelect = (inquiry: SupportInquiry) => {
    setSelectedInquiry(inquiry);
  };

  const handleBackToList = () => {
    setSelectedInquiry(null);
  };

  const handleFilterChange = (field: keyof SupportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  // Show detail view if inquiry is selected
  if (selectedInquiry) {
    return (
      <InquiryDetail
        inquiryId={selectedInquiry.id}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Support Inquiries
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage client support requests and inquiries
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Paper sx={{ p: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'info.light',
              color: 'info.main',
            }}
          >
            <SupportIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {statsLoading ? '-' : stats?.open || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open Inquiries
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'warning.light',
              color: 'warning.main',
            }}
          >
            <PendingIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {statsLoading ? '-' : stats?.unassigned || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unassigned
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'error.light',
              color: 'error.main',
            }}
          >
            <UrgentIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {statsLoading ? '-' : (stats?.by_priority?.urgent || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Urgent Priority
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'success.light',
              color: 'success.main',
            }}
          >
            <ResolvedIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {statsLoading ? '-' : stats?.resolved_today || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resolved Today
            </Typography>
          </Box>
        </Paper>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Search by subject, client name, or email..."
            size="small"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Open</MenuItem>
              <MenuItem value="waiting">Awaiting Response</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category || ''}
              label="Category"
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="billing">Billing & Payments</MenuItem>
              <MenuItem value="event">Event Questions</MenuItem>
              <MenuItem value="technical">Technical Issues</MenuItem>
              <MenuItem value="general">General Inquiry</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority || ''}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Assignment</InputLabel>
            <Select
              value={filters.assigned_admin || ''}
              label="Assignment"
              onChange={(e) => handleFilterChange('assigned_admin', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="unassigned">Unassigned</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Inquiry List */}
      <Paper sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Inquiries
          </Typography>
          {inquiries && (
            <Chip
              label={`${inquiries.length} total`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {inquiriesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : inquiriesError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load inquiries. Please try again.
          </Alert>
        ) : inquiries && inquiries.length > 0 ? (
          <InquiryList
            inquiries={inquiries}
            onSelect={handleInquirySelect}
          />
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              No support inquiries found matching your filters.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SupportPage;
