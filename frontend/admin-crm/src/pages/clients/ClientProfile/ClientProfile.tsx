import React from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  PersonAdd as PersonAddIcon,
  Add as AddIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  NotificationsActive as NotifPrefsIcon,
} from '@mui/icons-material';
import { QuickActions, EntityNavigation, FinancialSummary } from '@/components/common';
import {
  ModernPageLayout,
  ModernEmptyState,
  ModernPageHeader,
} from '@/components/common/ModernDesignSystem';
import { useClientProfileLogic } from './useClientProfileLogic';
import { ClientOverviewCards } from './ClientOverviewCards';
import { ClientProfileTabs } from './ClientProfileTabs';
import { ClientProfileDialogs } from './ClientProfileDialogs';

export const ClientProfile: React.FC = () => {
  const logic = useClientProfileLogic();

  const {
    clientId,
    navigate,
    client,
    events,
    communications,
    quotes,
    contracts,
    invoices,
    statusSummary,
    totalClientValue,
    financialMetrics,
    quickActions,
    relatedEvents,
    activityItems,
    isLoading,
    isLoadingEvents,
    isUpdatingClient,
    isDeletingClient,
    isSendingInvitation,
    isCreatingNote,
    isCreatingEvent,
    error,
    tabValue,
    setTabValue,
    anchorEl,
    setAnchorEl,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    sendMessageDialogOpen,
    setSendMessageDialogOpen,
    addNoteDialogOpen,
    setAddNoteDialogOpen,
    createEventDialogOpen,
    setCreateEventDialogOpen,
    notifPrefsDialogOpen,
    setNotifPrefsDialogOpen,
    handleMenuClose,
    handleEditClient,
    handleDeactivateClient,
    handleSendInvitation,
    handleEdit,
    handleDelete,
    refetchClient,
    createNote,
    createEvent,
    createRefreshAction,
  } = logic;

  if (isLoading) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  if (error || !client || !statusSummary) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernPageHeader
          title="Client Not Found"
          subtitle="The requested client could not be located"
          icon={<PersonIcon />}
          secondaryActions={[
            {
              label: 'Back to Clients',
              onClick: () => navigate('/clients'),
              icon: <ArrowBackIcon />,
            },
          ]}
        />
        <ModernEmptyState
          icon={PersonIcon}
          title="Client Not Found"
          description="The client you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Back to Clients',
            onClick: () => navigate('/clients'),
            icon: <ArrowBackIcon />,
            color: 'primary',
          }}
          size="medium"
        />
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Page Header */}
      <ModernPageHeader
        title={`${client.first_name} ${client.last_name}`}
        subtitle={client.email}
        icon={
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {client.first_name?.charAt(0)}
            {client.last_name?.charAt(0)}
          </Avatar>
        }
        primaryAction={{
          label: 'Create Event',
          onClick: () => navigate(`/events/new?client=${clientId}`),
          icon: <AddIcon />,
          variant: 'contained',
          color: 'primary',
        }}
        secondaryActions={[
          {
            label: 'Back to Clients',
            onClick: () => navigate('/clients'),
            icon: <ArrowBackIcon />,
            variant: 'outlined',
          },
          createRefreshAction(() => refetchClient()),
          {
            label: 'Message',
            onClick: () => setSendMessageDialogOpen(true),
            icon: <MessageIcon />,
            variant: 'outlined',
          },
          {
            label: 'More Options',
            onClick: (e) => setAnchorEl(e?.currentTarget ?? null),
            icon: <MoreVertIcon />,
            variant: 'icon',
          },
        ]}
        status={{
          label: statusSummary.active.label,
          color: statusSummary.active.color === 'success' ? 'success' : 'error',
          variant: 'outlined',
        }}
        stats={[
          {
            label: 'Total Events',
            value: events.length.toString(),
          },
          {
            label: 'Total Value',
            value: totalClientValue,
          },
          {
            label: 'Member Since',
            value: new Date(client.date_joined).toLocaleDateString(),
          },
        ]}
        size="medium"
      />

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: 1 },
        }}
      >
        <MenuItem onClick={handleEditClient}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit Client</ListItemText>
        </MenuItem>
        {!client.has_account && (
          <MenuItem onClick={handleSendInvitation} disabled={isSendingInvitation}>
            <ListItemIcon>
              <PersonAddIcon />
            </ListItemIcon>
            <ListItemText>Send Portal Invitation</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setNotifPrefsDialogOpen(true);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <NotifPrefsIcon />
          </ListItemIcon>
          <ListItemText>Notification Preferences</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeactivateClient} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <BlockIcon color="error" />
          </ListItemIcon>
          <ListItemText>Deactivate Client</ListItemText>
        </MenuItem>
      </Menu>

      {/* Client Overview Cards */}
      <ClientOverviewCards
        client={client}
        events={events}
        totalClientValue={totalClientValue}
        statusSummary={statusSummary}
      />

      {/* Enhanced Sections */}
      <Stack spacing={4} sx={{ mb: 4 }}>
        {/* Quick Actions & Related Entities */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          {/* Quick Actions */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <QuickActions actions={quickActions} title="Client Actions" compactMode={false} />
            </Box>
          </Box>

          {/* Related Events */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <EntityNavigation
                title="Recent Events"
                entities={relatedEvents}
                layout="compact"
                maxVisible={3}
                showViewAll={relatedEvents.length > 3}
                onViewAll={
                  relatedEvents.length > 3
                    ? () => navigate(`/events?client=${clientId}`)
                    : undefined
                }
              />
            </Box>
          </Box>
        </Box>

        {/* Financial Summary */}
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <FinancialSummary
            title="Financial Overview"
            metrics={financialMetrics}
            compactMode={false}
          />
        </Box>
      </Stack>

      {/* Tabs */}
      <ClientProfileTabs
        client={client}
        clientId={clientId}
        tabValue={tabValue}
        onTabChange={setTabValue}
        activityItems={activityItems}
        events={events}
        isLoadingEvents={isLoadingEvents}
        communications={communications}
        quotes={quotes}
        contracts={contracts}
        invoices={invoices}
        onRefresh={() => refetchClient()}
      />

      {/* Dialogs */}
      <ClientProfileDialogs
        client={client}
        clientId={clientId}
        editDialogOpen={editDialogOpen}
        onEditDialogClose={() => setEditDialogOpen(false)}
        onEdit={handleEdit}
        isUpdatingClient={isUpdatingClient}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogClose={() => setDeleteDialogOpen(false)}
        onDelete={handleDelete}
        isDeletingClient={isDeletingClient}
        sendMessageDialogOpen={sendMessageDialogOpen}
        onSendMessageDialogClose={() => setSendMessageDialogOpen(false)}
        addNoteDialogOpen={addNoteDialogOpen}
        onAddNoteDialogClose={() => setAddNoteDialogOpen(false)}
        createNote={createNote}
        isCreatingNote={isCreatingNote}
        createEventDialogOpen={createEventDialogOpen}
        onCreateEventDialogClose={() => setCreateEventDialogOpen(false)}
        createEvent={createEvent}
        isCreatingEvent={isCreatingEvent}
        onEventCreated={(newEvent) => navigate(`/events/${newEvent.id}`)}
        notifPrefsDialogOpen={notifPrefsDialogOpen}
        onNotifPrefsDialogClose={() => setNotifPrefsDialogOpen(false)}
      />
    </ModernPageLayout>
  );
};

export default ClientProfile;
