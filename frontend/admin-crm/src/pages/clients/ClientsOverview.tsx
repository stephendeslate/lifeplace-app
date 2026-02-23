// Clients Overview - Flat design matching Analytics page style

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
  Alert,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FileUpload as ImportIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { ClientForm } from '../../components/clients/ClientForm';
import { clientsApi } from '../../apis/clients.api';
import { getClientRegistrationStatus, getClientActiveStatus } from '../../utils/clientStatus';
import type { Client, ClientFilters, CreateClientData } from '../../types/clients.types';
import { ModernPageLayout, ModernPageHeader, ModernEmptyState } from '../../components/common';

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
    setBreadcrumbs([{ label: 'Clients' }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchValue || undefined,
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
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value === 'true',
    }));
    setPage(0);
  };

  // Modern empty state when no clients exist
  const renderNoClientsState = () => (
    <ModernEmptyState
      icon={PeopleIcon}
      title="No Clients Yet"
      description="Start building your client base by adding individual clients or importing from your existing system."
      primaryAction={{
        label: 'Add First Client',
        onClick: () => setCreateDialogOpen(true),
        icon: <AddIcon />,
        color: 'primary',
      }}
      secondaryAction={{
        label: 'Import Clients',
        onClick: () => setImportDialogOpen(true),
        icon: <ImportIcon />,
      }}
      tip={{
        text: 'Import clients from your previous system to get started quickly with your existing client relationships.',
        type: 'info',
      }}
      size="large"
      color="primary"
    />
  );

  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);
  const filteredCount = totalClients ?? 0;

  // Loading state
  if (isLoadingClients) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Page Header - flat style */}
      <ModernPageHeader
        title="Clients"
        subtitle={`${filteredCount} client${filteredCount !== 1 ? 's' : ''} found`}
        icon={<PeopleIcon />}
        size="medium"
        primaryAction={{
          label: 'Add Client',
          icon: <AddIcon />,
          onClick: () => setCreateDialogOpen(true),
          variant: 'contained',
          color: 'primary',
        }}
        secondaryActions={[
          {
            label: 'Import',
            icon: <ImportIcon />,
            onClick: () => setImportDialogOpen(true),
            variant: 'outlined',
          },
          {
            label: 'Export',
            icon: <ExportIcon />,
            onClick: handleExport,
            variant: 'outlined',
          },
        ]}
      />

      {totalClients === 0 && !hasActiveFilters ? (
        renderNoClientsState()
      ) : (
        <>
          {/* Filters - flat style */}
          <Box sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                size="small"
                placeholder="Search clients..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ flex: 1, minWidth: 200 }}
              />

              <FormControl size="small" sx={{ minWidth: 140 }}>
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

              <FormControl size="small" sx={{ minWidth: 140 }}>
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
                  color="warning"
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
          </Box>

          {/* Clients Table - flat style */}
          <Box
            sx={{
              borderRadius: 1,
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Email</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      Company
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      Registration
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Joined</TableCell>
                    <TableCell width="50"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(clients) &&
                    clients.map((client) => {
                      const registrationStatus = getClientRegistrationStatus(client);
                      const activeStatus = getClientActiveStatus(client);

                      return (
                        <TableRow
                          key={client.id}
                          hover
                          onClick={() => handleRowClick(client)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {client.first_name} {client.last_name}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">
                              {client.email}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">
                              {client.profile?.company || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">
                              {client.profile?.phone || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={activeStatus.icon}
                              label={activeStatus.label}
                              color={
                                activeStatus.color === 'default' ? 'primary' : activeStatus.color
                              }
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Tooltip title={registrationStatus.tooltip}>
                              <Chip
                                icon={registrationStatus.icon}
                                label={registrationStatus.label}
                                color={
                                  registrationStatus.color === 'default'
                                    ? 'primary'
                                    : registrationStatus.color
                                }
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(client.date_joined).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, client)}>
                              <MoreVertIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalClients || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Box>
          </Box>
        </>
      )}

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedClient) navigate(`/clients/${selectedClient.id}`);
            handleMenuClose();
          }}
        >
          <PersonIcon sx={{ mr: 1.5 }} color="primary" />
          View Profile
        </MenuItem>
        {selectedClient && !selectedClient.has_account && (
          <MenuItem onClick={handleSendInvitation} disabled={isSendingInvitation}>
            <PersonAddIcon sx={{ mr: 1.5 }} color="success" />
            Send Invitation
          </MenuItem>
        )}
      </Menu>

      {/* Modern Create Client Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle color="primary">Add New Client</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ClientForm
            onSubmit={(data) => {
              createClient(data as CreateClientData, {
                onSuccess: () => setCreateDialogOpen(false),
              });
            }}
            isLoading={isCreatingClient}
          />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Clients</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Upload a CSV file with client data. Required columns: first_name, last_name, email
          </Alert>
          <Box
            component="input"
            type="file"
            accept=".csv"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
            sx={{
              width: '100%',
              p: 3,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'action.hover',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </ModernPageLayout>
  );
};
