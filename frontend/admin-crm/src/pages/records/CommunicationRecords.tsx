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
  Select,
  FormControl,
  InputLabel,
  TablePagination,
  Tooltip,
  Button,
  Stack,
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';

// Mock data interface
interface CommunicationRecord {
  id: string;
  type: 'email' | 'sms' | 'phone' | 'video_call';
  direction: 'inbound' | 'outbound';
  recipient: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  content: string;
  status: 'delivered' | 'pending' | 'failed' | 'read';
  timestamp: string;
  duration?: number; // For calls in seconds
  attachments?: number;
}

// Mock data
const mockRecords: CommunicationRecord[] = [
  {
    id: '1',
    type: 'email',
    direction: 'outbound',
    recipient: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
    },
    subject: 'Welcome to LifePlace - Getting Started Guide',
    content: 'Thank you for choosing LifePlace for your wellness journey...',
    status: 'read',
    timestamp: '2024-01-15T10:30:00Z',
    attachments: 2,
  },
  {
    id: '2',
    type: 'sms',
    direction: 'outbound',
    recipient: {
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
    },
    subject: 'Appointment Reminder',
    content: 'Hi Michael, this is a reminder for your appointment tomorrow at 2 PM.',
    status: 'delivered',
    timestamp: '2024-01-15T09:15:00Z',
  },
  {
    id: '3',
    type: 'phone',
    direction: 'inbound',
    recipient: {
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@email.com',
    },
    subject: 'Consultation Call',
    content: 'Client called for consultation about wellness program options.',
    status: 'delivered',
    timestamp: '2024-01-14T14:45:00Z',
    duration: 1800, // 30 minutes
  },
  {
    id: '4',
    type: 'email',
    direction: 'inbound',
    recipient: {
      name: 'David Wilson',
      email: 'david.wilson@email.com',
    },
    subject: 'Question about Package Options',
    content: 'Hi, I have some questions about the wellness packages you offer...',
    status: 'delivered',
    timestamp: '2024-01-14T11:20:00Z',
  },
  {
    id: '5',
    type: 'video_call',
    direction: 'outbound',
    recipient: {
      name: 'Lisa Thompson',
      email: 'lisa.thompson@email.com',
    },
    subject: 'Virtual Consultation',
    content: 'Scheduled video consultation for wellness assessment.',
    status: 'delivered',
    timestamp: '2024-01-13T16:00:00Z',
    duration: 2700, // 45 minutes
  },
];

export const CommunicationRecords: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  // @ts-ignore
  const [records, setRecords] = useState<CommunicationRecord[]>(mockRecords);
  const [filteredRecords, setFilteredRecords] = useState<CommunicationRecord[]>(mockRecords);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Records', path: '/records' },
    ]);
  }, [setBreadcrumbs]);

  // Filter records based on search and filters
  useEffect(() => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        record =>
          record.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => record.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter(record => record.direction === directionFilter);
    }

    setFilteredRecords(filtered);
    setPage(0); // Reset to first page when filters change
  }, [searchTerm, typeFilter, statusFilter, directionFilter, records]);

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'sms':
        return <SmsIcon fontSize="small" />;
      case 'phone':
        return <PhoneIcon fontSize="small" />;
      case 'video_call':
        return <VideoCallIcon fontSize="small" />;
      default:
        return <EmailIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'read':
        return 'info';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // @ts-ignore
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedRecords = filteredRecords.slice(
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
              {records.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Delivered Today
            </Typography>
            <Typography variant="h4" component="div" color="success.main">
              12
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Read Rate
            </Typography>
            <Typography variant="h4" component="div" color="info.main">
              85%
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
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                  <MenuItem value="video_call">Video Call</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Direction</InputLabel>
                <Select
                  value={directionFilter}
                  label="Direction"
                  onChange={(e) => setDirectionFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="inbound">Inbound</MenuItem>
                  <MenuItem value="outbound">Outbound</MenuItem>
                </Select>
              </FormControl>
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
                <TableCell>Type</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRecords.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCommunicationIcon(record.type)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {record.type.replace('_', ' ')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.direction}
                      size="small"
                      variant="outlined"
                      color={record.direction === 'inbound' ? 'primary' : 'secondary'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {record.recipient.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {record.recipient.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.recipient.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 250 }}>
                      {record.subject}
                    </Typography>
                    {record.attachments && (
                      <Typography variant="caption" color="text.secondary">
                        {record.attachments} attachment{record.attachments > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      size="small"
                      color={getStatusColor(record.status) as any}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(record.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {record.duration ? (
                      <Typography variant="body2">
                        {formatDuration(record.duration)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
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
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </Box>
  );
};