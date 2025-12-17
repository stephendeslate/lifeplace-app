// frontend/admin-crm/src/components/events/EventCommunications.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  CheckCircle as DeliveredIcon,
  Error as FailedIcon,
  Schedule as PendingIcon,
  Mail as MailOpenIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useCommunications } from '../../hooks/useCommunications';
import { sanitizeHTML } from '../../utils/security';
import { SendMessageDialog } from '../communications/SendMessageDialog';
import type { CommunicationRecord } from '../../types/communications.types';
import type { Event } from '../../types/events.types';

interface EventCommunicationsProps {
  event: Event;
  clientId: number;
  clientEmail: string;
  clientName: string;
}

export const EventCommunications: React.FC<EventCommunicationsProps> = ({
  event,
  clientId,
  clientEmail,
  clientName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'EMAIL' | 'SMS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { useRecords } = useCommunications();
  const {
    data: communications = [],
    isLoading,
    refetch
  } = useRecords({
    event_id: event.id,
    channel: channelFilter === 'ALL' ? undefined : channelFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter as 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED'
  });

  // Filter communications by search term
  const filteredCommunications = communications.filter(comm => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      comm.subject?.toLowerCase().includes(searchLower) ||
      comm.template_name.toLowerCase().includes(searchLower) ||
      comm.body.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <DeliveredIcon fontSize="small" color="success" />;
      case 'FAILED':
      case 'BOUNCED':
        return <FailedIcon fontSize="small" color="error" />;
      case 'SENT':
        return <MailOpenIcon fontSize="small" color="info" />;
      default:
        return <PendingIcon fontSize="small" color="disabled" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'FAILED':
      case 'BOUNCED':
        return 'error';
      case 'SENT':
        return 'info';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? 
      <EmailIcon fontSize="small" color="primary" /> : 
      <SmsIcon fontSize="small" color="secondary" />;
  };

  const handleViewDetails = (record: CommunicationRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Communications History ({filteredCommunications.length})
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setSendDialogOpen(true)}
          >
            Send Message
          </Button>
          <IconButton onClick={() => refetch()} size="small">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            placeholder="Search communications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Channel</InputLabel>
            <Select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'ALL' | 'EMAIL' | 'SMS')}
              label="Channel"
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="EMAIL">Email</MenuItem>
              <MenuItem value="SMS">SMS</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              <MenuItem value="BOUNCED">Bounced</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Communications Table */}
      {filteredCommunications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EmailIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Communications Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {searchTerm || channelFilter !== 'ALL' || statusFilter !== 'ALL' 
              ? 'No communications match your filters'
              : 'Start by sending your first message to the client'}
          </Typography>
          {(searchTerm || channelFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button 
              onClick={() => {
                setSearchTerm('');
                setChannelFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date/Time</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCommunications.map((comm) => (
                <TableRow key={comm.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(comm.created_at), 'MMM d, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(comm.created_at), 'h:mm a')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getChannelIcon(comm.channel)}
                      <Typography variant="body2">{comm.channel}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{comm.template_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {comm.subject || '(No subject)'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getStatusIcon(comm.delivery_status)}
                      <Chip 
                        label={comm.delivery_status} 
                        size="small"
                        color={getStatusColor(comm.delivery_status)}
                        variant="outlined"
                      />
                      {comm.is_opened && (
                        <Tooltip title={`Opened at ${format(new Date(comm.opened_at!), 'MMM d, h:mm a')}`}>
                          <MailOpenIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(comm)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        client={{
          id: clientId,
          email: clientEmail,
          first_name: clientName.split(' ')[0] || '',
          last_name: clientName.split(' ').slice(1).join(' ') || '',
          date_joined: '',
          is_active: true,
          has_account: false
        }}
        eventId={event.id}
      />

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRecord && (
          <>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Communication Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Template
                  </Typography>
                  <Typography>{selectedRecord.template_name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Channel
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getChannelIcon(selectedRecord.channel)}
                    <Typography>{selectedRecord.channel}</Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getStatusIcon(selectedRecord.delivery_status)}
                    <Chip 
                      label={selectedRecord.delivery_status} 
                      size="small"
                      color={getStatusColor(selectedRecord.delivery_status)}
                    />
                  </Stack>
                </Box>
                {selectedRecord.subject && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Subject
                    </Typography>
                    <Typography>{selectedRecord.subject}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Message Body
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedRecord.body, 'email') }}
                    />
                  </Paper>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sent
                  </Typography>
                  <Typography>
                    {format(new Date(selectedRecord.created_at), 'MMMM d, yyyy h:mm a')}
                  </Typography>
                </Box>
                {selectedRecord.delivered_at && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Delivered
                    </Typography>
                    <Typography>
                      {format(new Date(selectedRecord.delivered_at), 'MMMM d, yyyy h:mm a')}
                    </Typography>
                  </Box>
                )}
                {selectedRecord.is_opened && selectedRecord.opened_at && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Opened
                    </Typography>
                    <Typography>
                      {format(new Date(selectedRecord.opened_at), 'MMMM d, yyyy h:mm a')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
};