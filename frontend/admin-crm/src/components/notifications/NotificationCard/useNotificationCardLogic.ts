// frontend/admin-crm/src/components/notifications/NotificationCard/useNotificationCardLogic.ts

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/types/notifications.types';

interface UseNotificationCardLogicParams {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
}

export function useNotificationCardLogic({
  notification,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: UseNotificationCardLogicParams) {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMarkRead = () => {
    onMarkRead(notification.id);
    handleMenuClose();
  };

  const handleMarkUnread = () => {
    onMarkUnread(notification.id);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(notification.id);
    handleMenuClose();
  };

  const handleCardClick = () => {
    // Only navigate if not expanding and has action URL
    if (!expanded && notification.action_url) {
      // Mark as read when clicked if not already read
      if (!notification.is_read && notification.can_mark_read) {
        onMarkRead(notification.id);
      }

      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const isExpandable = (() => {
    const contentLength = notification.content?.length || 0;
    const hasContext =
      notification.context_data && Object.keys(notification.context_data).length > 0;
    const hasLongContent = contentLength > 100;
    const hasMetadata = notification.delivered_via && notification.delivered_via.length > 0;

    return hasLongContent || hasContext || hasMetadata;
  })();

  return {
    navigate,
    menuAnchor,
    expanded,
    isExpandable,
    handleMenuOpen,
    handleMenuClose,
    handleMarkRead,
    handleMarkUnread,
    handleDelete,
    handleCardClick,
    handleExpandToggle,
  };
}
