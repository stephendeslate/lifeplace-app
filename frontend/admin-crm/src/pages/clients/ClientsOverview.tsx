// frontend/admin-crm/src/pages/clients/ClientsOverview.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
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
  TablePagination,
  TextField,
  Typography,
  CircularProgress,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { ClientForm } from '../../components/clients/ClientForm';
import { clientsApi } from '../../apis/clients.api';
import { getClientRegistrationStatus, getClientActiveStatus } from '../../utils/clientStatus';
import type { Client, ClientFilters, CreateClientData } from '../../types/clients.types';

export const ClientsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<ClientFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

  const {
    clients = [], // Add default empty array
    totalClients,
    isLoadingClients,
    createClient,
    isCreatingClient,
    sendInvitation,
    isSendingInvitation,
    importClients,
  } = useClients({
    ...filters,
    page: page + 1,
    page_size: rowsPerPage,
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Clients' },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchValue || undefined
      }));
      setPage(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleRowClick = (client: Client) => {
    navigate(`/clients/${client.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedClient(null);
  };

  const handleSendInvitation = () => {
    if (selectedClient) {
      sendInvitation(selectedClient.id);
    }
    handleMenuClose();
  };

  const handleExport = async () => {
    try {
      const blob = await clientsApi.exportClients(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = (file: File) => {
    importClients(file);
    setImportDialogOpen(false);
  };

  const handleFilterChange = (key: keyof ClientFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value === 'true'
    }));
    setPage(0);
  };

  // Empty state when no clients exist
  const renderNoClientsState = () => (
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
      <PersonIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Clients Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        Start building your client base by adding individual clients or importing from your existing system.
      </Typography>
      
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add First Client
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ImportIcon />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import Clients
        </Button>
      </Stack>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> Import clients from your previous system to get started quickly
      </Typography>
    </Paper>
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const filteredCount = totalClients ?? 0;

  if (isLoadingClients) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // @ts-ignore
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Clients
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredCount} client{filteredCount !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Client
          </Button>
        </Stack>
      </Box>

      {totalClients === 0 && !hasActiveFilters ? (
        renderNoClientsState()
      ) : (
        <>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search clients..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
                    label="Status"
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Inactive</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Registration</InputLabel>
                  <Select
                    value={filters.has_account === undefined ? 'all' : filters.has_account.toString()}
                    label="Registration"
                    onChange={(e) => handleFilterChange('has_account', e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="true">Registered</MenuItem>
                    <MenuItem value="false">Unregistered</MenuItem>
                  </Select>
                </FormControl>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      setFilters({});
                      setSearchValue('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Clients Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Registration</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell width="50"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(clients) && clients.map((client) => {
                    const registrationStatus = getClientRegistrationStatus(client);
                    const activeStatus = getClientActiveStatus(client);
                    
                    return (
                      <TableRow 
                        key={client.id} 
                        hover 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(client)}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon color="primary" />
                            <Typography variant="body2" fontWeight="medium">
                              {client.first_name} {client.last_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <EmailIcon color="action" fontSize="small" />
                            <Typography variant="body2">{client.email}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {client.profile?.company ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <BusinessIcon color="action" fontSize="small" />
                              <Typography variant="body2">{client.profile.company}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.profile?.phone ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <PhoneIcon color="action" fontSize="small" />
                              <Typography variant="body2">{client.profile.phone}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={activeStatus.icon}
                            label={activeStatus.label}
                            color={activeStatus.color}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={registrationStatus.tooltip}>
                            <Chip
                              icon={registrationStatus.icon}
                              label={registrationStatus.label}
                              color={registrationStatus.color}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(client.date_joined).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, client)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={totalClients || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Card>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedClient) navigate(`/clients/${selectedClient.id}`);
          handleMenuClose();
        }}>
          <PersonIcon sx={{ mr: 1 }} />
          View Profile
        </MenuItem>
        {selectedClient && !selectedClient.has_account && (
          <MenuItem onClick={handleSendInvitation} disabled={isSendingInvitation}>
            <PersonAddIcon sx={{ mr: 1 }} />
            Send Invitation
          </MenuItem>
        )}
      </Menu>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <ClientForm
            onSubmit={(data) => {
              // Type assertion since we know this is a create operation
              createClient(data as CreateClientData, {
                onSuccess: () => setCreateDialogOpen(false)
              });
            }}
            isLoading={isCreatingClient}
          />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Clients</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload a CSV file with client data. Required columns: first_name, last_name, email
          </Alert>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
            style={{ width: '100%', padding: '16px', border: '2px dashed #ccc', borderRadius: '8px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};