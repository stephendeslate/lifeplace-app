// frontend/client-portal/src/components/communications/CommunicationHistory.tsx

import React, { useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
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
  Menu,
  useTheme,
  alpha,
} from '@mui/material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
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
  History as HistoryIcon,
  MarkEmailUnread as UnreadIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { sanitizeHTML } from '../../utils/security';
import type { CommunicationRecord, CommunicationFilters } from '../../types/communications.types';

export const CommunicationHistory: React.FC = () => {
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRecordForAction, setSelectedRecordForAction] = useState<CommunicationRecord | null>(null);

  const { useRecords, useMarkAsRead, useMarkAsUnread } = useCommunications();
  const { 
    data: records = [], 
    isLoading, 
    refetch,
    error 
  } = useRecords(filters);

  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();

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
    
    // Auto-mark as read when viewing details (for emails)
    if (record.channel === 'EMAIL' && !record.is_opened) {
      markAsReadMutation.mutate(record.id);
    }
  };


  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedRecordForAction(null);
  };

  const handleMarkAsRead = () => {
    if (selectedRecordForAction && !selectedRecordForAction.is_opened) {
      markAsReadMutation.mutate(selectedRecordForAction.id);
    }
    handleActionMenuClose();
  };

  const handleMarkAsUnread = () => {
    if (selectedRecordForAction && selectedRecordForAction.is_opened) {
      markAsUnreadMutation.mutate(selectedRecordForAction.id);
    }
    handleActionMenuClose();
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

  const theme = useTheme();

  if (isLoading) {
    return (
      <AnimatedElement animation="fadeIn">
        <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading communication history...
          </Typography>
        </GlassCard>
      </AnimatedElement>
    );
  }

  if (error) {
    return (
      <AnimatedElement animation="fadeIn">
        <GlassCard variant="light" intensity="medium" sx={{ p: 3 }}>
          <Alert 
            severity="error" 
            sx={{ 
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            Failed to load communication history. Please try again.
          </Alert>
        </GlassCard>
      </AnimatedElement>
    );
  }

  return (
    <Box>

      {/* Filters */}
      <AnimatedElement animation="slideUp" delay={200}>
        <GlassCard 
          variant="light" 
          intensity="medium" 
          sx={{ 
            mb: 4, 
            p: 3,
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search messages..."
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
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.category || 'all'}
                label="Type"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="SYSTEM">System</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
                <MenuItem value="AUTO">Automated</MenuItem>
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
              <IconButton 
                size="small" 
                onClick={() => refetch()} 
                title="Refresh"
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
                <RefreshIcon />
              </IconButton>
            </Box>
          </Stack>
        </GlassCard>
      </AnimatedElement>

      {/* Records Table */}
      {records.length === 0 ? (
        <AnimatedElement animation="fadeIn" delay={300}>
          <GlassCard 
            variant="light" 
            intensity="subtle" 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.grey[100], 0.3),
              border: `1px solid ${alpha('#fff', 0.2)}`,
            }}
          >
            <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Communication History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hasActiveFilters 
                ? 'No communications match your current filters.'
                : 'No communications have been sent to you yet.'
              }
            </Typography>
          </GlassCard>
        </AnimatedElement>
      ) : (
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard 
            variant="light" 
            intensity="medium"
            sx={{ 
              border: `1px solid ${alpha('#fff', 0.1)}`,
              overflow: 'hidden',
            }}
          >
            <TableContainer sx={{ backgroundColor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Subject/Template</TableCell>
                  <TableCell>Channel</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Content Preview</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell width="50"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getChannelIcon(record.channel)}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {record.subject || record.template_name}
                          </Typography>
                          {record.sent_by_name && (
                            <Typography variant="caption" color="text.secondary">
                              From: {record.sent_by_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.channel}
                        size="small"
                        variant="outlined"
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          backdropFilter: 'blur(5px)',
                          border: `1px solid ${alpha('#fff', 0.2)}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.category === 'SYSTEM' ? 'System' : record.category === 'AUTO' ? 'Auto' : 'Manual'}
                        size="small"
                        color={getCategoryColor(record.category) as 'primary' | 'secondary' | 'default'}
                        variant="outlined"
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          backdropFilter: 'blur(5px)',
                          border: `1px solid ${alpha('#fff', 0.2)}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {record.body.replace(/<[^>]*>/g, '').substring(0, 50)}...
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
                          label={record.is_opened ? 'Read' : record.delivery_status}
                          size="small"
                          color={getStatusColor(record.delivery_status) as 'success' | 'info' | 'warning' | 'error' | 'default'}
                          variant="outlined"
                          sx={{
                            backgroundColor: alpha('#fff', 0.1),
                            backdropFilter: 'blur(5px)',
                            border: `1px solid ${alpha('#fff', 0.2)}`,
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.sent_at 
                          ? new Date(record.sent_at).toLocaleDateString()
                          : 'Pending'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetail(record)}
                        title="View message"
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
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          </GlassCard>
        </AnimatedElement>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        onClick={handleActionMenuClose}
      >
        {selectedRecordForAction && !selectedRecordForAction.is_opened && (
          <MenuItem 
            onClick={handleMarkAsRead}
            disabled={markAsReadMutation.isPending}
          >
            <OpenedIcon sx={{ mr: 1 }} />
            Mark as Read
          </MenuItem>
        )}
        {selectedRecordForAction && selectedRecordForAction.is_opened && (
          <MenuItem 
            onClick={handleMarkAsUnread}
            disabled={markAsUnreadMutation.isPending}
          >
            <UnreadIcon sx={{ mr: 1 }} />
            Mark as Unread
          </MenuItem>
        )}
      </Menu>

      {/* Message Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: alpha('#fff', 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.2)}`,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>
          Message Details
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Stack spacing={3}>
              {/* Basic Info */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Message Information
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">From:</Typography>
                    <Typography variant="body2">{selectedRecord.sent_by_name || 'LifePlace System'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Template:</Typography>
                    <Typography variant="body2">{selectedRecord.template_name}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Channel:</Typography>
                    <Chip 
                      label={selectedRecord.channel} 
                      size="small" 
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        backdropFilter: 'blur(5px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                      }}
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Type:</Typography>
                    <Chip 
                      label={selectedRecord.category === 'SYSTEM' ? 'System' : selectedRecord.category === 'AUTO' ? 'Automated' : 'Manual'} 
                      size="small" 
                      color={getCategoryColor(selectedRecord.category) as 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        backdropFilter: 'blur(5px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                      }}
                    />
                  </Box>
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
                        label={selectedRecord.is_opened ? 'Read' : selectedRecord.delivery_status}
                        size="small" 
                        color={getStatusColor(selectedRecord.delivery_status) as 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          backdropFilter: 'blur(5px)',
                          border: `1px solid ${alpha('#fff', 0.2)}`,
                        }}
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
                      <Typography variant="body2" color="text.secondary">Read:</Typography>
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
                    <GlassCard 
                      variant="light" 
                      intensity="subtle" 
                      sx={{ 
                        p: 2, 
                        backgroundColor: alpha(theme.palette.grey[50], 0.3),
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                      }}
                    >
                      <Typography variant="body2">{selectedRecord.subject}</Typography>
                    </GlassCard>
                  </Box>
                )}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {selectedRecord.channel === 'EMAIL' ? 'Message:' : 'Text Message:'}
                </Typography>
                <GlassCard 
                  variant="light" 
                  intensity="subtle" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: alpha(theme.palette.grey[50], 0.3),
                    border: `1px solid ${alpha('#fff', 0.2)}`,
                    maxHeight: 400, 
                    overflow: 'auto'
                  }}
                >
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
                </GlassCard>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            variant="contained"
            onClick={() => setDetailDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};