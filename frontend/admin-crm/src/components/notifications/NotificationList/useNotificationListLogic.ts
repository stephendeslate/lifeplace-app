import { useState } from 'react';
import type {
  Notification,
  NotificationFilters,
  NotificationBulkActionData,
} from '@/types/notifications.types';

interface UseNotificationListLogicParams {
  notifications: Notification[];
  filters: NotificationFilters;
  onBulkAction: (data: NotificationBulkActionData) => void;
  onFilterChange: (filters: NotificationFilters) => void;
}

export function useNotificationListLogic({
  notifications,
  filters,
  onBulkAction,
  onFilterChange,
}: UseNotificationListLogicParams) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.type || '');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications.map((n) => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const handleBulkMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setBulkMenuAnchor(event.currentTarget);
  };

  const handleBulkMenuClose = () => {
    setBulkMenuAnchor(null);
  };

  const handleBulkAction = (action: 'mark_read' | 'mark_unread' | 'delete') => {
    if (selectedIds.length === 0) return;

    onBulkAction({
      notification_ids: selectedIds,
      action,
    });

    setSelectedIds([]);
    handleBulkMenuClose();
  };

  const handleFilterChange = (
    field: keyof NotificationFilters,
    value: string | boolean | undefined,
  ) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    const timer = setTimeout(() => {
      handleFilterChange('type', value);
    }, 300);

    return () => clearTimeout(timer);
  };

  const clearFilters = () => {
    onFilterChange({});
    setSearchValue('');
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '',
  );

  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < notifications.length;

  return {
    selectedIds,
    bulkMenuAnchor,
    showFilters,
    setShowFilters,
    searchValue,
    handleSelectAll,
    handleSelectOne,
    handleBulkMenuOpen,
    handleBulkMenuClose,
    handleBulkAction,
    handleFilterChange,
    handleSearchChange,
    clearFilters,
    hasActiveFilters,
    allSelected,
    someSelected,
  };
}

export function groupNotificationsByTime(notifications: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    lastWeek: [] as Notification[],
    older: [] as Notification[],
  };

  notifications.forEach((notification) => {
    const createdDate = new Date(notification.created_at);
    const createdDateStart = new Date(
      createdDate.getFullYear(),
      createdDate.getMonth(),
      createdDate.getDate(),
    );

    if (createdDateStart.getTime() === today.getTime()) {
      groups.today.push(notification);
    } else if (createdDateStart.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification);
    } else if (createdDateStart >= thisWeekStart && createdDateStart < today) {
      groups.thisWeek.push(notification);
    } else if (createdDateStart >= lastWeekStart && createdDateStart < thisWeekStart) {
      groups.lastWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}

export function sortNotificationsByPriority(notifications: Notification[]) {
  return [...notifications].sort((a, b) => {
    const priorityWeights = {
      URGENT: 1000,
      HIGH: 100,
      NORMAL: 10,
      LOW: 1,
    };

    const statusWeight = (notification: Notification) => (notification.is_read ? 0 : 500);

    const categoryWeights = {
      SYSTEM: 50,
      PAYMENT: 40,
      CONTRACT: 35,
      CLIENT: 30,
      EVENT: 25,
      TASK: 20,
      WORKFLOW: 15,
      COMMUNICATION: 10,
    };

    const scoreA =
      priorityWeights[a.notification_type_details?.priority as keyof typeof priorityWeights] +
      statusWeight(a) +
      (categoryWeights[a.notification_type_details?.category as keyof typeof categoryWeights] ||
        5) +
      Math.max(0, 10 - (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60));

    const scoreB =
      priorityWeights[b.notification_type_details?.priority as keyof typeof priorityWeights] +
      statusWeight(b) +
      (categoryWeights[b.notification_type_details?.category as keyof typeof categoryWeights] ||
        5) +
      Math.max(0, 10 - (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60));

    if (Math.abs(scoreA - scoreB) < 0.1) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return scoreB - scoreA;
  });
}
