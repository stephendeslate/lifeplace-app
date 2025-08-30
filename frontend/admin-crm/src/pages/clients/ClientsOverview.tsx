// Modern Glassmorphic Clients Overview
// Enhanced with world-class design patterns while preserving full functionality

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
} from '@mui/material';
import {
  Add as AddIcon,
  FileUpload as ImportIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { ClientForm } from '../../components/clients/ClientForm';
import { clientsApi } from '../../apis/clients.api';
import { getClientRegistrationStatus, getClientActiveStatus } from '../../utils/clientStatus';
import type { Client, ClientFilters, CreateClientData } from '../../types/clients.types';

// Modern Design System Components
import {
  ModernOverviewLayout,
  ModernOverviewHeader,
  ModernGlassCard,
  ModernEmptyState,
  ModernTableSkeleton,
  createAddAction,
  createExportAction,
} from '../../components/common';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

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

  // Modern empty state when no clients exist
  const renderNoClientsState = () => (
    <ModernEmptyState
      icon={PeopleIcon}
      title="No Clients Yet"
      description="Start building your client base by adding individual clients or importing from your existing system."
      primaryAction={{
        label: "Add First Client",
        onClick: () => setCreateDialogOpen(true),
        icon: <AddIcon />,
        color: 'primary'
      }}
      secondaryAction={{
        label: "Import Clients",
        onClick: () => setImportDialogOpen(true),
        icon: <ImportIcon />
      }}
      tip={{
        text: "Import clients from your previous system to get started quickly with your existing client relationships.",
        type: 'info'
      }}
      size="large"
      color="primary"
      illustration="gradient"
    />
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const filteredCount = totalClients ?? 0;

  // Loading state with modern skeleton
  if (isLoadingClients) {
    return (
      <ModernOverviewLayout>
        <ModernOverviewHeader
          title="Clients"
          subtitle="Loading client data..."
          icon={<PeopleIcon />}
        />
        <ModernTableSkeleton 
          rows={8} 
          columns={7}
        />
      </ModernOverviewLayout>
    );
  }

  // @ts-expect-error - Type compatibility issue requiring attention
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <ModernOverviewLayout>
      {/* Modern Header */}
      <ModernOverviewHeader
        title="Clients"
        subtitle={`${filteredCount} client${filteredCount !== 1 ? 's' : ''} found`}
        icon={<PeopleIcon />}
        primaryAction={createAddAction('Add Client', () => setCreateDialogOpen(true))}
        secondaryActions={[
          {
            icon: <ImportIcon />,
            label: 'Import',
            variant: 'outlined',
            onClick: () => setImportDialogOpen(true),
            color: 'secondary'
          },
          createExportAction(handleExport)
        ]}
        stats={[
          { label: 'Total Clients', value: filteredCount },
          { 
            label: 'Active', 
            value: clients?.filter(c => getClientActiveStatus(c).label === 'Active').length || 0
          },
          { 
            label: 'Registered', 
            value: clients?.filter(c => c.has_account).length || 0
          }
        ]}
      />

      {totalClients === 0 && !hasActiveFilters ? (
        renderNoClientsState()
      ) : (
        <>
          {/* Modern Filters Card */}
          <ModernGlassCard 
            size="medium" 
            sx={{ 
              mb: 4,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}03 0%, ${tokens.color.success[500]}02 100%)`,
                borderRadius: tokens.spacing.radius.xxl,
                pointerEvents: 'none',
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search clients..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ 
                    flex: 1, 
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      borderRadius: tokens.spacing.radius.full,
                      transition: createTransition(['border-color', 'box-shadow'], 'fast'),
                      
                      '&:hover': {
                        border: `1px solid ${tokens.color.primary[500]}40`,
                      },
                      
                      '&.Mui-focused': {
                        ...glassPresets.medium,
                        border: `1px solid ${tokens.color.primary[500]}60`,
                        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}10`,
                      }
                    }
                  }}
                />
                
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
                    label="Status"
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        borderRadius: tokens.spacing.radius.lg,
                      }
                    }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        borderRadius: tokens.spacing.radius.lg,
                      }
                    }}
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
                    sx={{
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.warning[500]}30`,
                      color: tokens.color.warning[600],
                      borderRadius: tokens.spacing.radius.full,
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        border: `1px solid ${tokens.color.warning[500]}50`,
                      }
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </Box>
          </ModernGlassCard>

          {/* Modern Clients Table Card */}
            <ModernGlassCard 
              size="medium"
              sx={{
                position: 'relative',
                overflow: 'hidden',
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}02 0%, ${tokens.color.success[500]}01 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <TableContainer 
                  sx={{
                    '& .MuiTable-root': {
                      '& .MuiTableHead-root': {
                        '& .MuiTableCell-head': {
                          backgroundColor: 'transparent',
                          borderBottom: `1px solid ${tokens.color.borders.glass}`,
                          fontWeight: 600,
                          color: tokens.color.neutral[700],
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          py: 2,
                        }
                      },
                      
                      '& .MuiTableBody-root': {
                        '& .MuiTableRow-root': {
                          transition: createTransition(['background-color', 'transform'], 'fast'),
                          cursor: 'pointer',
                          
                          '&:hover': {
                            backgroundColor: `${tokens.color.primary[50]}40`,
                            transform: 'translateY(-1px)',
                            
                            '& .action-button': {
                              opacity: 1,
                              transform: 'scale(1)',
                            }
                          },
                          
                          '& .MuiTableCell-body': {
                            borderBottom: `1px solid ${tokens.color.borders.subtle}`,
                            py: 2,
                            fontSize: '0.875rem',
                          }
                        }
                      }
                    }
                  }}
                >
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
                            <TableRow key={client.id} 
                              hover 
                              onClick={() => handleRowClick(client)}
                              sx={{
                                '&:last-child .MuiTableCell-body': {
                                  borderBottom: 'none',
                                }
                              }}
                            >
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <Box
                                    sx={{
                                      ...glassPresets.light,
                                      borderRadius: '50%',
                                      p: 1,
                                      border: `1px solid ${tokens.color.primary[500]}20`,
                                      background: `${tokens.color.primary[50]}60`,
                                    }}
                                  >
                                    <PersonIcon 
                                      sx={{ 
                                        fontSize: 18,
                                        color: tokens.color.primary[600] 
                                      }} 
                                    />
                                  </Box>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight="600"
                                    sx={{ color: tokens.color.neutral[800] }}
                                  >
                                    {client.first_name} {client.last_name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <EmailIcon 
                                    sx={{ 
                                      fontSize: 16,
                                      color: tokens.color.neutral[500] 
                                    }} 
                                  />
                                  <Typography 
                                    variant="body2"
                                    sx={{ color: tokens.color.neutral[600] }}
                                  >
                                    {client.email}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {client.profile?.company ? (
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <BusinessIcon 
                                      sx={{ 
                                        fontSize: 16,
                                        color: tokens.color.neutral[500] 
                                      }} 
                                    />
                                    <Typography 
                                      variant="body2"
                                      sx={{ color: tokens.color.neutral[600] }}
                                    >
                                      {client.profile.company}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ color: tokens.color.neutral[400] }}
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {client.profile?.phone ? (
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <PhoneIcon 
                                      sx={{ 
                                        fontSize: 16,
                                        color: tokens.color.neutral[500] 
                                      }} 
                                    />
                                    <Typography 
                                      variant="body2"
                                      sx={{ color: tokens.color.neutral[600] }}
                                    >
                                      {client.profile.phone}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ color: tokens.color.neutral[400] }}
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={activeStatus.icon}
                                  label={activeStatus.label}
                                  color={activeStatus.color === 'default' ? 'primary' : activeStatus.color}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    ...glassPresets.light,
                                    border: `1px solid ${tokens.color[activeStatus.color === 'default' ? 'primary' : activeStatus.color][500]}30`,
                                    fontWeight: 600,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title={registrationStatus.tooltip}>
                                  <Chip
                                    icon={registrationStatus.icon}
                                    label={registrationStatus.label}
                                    color={registrationStatus.color === 'default' ? 'primary' : registrationStatus.color}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      ...glassPresets.light,
                                      border: `1px solid ${tokens.color[registrationStatus.color === 'default' ? 'primary' : registrationStatus.color][500]}30`,
                                      fontWeight: 600,
                                    }}
                                  />
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ color: tokens.color.neutral[500] }}
                                >
                                  {new Date(client.date_joined).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleMenuOpen(e, client)}
                                  className="action-button"
                                  sx={{
                                    ...glassPresets.light,
                                    border: `1px solid ${tokens.color.borders.glass}`,
                                    opacity: 0.7,
                                    transform: 'scale(0.9)',
                                    transition: createTransition(['opacity', 'transform', 'background'], 'fast'),
                                    
                                    '&:hover': {
                                      ...glassPresets.medium,
                                      opacity: 1,
                                      transform: 'scale(1)',
                                    }
                                  }}
                                >
                                  <MoreVertIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Modern Pagination */}
                <Box 
                  sx={{
                    p: 2,
                    borderTop: `1px solid ${tokens.color.borders.glass}`,
                    background: `linear-gradient(135deg, ${tokens.color.neutral[50]}40 0%, ${tokens.color.primary[50]}10 100%)`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalClients || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      '& .MuiTablePagination-toolbar': {
                        color: tokens.color.neutral[600],
                        fontSize: '0.875rem',
                      },
                      
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontWeight: 500,
                      },
                      
                      '& .MuiIconButton-root': {
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        borderRadius: tokens.spacing.radius.sm,
                        mx: 0.25,
                        
                        '&:hover': {
                          ...glassPresets.medium,
                        },
                        
                        '&.Mui-disabled': {
                          opacity: 0.4,
                        }
                      }
                    }}
                  />
                </Box>
              </Box>
            </ModernGlassCard>
        </>
      )}

      {/* Modern Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.lg,
            mt: 1,
            minWidth: 180,
            
            '& .MuiMenuItem-root': {
              borderRadius: tokens.spacing.radius.md,
              mx: 1,
              my: 0.5,
              transition: createTransition(['background-color'], 'fast'),
              
              '&:hover': {
                backgroundColor: `${tokens.color.primary[50]}60`,
              }
            }
          }
        }}
      >
        <MenuItem 
          onClick={() => {
            if (selectedClient) navigate(`/clients/${selectedClient.id}`);
            handleMenuClose();
          }}
          sx={{ fontWeight: 500 }}
        >
          <PersonIcon sx={{ mr: 1.5, color: tokens.color.primary[600] }} />
          View Profile
        </MenuItem>
        {selectedClient && !selectedClient.has_account && (
          <MenuItem 
            onClick={handleSendInvitation} 
            disabled={isSendingInvitation}
            sx={{ fontWeight: 500 }}
          >
            <PersonAddIcon sx={{ mr: 1.5, color: tokens.color.success[600] }} />
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
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xxl,
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.success[500]}04 100%)`,
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
            fontSize: '1.5rem',
            pb: 2
          }}
        >
          Add New Client
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
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

      {/* Modern Import Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xxl,
            background: `linear-gradient(135deg, ${tokens.color.secondary[500]}06 0%, ${tokens.color.info[500]}04 100%)`,
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.secondary[600]} 0%, ${tokens.color.secondary[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
            fontSize: '1.5rem',
            pb: 2
          }}
        >
          Import Clients
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3,
              ...glassPresets.light,
              border: `1px solid ${tokens.color.info[500]}30`,
              borderRadius: tokens.spacing.radius.lg,
            }}
          >
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
              border: `2px dashed ${tokens.color.borders.glass}`,
              borderRadius: tokens.spacing.radius.xl,
              background: `linear-gradient(135deg, ${tokens.color.neutral[50]}60 0%, ${tokens.color.primary[50]}20 100%)`,
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              transition: createTransition(['border-color', 'background'], 'fast'),
              
              '&:hover': {
                borderColor: tokens.color.primary[500],
                background: `linear-gradient(135deg, ${tokens.color.primary[50]}40 0%, ${tokens.color.primary[100]}20 100%)`,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setImportDialogOpen(false)}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.borders.glass}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              
              '&:hover': {
                ...glassPresets.medium,
              }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </ModernOverviewLayout>
  );
};