// frontend/admin-crm/src/pages/settings/account/AdminUsers.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Menu,
  MenuItem,
  Alert,
  Divider,
  Stack,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  PersonAdd as PersonAddIcon,
  Visibility as ViewIcon,
  Person,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAdminUsers } from '../../../hooks/useSettings';
import { useCommunications } from '../../../hooks/useCommunications';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import type { InviteAdminFormData, AdminUser, AdminInvitation } from '../../../types/settings.types';

export const AdminUsers: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewRecordsDialogOpen, setViewRecordsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<AdminInvitation | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = useState<'user' | 'invitation'>('user');
  const [searchQuery, setSearchQuery] = useState('');

  const [inviteForm, setInviteForm] = useState<InviteAdminFormData>({
    email: '',
    first_name: '',
    last_name: '',
  });

  const {
    adminUsers,
    invitations,
    isLoadingAdminUsers,
    isLoadingInvitations,
    isCreatingInvitation,
    isDeletingInvitation,
    isDeletingUser,
    createInvitation,
    deleteInvitation,
    deleteAdminUser,
  } = useAdminUsers();

  const { useRecords } = useCommunications();

  // Get communication records for admin invitations
  const { data: communicationRecords } = useRecords({
    template_name: 'Admin Invitation'
  });

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Account Management' },
      { label: 'Admin Users' },
    ]);
  }, [setBreadcrumbs]);

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateNew = () => {
    setInviteDialogOpen(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitation(inviteForm, {
      onSuccess: () => {
        setInviteDialogOpen(false);
        setInviteForm({ email: '', first_name: '', last_name: '' });
      },
    });
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    type: 'user' | 'invitation',
    item: AdminUser | AdminInvitation
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuType(type);
    if (type === 'user') {
      setSelectedUser(item as AdminUser);
    } else {
      setSelectedInvitation(item as AdminInvitation);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
    setSelectedInvitation(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleViewRecordsClick = () => {
    setViewRecordsDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (menuType === 'user' && selectedUser) {
      deleteAdminUser(selectedUser.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        },
      });
    } else if (menuType === 'invitation' && selectedInvitation) {
      deleteInvitation(selectedInvitation.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedInvitation(null);
        },
      });
    }
  };

  const getInvitationStatus = (invitation: AdminInvitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (invitation.is_accepted) {
      return { label: 'Accepted', color: 'success' as const };
    } else if (now > expiresAt) {
      return { label: 'Expired', color: 'error' as const };
    } else {
      return { label: 'Pending', color: 'warning' as const };
    }
  };

  const getInvitationRecord = (invitation: AdminInvitation) => {
    return communicationRecords?.find(record => 
      record.recipient === invitation.email && 
      record.template_name === 'Admin Invitation'
    );
  };


  // Modern header actions
  const getHeaderActions = () => {
    return [
      createAddAction('Invite Admin', handleCreateNew, 'primary'),
      createRefreshAction(handleRefresh),
    ];
  };

  // Filter data based on search
  const filteredAdminUsers = adminUsers.filter(user => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.profile?.company || '').toLowerCase().includes(searchLower)
    );
  });

  const filteredInvitations = invitations.filter(invitation => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      invitation.first_name.toLowerCase().includes(searchLower) ||
      invitation.last_name.toLowerCase().includes(searchLower) ||
      invitation.email.toLowerCase().includes(searchLower)
    );
  });

  const isLoading = isLoadingAdminUsers || isLoadingInvitations;

  if (isLoading) {
    return (
      <ModernSettingsLayout>
        <ModernCard
          variant="glass"
          size="large"
          animation="none"
        >
          <ModernLoadingStates.ModernTableSkeleton
            rows={5}
            columns={6}
          />
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  const totalUsers = adminUsers.length + invitations.length;

  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Admin Users"
        subtitle="Manage administrator accounts and invitations"
        icon={<AdminIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Account Management' },
          { label: 'Admin Users' },
        ]}
        primaryAction={getHeaderActions().find(a => a.label === 'Invite Admin')}
        secondaryActions={getHeaderActions().filter(a => a.label !== 'Invite Admin')}
        stats={[
          { label: 'Total Users', value: totalUsers },
          { label: 'Active Users', value: adminUsers.length },
          { label: 'Pending Invites', value: invitations.length },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Search and Filters */}
      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{ mb: 4 }}
      >
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="Search users and invitations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.lg,
                border: `1px solid ${tokens.color.borders.glass}`,
                '&:hover': {
                  border: `1px solid ${tokens.color.primary[300]}`,
                },
                '&.Mui-focused': {
                  border: `1px solid ${tokens.color.primary[500]}`,
                  boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </ModernCard>

      {/* Main Content */}
      {totalUsers === 0 ? (
        <ModernCard
          variant="glass"
          size="large"
          animation="none"
        >
          <ModernEmptyState
            icon={AdminIcon}
            title="No Admin Users Yet"
            description="Start building your admin team by inviting other administrators to help manage your LifePlace account."
            primaryAction={{
              label: 'Invite Your First Admin',
              onClick: handleCreateNew,
              icon: <PersonAddIcon />,
              color: 'primary',
            }}
            tip={{
              text: 'Invited admins will receive an email with instructions to set up their account',
              type: 'info',
            }}
            size="medium"
            illustration="gradient"
          />
        </ModernCard>
      ) : (
        <Stack spacing={4}>
          {/* Active Admin Users */}
          {filteredAdminUsers.length > 0 && (
            <ModernCard
              variant="glass"
              size="large"
              animation="none"
              title={`Active Administrators (${filteredAdminUsers.length})`}
              sx={{
                overflow: 'visible',
                position: 'relative',
              }}
            >
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Company</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Joined</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Status</TableCell>
                      <TableCell width="50"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAdminUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        hover
                        sx={{
                          '&:hover': {
                            background: `${tokens.color.primary[50]}50`,
                          }
                        }}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <AdminIcon sx={{ color: tokens.color.primary[600] }} />
                            <Typography variant="body2" fontWeight="medium" sx={{ color: tokens.color.neutral[800] }}>
                              {user.first_name} {user.last_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: tokens.color.neutral[700] }}>{user.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                            {user.profile?.company || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                            {new Date(user.date_joined).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.is_active ? 'Active' : 'Inactive'} 
                            color={user.is_active ? 'success' : 'default'}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              ...(user.is_active && {
                                background: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[600]} 100%)`,
                                color: 'white',
                              }),
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, 'user', user)}
                            sx={{
                              '&:hover': {
                                background: `${tokens.color.primary[500]}15`,
                              }
                            }}
                          >
                            <MoreVertIcon sx={{ color: tokens.color.neutral[600] }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ModernCard>
          )}

          {/* Pending Invitations */}
          {filteredInvitations.length > 0 && (
            <ModernCard
              variant="glass"
              size="large"
              animation="none"
              title={`Pending Invitations (${filteredInvitations.length})`}
              sx={{
                overflow: 'visible',
                position: 'relative',
              }}
            >
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Invited By</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Sent</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.color.neutral[700] }}>Email Status</TableCell>
                      <TableCell width="50"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredInvitations.map((invitation) => {
                      const status = getInvitationStatus(invitation);
                      const record = getInvitationRecord(invitation);
                      
                      return (
                        <TableRow 
                          key={invitation.id} 
                          hover
                          sx={{
                            '&:hover': {
                              background: `${tokens.color.warning[50]}50`,
                            }
                          }}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <PersonAddIcon sx={{ color: tokens.color.warning[600] }} />
                              <Typography variant="body2" fontWeight="medium" sx={{ color: tokens.color.neutral[800] }}>
                                {invitation.first_name} {invitation.last_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: tokens.color.neutral[700] }}>{invitation.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                              {invitation.invited_by}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                              {new Date(invitation.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={status.label} 
                              color={status.color}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                ...(status.color === 'success' && {
                                  background: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[600]} 100%)`,
                                  color: 'white',
                                }),
                                ...(status.color === 'error' && {
                                  background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
                                  color: 'white',
                                }),
                                ...(status.color === 'warning' && {
                                  background: `linear-gradient(135deg, ${tokens.color.warning[500]} 0%, ${tokens.color.warning[600]} 100%)`,
                                  color: 'white',
                                }),
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {record ? (
                              <Tooltip title={`${record.delivery_status} - Click to view details`}>
                                <Chip 
                                  label={record.delivery_status}
                                  size="small"
                                  color={record.delivery_status === 'DELIVERED' ? 'success' : 
                                         record.delivery_status === 'FAILED' ? 'error' : 'warning'}
                                  variant="outlined"
                                  clickable
                                  onClick={() => handleViewRecordsClick()}
                                  sx={{
                                    fontWeight: 600,
                                    '&:hover': {
                                      background: `${record.delivery_status === 'DELIVERED' 
                                        ? tokens.color.success[500] 
                                        : record.delivery_status === 'FAILED' 
                                        ? tokens.color.error[500] 
                                        : tokens.color.warning[500]}15`,
                                    }
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <Chip 
                                label="No record" 
                                size="small" 
                                variant="outlined"
                                sx={{ fontWeight: 600, color: tokens.color.neutral[500] }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, 'invitation', invitation)}
                              sx={{
                                '&:hover': {
                                  background: `${tokens.color.warning[500]}15`,
                                }
                              }}
                            >
                              <MoreVertIcon sx={{ color: tokens.color.neutral[600] }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </ModernCard>
          )}

          {/* Communication Tracking Alert */}
          {communicationRecords && communicationRecords.length > 0 && (
            <ModernCard
              variant="glass"
              color="primary"
              size="medium"
              animation="none"
              sx={{
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.info[500]}08 0%, ${tokens.color.info[600]}06 100%)`,
                },
              }}
            >
              <Alert 
                severity="info" 
                icon={<EmailIcon />}
                sx={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  '& .MuiAlert-message': {
                    color: tokens.color.info[700],
                  },
                  '& .MuiAlert-icon': {
                    color: tokens.color.info[600],
                  },
                }}
              >
                <Typography variant="body2">
                  <strong>Email Tracking:</strong> Admin invitation emails are now tracked through the communication system. 
                  You can view delivery status and open rates for each invitation above.
                </Typography>
              </Alert>
            </ModernCard>
          )}
        </Stack>
      )}

      {/* Invite Dialog */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => setInviteDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <PersonAddIcon sx={{ color: tokens.color.primary[600] }} />
          Invite Admin User
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: tokens.color.neutral[600],
              mb: 3,
            }}
          >
            Enter the details for the new administrator. They will receive an invitation email with instructions to set up their account.
          </Typography>
          
          <Box component="form" onSubmit={handleInviteSubmit}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                  disabled={isCreatingInvitation}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      '&:hover': {
                        border: `1px solid ${tokens.color.primary[300]}`,
                      },
                      '&.Mui-focused': {
                        border: `1px solid ${tokens.color.primary[500]}`,
                        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: tokens.color.primary[600] }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                  disabled={isCreatingInvitation}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      '&:hover': {
                        border: `1px solid ${tokens.color.primary[300]}`,
                      },
                      '&.Mui-focused': {
                        border: `1px solid ${tokens.color.primary[500]}`,
                        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: tokens.color.primary[600] }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={isCreatingInvitation}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    '&:hover': {
                      border: `1px solid ${tokens.color.primary[300]}`,
                    },
                    '&.Mui-focused': {
                      border: `1px solid ${tokens.color.primary[500]}`,
                      boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: tokens.color.primary[600] }} />
                    </InputAdornment>
                  ),
                }}
              />
              
              <ModernCard
                variant="glass"
                color="primary"
                size="small"
                animation="none"
                sx={{
                  '&::before': {
                    background: `linear-gradient(135deg, ${tokens.color.info[500]}08 0%, ${tokens.color.info[600]}06 100%)`,
                  },
                }}
              >
                <Alert 
                  severity="info"
                  sx={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    '& .MuiAlert-message': {
                      color: tokens.color.info[700],
                    },
                    '& .MuiAlert-icon': {
                      color: tokens.color.info[600],
                    },
                  }}
                >
                  An invitation email will be sent to this address with instructions to set up their admin account.
                </Alert>
              </ModernCard>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setInviteDialogOpen(false)}
            disabled={isCreatingInvitation}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              '&:hover': {
                ...glassPresets.medium,
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInviteSubmit}
            variant="contained" 
            disabled={isCreatingInvitation}
            startIcon={isCreatingInvitation ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
              borderRadius: tokens.spacing.radius.full,
              px: 4,
              py: 1.25,
              boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
              },
            }}
          >
            {isCreatingInvitation ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {menuType === 'invitation' && (
          <MenuItem onClick={handleViewRecordsClick}>
            <ViewIcon sx={{ mr: 1 }} />
            View Email Status
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          {menuType === 'user' ? 'Deactivate User' : 'Cancel Invitation'}
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          {menuType === 'user' ? 'Deactivate Admin User' : 'Cancel Invitation'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography sx={{ color: tokens.color.neutral[700], mb: 2 }}>
            Are you sure you want to {menuType === 'user' ? 'deactivate' : 'cancel'}{' '}
            {menuType === 'user' 
              ? `${selectedUser?.first_name} ${selectedUser?.last_name}`
              : `the invitation for ${selectedInvitation?.first_name} ${selectedInvitation?.last_name}`
            }?
          </Typography>
          {(selectedUser || selectedInvitation) && (
            <ModernCard
              variant="glass"
              color="error"
              size="small"
              animation="none"
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Name:</strong> {selectedUser 
                  ? `${selectedUser.first_name} ${selectedUser.last_name}`
                  : `${selectedInvitation?.first_name} ${selectedInvitation?.last_name}`
                }
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Email:</strong> {selectedUser?.email || selectedInvitation?.email}
              </Typography>
            </ModernCard>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeletingUser || isDeletingInvitation}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              '&:hover': {
                ...glassPresets.medium,
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error" 
            variant="contained"
            disabled={isDeletingUser || isDeletingInvitation}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
              borderRadius: tokens.spacing.radius.full,
              px: 4,
              boxShadow: `0 8px 32px ${tokens.color.error[500]}25`,
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100%)`,
                boxShadow: `0 12px 40px ${tokens.color.error[500]}35`,
              },
            }}
          >
            {(isDeletingUser || isDeletingInvitation) ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              menuType === 'user' ? 'Deactivate' : 'Cancel Invitation'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Communication Records Dialog */}
      <Dialog 
        open={viewRecordsDialogOpen} 
        onClose={() => setViewRecordsDialogOpen(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          },
        }}
      >
        <DialogTitle
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.info[600]} 0%, ${tokens.color.info[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          Email Communication Status
        </DialogTitle>
        <DialogContent>
          {selectedInvitation && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Invitation for: <strong>{selectedInvitation.first_name} {selectedInvitation.last_name}</strong> ({selectedInvitation.email})
              </Typography>
              
              {(() => {
                const record = getInvitationRecord(selectedInvitation);
                if (!record) {
                  return (
                    <Alert 
                      severity="warning"
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.warning[300]}30`,
                        '& .MuiAlert-message': {
                          color: tokens.color.warning[700],
                        },
                      }}
                    >
                      No email record found for this invitation. The invitation may have been created before the communication system was implemented.
                    </Alert>
                  );
                }
                
                return (
                  <ModernCard
                    variant="glass"
                    size="medium"
                    color="primary"
                    animation="none"
                    sx={{
                      '&::before': {
                        background: `linear-gradient(135deg, ${tokens.color.info[500]}04 0%, ${tokens.color.info[600]}03 100%)`,
                      },
                    }}
                  >
                    <Stack spacing={3}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="600">Status:</Typography>
                        <Chip 
                          label={record.delivery_status}
                          size="small"
                          color={record.delivery_status === 'DELIVERED' ? 'success' : 
                                 record.delivery_status === 'FAILED' ? 'error' : 'warning'}
                          sx={{
                            fontWeight: 600,
                            ...(record.delivery_status === 'DELIVERED' && {
                              background: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[600]} 100%)`,
                              color: 'white',
                            }),
                          }}
                        />
                      </Box>
                      
                      <Divider sx={{ borderColor: tokens.color.borders.glass }} />
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">Sent:</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.sent_at ? new Date(record.sent_at).toLocaleString() : 'Not sent'}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">Delivered:</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.delivered_at ? new Date(record.delivered_at).toLocaleString() : 'Not delivered'}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">Opened:</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.is_opened ? `Yes - ${new Date(record.opened_at!).toLocaleString()}` : 'Not opened'}
                        </Typography>
                      </Box>
                    </Stack>
                  </ModernCard>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setViewRecordsDialogOpen(false)}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              '&:hover': {
                ...glassPresets.medium,
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ModernSettingsLayout>
  );
};