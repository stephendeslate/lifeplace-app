// Notification Types Management Page
// Allows admins to manage notification type configurations: templates, priorities, channels

import React from 'react';
import { Edit as EditIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage } from '@/components/common/settings';
import { ModernDialog } from '@/components/common';
import type { NotificationType } from '@/types/notifications.types';
import { config, defaultNotificationType } from './constants';
import { NotificationTypeForm } from './NotificationTypeForm';
import { useNotificationTypesLogic } from './useNotificationTypesLogic';

export const NotificationTypes: React.FC = () => {
  const {
    notificationTypes,
    totalCount,
    pageCount,
    isLoadingTypes,
    typesError,
    isDeletingType,
    editDialogOpen,
    setEditDialogOpen,
    setEditingItem,
    formData,
    setFormData,
    handleRefresh,
    handleDelete,
    handleFormChange,
    handleFormSave,
    paginationState,
  } = useNotificationTypesLogic();

  // Custom form renderer using our NotificationTypeForm
  const renderCustomForm = ({
    open,
    onClose,
    item,
    onSave,
  }: {
    open: boolean;
    onClose: () => void;
    item: NotificationType | null;
    onSave: () => void;
  }) => {
    // Sync state when dialog opens with a new item
    if (open && !editDialogOpen) {
      setEditDialogOpen(true);
      setEditingItem(item);
      setFormData(item || defaultNotificationType);
    }

    return (
      <ModernDialog
        open={open}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingItem(null);
          onClose();
        }}
        title={item ? `Edit Notification Type: ${item.name}` : 'Create Notification Type'}
        maxWidth="md"
        fullWidth
        actions={[
          {
            label: 'Cancel',
            onClick: () => {
              setEditDialogOpen(false);
              setEditingItem(null);
              onClose();
            },
            variant: 'outlined' as const,
          },
          {
            label: item ? 'Save Changes' : 'Create Type',
            onClick: () => {
              handleFormSave();
              onSave();
            },
            variant: 'contained' as const,
            disabled:
              !formData.name ||
              !formData.code ||
              !formData.default_title_template ||
              !formData.default_content_template,
          },
        ]}
      >
        <NotificationTypeForm item={formData} onChange={handleFormChange} isNew={!item} />
      </ModernDialog>
    );
  };

  // Custom edit action for table rows
  const customTableActions = [
    {
      label: 'Edit',
      icon: React.createElement(EditIcon),
      onClick: (item: NotificationType) => {
        setEditingItem(item);
        setFormData(item);
        setEditDialogOpen(true);
      },
      color: 'primary' as const,
    },
  ];

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_templates']}
      data={notificationTypes}
      defaultValues={defaultNotificationType}
      isLoading={isLoadingTypes}
      error={typesError?.message}
      onRefresh={handleRefresh}
      onDelete={handleDelete}
      isDeleting={isDeletingType}
      customTableActions={customTableActions}
      customFormRenderer={renderCustomForm}
      pagination={{
        totalCount,
        currentPage: paginationState.currentPage,
        pageSize: paginationState.pageSize,
        pageCount,
        onPageChange: paginationState.onPageChange,
        onPageSizeChange: paginationState.onPageSizeChange,
      }}
      onSearchChange={paginationState.setSearch}
      onFilterChange={paginationState.setFilters}
      onSortChange={paginationState.setOrdering}
    />
  );
};

export default NotificationTypes;
