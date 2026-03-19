// Notification Types — business logic hook

import { useState } from 'react';
import { useNotificationTypes } from '@/hooks/useNotifications';
import { useSettingsPagination } from '@/hooks/useSettingsPagination';
import type {
  NotificationType,
  CreateNotificationTypeData,
  UpdateNotificationTypeData,
} from '@/types/notifications.types';
import { defaultNotificationType } from './constants';

export function useNotificationTypesLogic() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NotificationType | null>(null);
  const [formData, setFormData] = useState<NotificationType>(defaultNotificationType);
  const paginationState = useSettingsPagination({ defaultPageSize: 25 });

  const {
    notificationTypes,
    totalCount,
    pageCount,
    isLoadingTypes,
    typesError,
    refetchTypes,
    createType,
    updateType,
    deleteType,
    isDeletingType,
  } = useNotificationTypes({
    page: paginationState.page,
    page_size: paginationState.pageSize,
    search: paginationState.search || undefined,
    category: (paginationState.filters.category as string) || undefined,
    ordering: paginationState.ordering || undefined,
  });

  const handleRefresh = () => refetchTypes();

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteType(Number(id), {
        onSuccess: () => {
          refetchTypes();
          resolve();
        },
        onError: reject,
      });
    });
  };

  const handleFormChange = (partial: Partial<NotificationType>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleFormSave = () => {
    if (editingItem) {
      // Update existing
      const updateData: UpdateNotificationTypeData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        priority: formData.priority,
        default_title_template: formData.default_title_template,
        default_content_template: formData.default_content_template,
        default_email_template: formData.default_email_template,
        default_sms_template: formData.default_sms_template,
        is_active: formData.is_active,
        supports_email: formData.supports_email,
        supports_sms: formData.supports_sms,
        supports_push: formData.supports_push,
        auto_read_after_days: formData.auto_read_after_days,
      };
      // Don't allow code change on system types
      if (!editingItem.is_system) {
        updateData.code = formData.code;
      }
      updateType(
        { id: editingItem.id, data: updateData },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            setEditingItem(null);
            refetchTypes();
          },
        },
      );
    } else {
      // Create new
      const createData: CreateNotificationTypeData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        priority: formData.priority,
        default_title_template: formData.default_title_template,
        default_content_template: formData.default_content_template,
        default_email_template: formData.default_email_template,
        default_sms_template: formData.default_sms_template,
        is_active: formData.is_active,
        supports_email: formData.supports_email,
        supports_sms: formData.supports_sms,
        supports_push: formData.supports_push,
        auto_read_after_days: formData.auto_read_after_days,
      };
      createType(createData, {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditingItem(null);
          refetchTypes();
        },
      });
    }
  };

  return {
    // Data
    notificationTypes,
    totalCount,
    pageCount,
    isLoadingTypes,
    typesError,
    isDeletingType,
    // Form state
    editDialogOpen,
    setEditDialogOpen,
    editingItem,
    setEditingItem,
    formData,
    setFormData,
    // Handlers
    handleRefresh,
    handleDelete,
    handleFormChange,
    handleFormSave,
    // Pagination
    paginationState,
  };
}
