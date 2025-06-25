// frontend/admin-crm/src/hooks/useNotifications.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../apis/notifications.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  NotificationTemplateFilters,
  NotificationRuleFilters,
  NotificationQueueFilters,
  NotificationHistoryFilters,
  InAppNotificationFilters,
  CreateNotificationTemplateData,
  UpdateNotificationTemplateData,
  UpdateNotificationPreferenceData,
  CreateNotificationRuleData,
  UpdateNotificationRuleData,
  SendNotificationData,
  TestNotificationData,
  BulkNotificationActionData,
  NotificationPreferenceUpdateData,
} from '../types/notifications.types';

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Templates (Admin only)
  const useTemplates = (filters?: NotificationTemplateFilters) => {
    return useQuery({
      queryKey: ['notification-templates', filters],
      queryFn: () => notificationsApi.getTemplates(filters),
    });
  };

  const useTemplate = (id: number) => {
    return useQuery({
      queryKey: ['notification-template', id],
      queryFn: () => notificationsApi.getTemplate(id),
      enabled: !!id,
    });
  };

  const useCreateTemplate = () => {
    return useMutation({
      mutationFn: (data: CreateNotificationTemplateData) => notificationsApi.createTemplate(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
        showSuccess('Template Created', 'Notification template created successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to create template';
        showError('Creation Failed', message);
      },
    });
  };

  const useUpdateTemplate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateNotificationTemplateData }) =>
        notificationsApi.updateTemplate(id, data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
        queryClient.invalidateQueries({ queryKey: ['notification-template', data.id] });
        showSuccess('Template Updated', 'Notification template updated successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to update template';
        showError('Update Failed', message);
      },
    });
  };

  const useDeleteTemplate = () => {
    return useMutation({
      mutationFn: (id: number) => notificationsApi.deleteTemplate(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
        showSuccess('Template Deleted', 'Notification template deleted successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to delete template';
        showError('Deletion Failed', message);
      },
    });
  };

  const usePreviewTemplate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: { context_data?: Record<string, any> } }) =>
        notificationsApi.previewTemplate(id, data),
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to preview template';
        showError('Preview Failed', message);
      },
    });
  };

  const useTestSendTemplate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: TestNotificationData }) =>
        notificationsApi.testSendTemplate(id, data),
      onSuccess: () => {
        showSuccess('Test Sent', 'Test notification sent successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to send test notification';
        showError('Test Failed', message);
      },
    });
  };

  // Preferences
  const useMyPreferences = () => {
    return useQuery({
      queryKey: ['notification-preferences', 'my'],
      queryFn: () => notificationsApi.getMyPreferences(),
    });
  };

  const useUpdateMyPreferences = () => {
    return useMutation({
      mutationFn: (data: UpdateNotificationPreferenceData) =>
        notificationsApi.updateMyPreferences(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        showSuccess('Preferences Updated', 'Your notification preferences have been updated');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to update preferences';
        showError('Update Failed', message);
      },
    });
  };

  const useUpdateNotificationSetting = () => {
    return useMutation({
      mutationFn: (data: NotificationPreferenceUpdateData) =>
        notificationsApi.updateNotificationSetting(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        showSuccess('Setting Updated', 'Notification setting updated successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to update setting';
        showError('Update Failed', message);
      },
    });
  };

  const useAvailableSettings = () => {
    return useQuery({
      queryKey: ['notification-available-settings'],
      queryFn: () => notificationsApi.getAvailableSettings(),
    });
  };

  // Rules (Admin only)
  const useRules = (filters?: NotificationRuleFilters) => {
    return useQuery({
      queryKey: ['notification-rules', filters],
      queryFn: () => notificationsApi.getRules(filters),
    });
  };

  const useRule = (id: number) => {
    return useQuery({
      queryKey: ['notification-rule', id],
      queryFn: () => notificationsApi.getRule(id),
      enabled: !!id,
    });
  };

  const useCreateRule = () => {
   return useMutation({
     mutationFn: (data: CreateNotificationRuleData) => notificationsApi.createRule(data),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
       showSuccess('Rule Created', 'Notification rule created successfully');
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to create rule';
       showError('Creation Failed', message);
     },
   });
 };

 const useUpdateRule = () => {
   return useMutation({
     mutationFn: ({ id, data }: { id: number; data: UpdateNotificationRuleData }) =>
       notificationsApi.updateRule(id, data),
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
       queryClient.invalidateQueries({ queryKey: ['notification-rule', data.id] });
       showSuccess('Rule Updated', 'Notification rule updated successfully');
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to update rule';
       showError('Update Failed', message);
     },
   });
 };

 const useDeleteRule = () => {
   return useMutation({
     mutationFn: (id: number) => notificationsApi.deleteRule(id),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
       showSuccess('Rule Deleted', 'Notification rule deleted successfully');
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to delete rule';
       showError('Deletion Failed', message);
     },
   });
 };

 // Queue (Admin only)
 const useQueue = (filters?: NotificationQueueFilters) => {
   return useQuery({
     queryKey: ['notification-queue', filters],
     queryFn: () => notificationsApi.getQueue(filters),
   });
 };

 const useRetryQueueItem = () => {
   return useMutation({
     mutationFn: (id: string) => notificationsApi.retryQueueItem(id),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
       showSuccess('Notification Queued', 'Notification has been queued for retry');
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to retry notification';
       showError('Retry Failed', message);
     },
   });
 };

 const useCancelQueueItem = () => {
   return useMutation({
     mutationFn: (id: string) => notificationsApi.cancelQueueItem(id),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
       showSuccess('Notification Cancelled', 'Notification has been cancelled');
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to cancel notification';
       showError('Cancel Failed', message);
     },
   });
 };

 // History
 const useHistory = (filters?: NotificationHistoryFilters) => {
   return useQuery({
     queryKey: ['notification-history', filters],
     queryFn: () => notificationsApi.getHistory(filters),
   });
 };

 // In-App Notifications
 const useInAppNotifications = (filters?: InAppNotificationFilters) => {
   return useQuery({
     queryKey: ['in-app-notifications', filters],
     queryFn: () => notificationsApi.getInAppNotifications(filters),
     refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
   });
 };

 const useMarkAsRead = () => {
   return useMutation({
     mutationFn: (id: string) => notificationsApi.markAsRead(id),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
       queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to mark as read';
       showError('Update Failed', message);
     },
   });
 };

 const useMarkAllAsRead = () => {
   return useMutation({
     mutationFn: () => notificationsApi.markAllAsRead(),
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
       queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
       showSuccess('Marked as Read', data.message);
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to mark all as read';
       showError('Update Failed', message);
     },
   });
 };

 const useBulkAction = () => {
   return useMutation({
     mutationFn: (data: BulkNotificationActionData) => notificationsApi.bulkAction(data),
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
       queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
       showSuccess('Action Completed', data.message);
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to perform action';
       showError('Action Failed', message);
     },
   });
 };

 const useUnreadCount = () => {
   return useQuery({
     queryKey: ['notification-unread-count'],
     queryFn: () => notificationsApi.getUnreadCount(),
     refetchInterval: 30000, // Refetch every 30 seconds
   });
 };

 // Analytics (Admin only)
 const useDeliveryStats = (days: number = 30, notificationType?: string, userId?: number) => {
   return useQuery({
     queryKey: ['notification-delivery-stats', days, notificationType, userId],
     queryFn: () => notificationsApi.getDeliveryStats(days, notificationType, userId),
   });
 };

 const useChannelPerformance = (days: number = 30) => {
   return useQuery({
     queryKey: ['notification-channel-performance', days],
     queryFn: () => notificationsApi.getChannelPerformance(days),
   });
 };

 const useUserEngagement = (userId: number, days: number = 30) => {
   return useQuery({
     queryKey: ['notification-user-engagement', userId, days],
     queryFn: () => notificationsApi.getUserEngagement(userId, days),
     enabled: !!userId,
   });
 };

 const useSendManualNotification = () => {
   return useMutation({
     mutationFn: (data: SendNotificationData) => notificationsApi.sendManualNotification(data),
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
       queryClient.invalidateQueries({ queryKey: ['notification-history'] });
       showSuccess('Notifications Sent', `Successfully queued ${data.notifications_queued} notifications to ${data.recipients} recipients`);
     },
     onError: (error: any) => {
       const message = error.response?.data?.detail || 'Failed to send notifications';
       showError('Send Failed', message);
     },
   });
 };

 // Static data queries
 const useNotificationTypes = () => {
   return useQuery({
     queryKey: ['notification-types'],
     queryFn: () => notificationsApi.getNotificationTypes(),
     staleTime: Infinity, // This data rarely changes
   });
 };

 const useChannels = () => {
   return useQuery({
     queryKey: ['notification-channels'],
     queryFn: () => notificationsApi.getChannels(),
     staleTime: Infinity, // This data rarely changes
   });
 };

 const useEventTypes = () => {
   return useQuery({
     queryKey: ['notification-event-types'],
     queryFn: () => notificationsApi.getEventTypes(),
     staleTime: Infinity, // This data rarely changes
   });
 };

 return {
   // Templates
   useTemplates,
   useTemplate,
   useCreateTemplate,
   useUpdateTemplate,
   useDeleteTemplate,
   usePreviewTemplate,
   useTestSendTemplate,

   // Preferences
   useMyPreferences,
   useUpdateMyPreferences,
   useUpdateNotificationSetting,
   useAvailableSettings,

   // Rules
   useRules,
   useRule,
   useCreateRule,
   useUpdateRule,
   useDeleteRule,

   // Queue
   useQueue,
   useRetryQueueItem,
   useCancelQueueItem,

   // History
   useHistory,

   // In-App Notifications
   useInAppNotifications,
   useMarkAsRead,
   useMarkAllAsRead,
   useBulkAction,
   useUnreadCount,

   // Analytics
   useDeliveryStats,
   useChannelPerformance,
   useUserEngagement,
   useSendManualNotification,

   // Static Data
   useNotificationTypes,
   useChannels,
   useEventTypes,
 };
};

export default useNotifications;