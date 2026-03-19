import { useState } from 'react';
import { useCommunications } from '@/hooks/useCommunications';
import type { CommunicationRecord, CommunicationFilters } from '@/types/communications.types';

export function useCommunicationHistoryLogic() {
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRecordForAction, setSelectedRecordForAction] =
    useState<CommunicationRecord | null>(null);

  const { useRecords, useMarkAsRead, useMarkAsUnread } = useCommunications();
  const { data: records = [], isLoading, refetch, error } = useRecords(filters);

  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();

  const handleFilterChange = (key: keyof CommunicationFilters, value: string) => {
    setFilters((prev: CommunicationFilters) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewDetail = (record: CommunicationRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);

    // Auto-mark as read when viewing details (for emails)
    if (record.channel === 'EMAIL' && !record.is_opened) {
      markAsReadMutation.mutate(record.id);
    }
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedRecordForAction(null);
  };

  const handleMarkAsRead = () => {
    if (selectedRecordForAction && !selectedRecordForAction.is_opened) {
      markAsReadMutation.mutate(selectedRecordForAction.id);
    }
    handleActionMenuClose();
  };

  const handleMarkAsUnread = () => {
    if (selectedRecordForAction && selectedRecordForAction.is_opened) {
      markAsUnreadMutation.mutate(selectedRecordForAction.id);
    }
    handleActionMenuClose();
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);

  const filteredRecords = records.filter((r) => ['SENT', 'DELIVERED'].includes(r.delivery_status));

  return {
    filters,
    selectedRecord,
    detailDialogOpen,
    setDetailDialogOpen,
    actionMenuAnchor,
    selectedRecordForAction,
    records: filteredRecords,
    isLoading,
    refetch,
    error,
    markAsReadMutation,
    markAsUnreadMutation,
    handleFilterChange,
    handleClearFilters,
    handleViewDetail,
    handleActionMenuClose,
    handleMarkAsRead,
    handleMarkAsUnread,
    hasActiveFilters,
  };
}
