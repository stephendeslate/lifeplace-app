import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { notificationsApi } from '@/apis/notifications.api';
import type {
  UpdateNotificationPreferenceData,
  DigestFrequency,
  NotificationType,
} from '@/types/notifications.types';

export function useNotificationPreferencesDialogLogic(open: boolean, onClose: () => void) {
  const { useMyPreferences, useUpdatePreferences, useResetPreferences } =
    useNotificationPreferences();

  const { data: preferences, isLoading, error } = useMyPreferences();
  const updateMutation = useUpdatePreferences();
  const resetMutation = useResetPreferences();

  const { data: notificationTypes = [] } = useQuery({
    queryKey: ['notification-types-active'],
    queryFn: notificationsApi.getNotificationTypes,
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  const [formData, setFormData] = useState<Partial<UpdateNotificationPreferenceData>>({});
  const [disabledTypes, setDisabledTypes] = useState<number[]>([]);
  const [quietHoursStart, setQuietHoursStart] = useState<Date | null>(null);
  const [quietHoursEnd, setQuietHoursEnd] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        in_app_enabled: preferences.in_app_enabled,
        push_enabled: preferences.push_enabled,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        digest_frequency: preferences.digest_frequency,
        system_email: preferences.system_email,
        system_sms: preferences.system_sms,
        system_in_app: preferences.system_in_app,
        system_push: preferences.system_push,
        event_email: preferences.event_email,
        event_sms: preferences.event_sms,
        event_in_app: preferences.event_in_app,
        event_push: preferences.event_push,
        task_email: preferences.task_email,
        task_sms: preferences.task_sms,
        task_in_app: preferences.task_in_app,
        task_push: preferences.task_push,
        payment_email: preferences.payment_email,
        payment_sms: preferences.payment_sms,
        payment_in_app: preferences.payment_in_app,
        payment_push: preferences.payment_push,
        client_email: preferences.client_email,
        client_sms: preferences.client_sms,
        client_in_app: preferences.client_in_app,
        client_push: preferences.client_push,
        contract_email: preferences.contract_email,
        contract_sms: preferences.contract_sms,
        contract_in_app: preferences.contract_in_app,
        contract_push: preferences.contract_push,
        workflow_email: preferences.workflow_email,
        workflow_sms: preferences.workflow_sms,
        workflow_in_app: preferences.workflow_in_app,
        workflow_push: preferences.workflow_push,
        communication_email: preferences.communication_email,
        communication_sms: preferences.communication_sms,
        communication_in_app: preferences.communication_in_app,
        communication_push: preferences.communication_push,
        marketing_email: preferences.marketing_email,
        marketing_sms: preferences.marketing_sms,
        marketing_in_app: preferences.marketing_in_app,
        marketing_push: preferences.marketing_push,
      });

      setDisabledTypes(preferences.disabled_types || []);

      if (preferences.quiet_hours_start) {
        const [hours, minutes] = preferences.quiet_hours_start.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0);
        setQuietHoursStart(date);
      }
      if (preferences.quiet_hours_end) {
        const [hours, minutes] = preferences.quiet_hours_end.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0);
        setQuietHoursEnd(date);
      }
    }
  }, [preferences]);

  const handleToggle = (field: keyof UpdateNotificationPreferenceData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
    setHasChanges(true);
  };

  const handleDigestChange = (frequency: DigestFrequency) => {
    setFormData((prev) => ({
      ...prev,
      digest_frequency: frequency,
    }));
    setHasChanges(true);
  };

  const handleQuietHoursStartChange = (newValue: Date | null) => {
    setQuietHoursStart(newValue);
    setHasChanges(true);
  };

  const handleQuietHoursEndChange = (newValue: Date | null) => {
    setQuietHoursEnd(newValue);
    setHasChanges(true);
  };

  const handleToggleDisabledType = (typeId: number) => {
    setDisabledTypes((prev) => {
      if (prev.includes(typeId)) {
        return prev.filter((id) => id !== typeId);
      }
      return [...prev, typeId];
    });
    setHasChanges(true);
  };

  const handleUnsubscribeAllMarketing = () => {
    setFormData((prev) => ({
      ...prev,
      marketing_email: false,
      marketing_sms: false,
      marketing_in_app: false,
      marketing_push: false,
    }));
    setHasChanges(true);
  };

  const typesByCategory = useMemo(() => {
    const grouped: Record<string, NotificationType[]> = {};
    notificationTypes.forEach((type) => {
      const cat = type.category || 'OTHER';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(type);
    });
    return grouped;
  }, [notificationTypes]);

  const isAllMarketingDisabled =
    !formData.marketing_email &&
    !formData.marketing_sms &&
    !formData.marketing_in_app &&
    !formData.marketing_push;

  const handleSave = () => {
    const dataToSave: UpdateNotificationPreferenceData = {
      ...formData,
      disabled_types: disabledTypes,
    };

    if (formData.quiet_hours_enabled) {
      if (quietHoursStart) {
        dataToSave.quiet_hours_start = `${quietHoursStart.getHours().toString().padStart(2, '0')}:${quietHoursStart.getMinutes().toString().padStart(2, '0')}`;
      }
      if (quietHoursEnd) {
        dataToSave.quiet_hours_end = `${quietHoursEnd.getHours().toString().padStart(2, '0')}:${quietHoursEnd.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    updateMutation.mutate(dataToSave, {
      onSuccess: () => {
        setHasChanges(false);
        onClose();
      },
    });
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  return {
    formData,
    isLoading,
    error,
    notificationTypes,
    disabledTypes,
    quietHoursStart,
    quietHoursEnd,
    hasChanges,
    typesByCategory,
    isAllMarketingDisabled,
    updateMutation,
    resetMutation,
    handleToggle,
    handleDigestChange,
    handleQuietHoursStartChange,
    handleQuietHoursEndChange,
    handleToggleDisabledType,
    handleUnsubscribeAllMarketing,
    handleSave,
    handleReset,
  };
}
