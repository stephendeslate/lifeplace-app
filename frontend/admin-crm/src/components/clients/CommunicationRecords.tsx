// frontend/admin-crm/src/components/clients/CommunicationRecords.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Visibility as ViewIcon,
  CheckCircle as DeliveredIcon,
  Schedule as PendingIcon,
  Error as FailedIcon,
  Send as SentIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  MarkEmailRead as OpenedIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { sanitizeHTML } from '../../utils/security';
import type { CommunicationRecord, CommunicationFilters } from '../../types/clients.types';

interface CommunicationRecordsProps {
  clientId: number;
}

export const CommunicationRecords: React.FC<CommunicationRecordsProps> = ({ clientId }) => {
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { useRecords } = useCommunications();
  const { 
    data: records = [], 
    isLoading, 
    refetch,
    error 
  } = useRecords({ ...filters, client_id: clientId });

  const handleFilterChange = (key: keyof CommunicationFilters, value: string) => {
    setFilters((prev: CommunicationFilters) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewDetail = (record: CommunicationRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon fontSize="small" /> : <SmsIcon fontSize="small" />;
  };

  const getStatusIcon = (status: string, isOpened: boolean) => {
    switch (status) {
      case 'DELIVERED':
        return isOpened ? <OpenedIcon color="success" /> : <DeliveredIcon color="success" />;
      case 'SENT':
        return <SentIcon color="info" />;
      case 'PENDING':
        return <PendingIcon color="warning" />;
      case 'FAILED':
      case 'BOUNCED':
        return <FailedIcon color="error" />;
      default:
        return <PendingIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'SENT': return 'info';
      case 'PENDING': return 'warning';
      case 'FAILED':
      case 'BOUNCED': return 'error';
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

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load communication records. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search template or content..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Channel</InputLabel>
              <Select
                value={filters.channel || 'all'}
                label="Channel"
                onChange={(e) => handleFilterChange('channel', e.target.value)}
              >
                <MenuItem value="all">All Channels</MenuItem>
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="SMS">SMS</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category || 'all'}
                label="Category"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="SYSTEM">System</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
                <MenuItem value="AUTO">Auto</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.delivery_status || 'all'}
                label="Status"
                onChange={(e) => handleFilterChange('delivery_status', e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="SENT">Sent</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="BOUNCED">Bounced</MenuItem>
              </Select>
            </FormControl>
            
            <Box display="flex" gap={1}>
              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleClearFilters}
                  startIcon={<FilterIcon />}
                >
                  Clear
                </Button>
              )}
              <IconButton size="small" onClick={() => refetch()} title="Refresh">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Records Table */}
      {records.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <EmailIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Communication Records
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hasActiveFilters 
              ? 'No communications match your current filters.'
              : 'No communications have been sent to this client yet.'
            }
          </Typography>
        </Paper>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Template</TableCell>
                  <TableCell>Channel</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Subject/Content</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Sent By</TableCell>
                  <TableCell width="50"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getChannelIcon(record.channel)}
                        <Typography variant="body2" fontWeight="medium">
                          {record.template_name}
                        </Typography>
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
                      <Chip
                        label={record.category}
                        size="small"
                        color={getCategoryColor(record.category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {record.subject || record.body.substring(0, 50) + '...'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Tooltip title={
                          record.is_opened ? 'Opened' : 
                          record.delivery_status === 'DELIVERED' ? 'Delivered but not opened' :
                          record.delivery_status
                        }>
                          <Box display="flex" alignItems="center">
                            {getStatusIcon(record.delivery_status, record.is_opened)}
                          </Box>
                        </Tooltip>
                        <Chip
                          label={record.is_opened ? 'Opened' : record.delivery_status}
                          size="small"
                          color={getStatusColor(record.delivery_status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.sent_at 
                          ? new Date(record.sent_at).toLocaleString()
                          : 'Not sent'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.sent_by_name || 'System'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetail(record)}
                        title="View details"
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Communication Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Communication Details
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Stack spacing={3}>
              {/* Basic Info */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Template:</Typography>
                    <Typography variant="body2">{selectedRecord.template_name}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Channel:</Typography>
                    <Chip label={selectedRecord.channel} size="small" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Category:</Typography>
                    <Chip 
                      label={selectedRecord.category} 
                      size="small" 
                      color={getCategoryColor(selectedRecord.category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Recipient:</Typography>
                    <Typography variant="body2">{selectedRecord.recipient}</Typography>
                  </Box>
                  {selectedRecord.sent_by_name && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Sent By:</Typography>
                      <Typography variant="body2">{selectedRecord.sent_by_name}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Delivery Status */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Delivery Status
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(selectedRecord.delivery_status, selectedRecord.is_opened)}
                      <Chip 
                        label={selectedRecord.is_opened ? 'Opened' : selectedRecord.delivery_status}
                        size="small" 
                        color={getStatusColor(selectedRecord.delivery_status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      />
                    </Box>
                  </Box>
                  {selectedRecord.sent_at && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Sent:</Typography>
                      <Typography variant="body2">
                        {new Date(selectedRecord.sent_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {selectedRecord.delivered_at && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Delivered:</Typography>
                      <Typography variant="body2">
                        {new Date(selectedRecord.delivered_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {selectedRecord.opened_at && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Opened:</Typography>
                      <Typography variant="body2">
                        {new Date(selectedRecord.opened_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Content */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Message Content
                </Typography>
                {selectedRecord.subject && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Subject:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">{selectedRecord.subject}</Typography>
                    </Paper>
                  </Box>
                )}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {selectedRecord.channel === 'EMAIL' ? 'Body:' : 'Message:'}
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  {selectedRecord.channel === 'EMAIL' ? (
                    <Box 
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedRecord.body, 'email') }}
                      sx={{ '& *': { maxWidth: '100%' }, wordBreak: 'break-word' }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedRecord.body}
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};