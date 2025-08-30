// frontend/admin-crm/src/pages/records/CommunicationRecords.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TablePagination,
  Tooltip,
  Button,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  History as HistoryIcon,
  SearchOff as SearchOffIcon,
  Send as SendIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationFilters } from '../../types/communications.types';

export const CommunicationRecords: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { useRecords } = useCommunications();
  const { data: records, isLoading } = useRecords(filters);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Records', path: '/records' },
    ]);
  }, [setBreadcrumbs]);

  const handleFilterChange = (key: keyof CommunicationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(0); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(0);
  };

  // @ts-expect-error - Legacy code requiring type fix
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleGoToTemplates = () => {
    navigate('/settings/templates/communication-templates');
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon fontSize="small" /> : <SmsIcon fontSize="small" />;
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

  // Calculate statistics from real data
  const totalCommunications = records?.length || 0;
  const deliveredToday = records?.filter(record => {
    const today = new Date().toDateString();
    const sentDate = record.sent_at ? new Date(record.sent_at).toDateString() : null;
    return sentDate === today && (record.delivery_status === 'SENT' || record.delivery_status === 'DELIVERED');
  }).length || 0;
  
  const emailRecords = records?.filter(record => record.channel === 'EMAIL') || [];
  const openedEmails = emailRecords.filter(record => record.is_opened).length;
  const readRate = emailRecords.length > 0 ? Math.round((openedEmails / emailRecords.length) * 100) : 0;

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
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Communication Records
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            View and manage all communication history and analytics
          </Typography>
        </Box>

        {hasActiveFilters ? renderNoResultsState() : renderNoRecordsState()}
      </Box>
    );
  }

  // Paginate records
  const paginatedRecords = records.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Communication Records
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View and manage all communication history and analytics
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Total Communications
            </Typography>
            <Typography variant="h4" component="div" color="primary">
              {totalCommunications}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Delivered Today
            </Typography>
            <Typography variant="h4" component="div" color="success.main">
              {deliveredToday}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Email Open Rate
            </Typography>
            <Typography variant="h4" component="div" color="info.main">
              {readRate}%
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, flex: 1 }}>
              <TextField
                placeholder="Search by template name..."
                value={filters.template_name || ''}
                onChange={(e) => handleFilterChange('template_name', e.target.value)}
                size="small"
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Channel</InputLabel>
                <Select
                  value={filters.channel || ''}
                  label="Channel"
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                >
                  <MenuItem value="">All Channels</MenuItem>
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="SMS">SMS</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="SENT">Sent</MenuItem>
                  <MenuItem value="DELIVERED">Delivered</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                  <MenuItem value="BOUNCED">Bounced</MenuItem>
                </Select>
              </FormControl>

              {hasActiveFilters && (
                <Button variant="outlined" size="small" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              size="small"
            >
              Export
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRecords.map((record) => (
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
                          color={getCategoryColor(record.category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
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
                      <Typography variant="body2" fontWeight="medium">
                        {record.recipient}
                      </Typography>
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
                      color={getStatusColor(record.delivery_status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
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
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredRecordsCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </Box>
  );
};