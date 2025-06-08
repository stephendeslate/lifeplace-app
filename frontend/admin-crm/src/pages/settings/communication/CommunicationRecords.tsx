// frontend/admin-crm/src/pages/settings/communication/CommunicationRecords.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Button,
  Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  SearchOff as SearchOffIcon,
  Send as SendIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useCommunications } from '../../../hooks/useCommunications';
import type { CommunicationFilters } from '../../../types/communications.types';

export const CommunicationRecords: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CommunicationFilters>({});

  const { useRecords } = useCommunications();
  const { data: records, isLoading } = useRecords(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Communication' },
      { label: 'Records' },
    ]);
  }, [setBreadcrumbs]);

  const handleFilterChange = (key: keyof CommunicationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleGoToTemplates = () => {
    navigate('/settings/communication/templates');
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon /> : <SmsIcon />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'success';
      case 'DELIVERED': return 'primary';
      case 'FAILED': return 'error';
      case 'BOUNCED': return 'error';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SYSTEM': return 'primary';
      case 'AUTO': return 'secondary';
      case 'MANUAL': return 'default';
      default: return 'default';
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value);
  const filteredRecordsCount = records?.length || 0;

  // Empty state when no records exist at all
  const renderNoRecordsState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <HistoryIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Communication Records Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        Communication records will appear here once you start sending emails or SMS messages. 
        This includes both manual communications and automated messages triggered by your workflows.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Records will track:
        </Typography>
        <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap" mt={1}>
          <Chip 
            icon={<SendIcon />} 
            label="Delivery Status" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            icon={<AnalyticsIcon />} 
            label="Open Tracking" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            icon={<HistoryIcon />} 
            label="Send History" 
            variant="outlined" 
            size="small" 
          />
        </Box>
      </Box>

      <Button
        variant="contained"
        size="large"
        startIcon={<SendIcon />}
        onClick={handleGoToTemplates}
        sx={{ mt: 2 }}
      >
        Create Templates to Get Started
      </Button>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> Admin invitations and other system emails will automatically appear here once sent
      </Typography>
    </Paper>
  );

  // Empty state when filters return no results
  const renderNoResultsState = () => (
    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
      <SearchOffIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        No Records Match Your Filters
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Try adjusting your search criteria or clearing filters to see more communication records.
      </Typography>
      <Button variant="outlined" onClick={handleClearFilters}>
        Clear All Filters
      </Button>
    </Paper>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Show appropriate empty state
  if (!records || records.length === 0) {
    return (
      <Box>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Communication Records
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View history and analytics for all sent communications
          </Typography>
        </Box>

        {hasActiveFilters ? renderNoResultsState() : renderNoRecordsState()}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Communication Records
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {filteredRecordsCount} record{filteredRecordsCount !== 1 ? 's' : ''} found
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by template name..."
              value={filters.template_name || ''}
              onChange={(e) => handleFilterChange('template_name', e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="SENT">Sent</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="BOUNCED">Bounced</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Channel</InputLabel>
              <Select
                value={filters.channel || ''}
                label="Channel"
                onChange={(e) => handleFilterChange('channel', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="SMS">SMS</MenuItem>
              </Select>
            </FormControl>
            {hasActiveFilters && (
              <Button variant="outlined" size="small" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell width="50"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records?.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getChannelIcon(record.channel)}
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {record.template_name}
                        </Typography>
                        <Chip
                          label={record.category}
                          size="small"
                          color={getCategoryColor(record.category) as any}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.channel}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{record.recipient}</Typography>
                      {record.client_name && (
                        <Typography variant="caption" color="text.secondary">
                          {record.client_name}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.delivery_status}
                      size="small"
                      color={getStatusColor(record.delivery_status) as any}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {record.sent_at 
                        ? new Date(record.sent_at).toLocaleString()
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {record.channel === 'EMAIL' ? (
                      record.is_opened ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label="Opened" size="small" color="success" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(record.opened_at!).toLocaleString()}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip label="Not opened" size="small" variant="outlined" />
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};