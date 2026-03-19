import { useState, useEffect } from 'react';
import { useNotificationPreferences, useNotificationTypes } from '@/hooks/useNotifications';
import type {
  NotificationPreference,
  UpdateNotificationPreferenceData,
} from '@/types/notifications.types';

export interface UseNotificationPreferencesFormLogicParams {
  preferences: NotificationPreference;
}

export const useNotificationPreferencesFormLogic = ({
  preferences,
}: UseNotificationPreferencesFormLogicParams) => {
  const [formData, setFormData] = useState<UpdateNotificationPreferenceData>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState<Date | null>(null);
  const [quietHoursEnd, setQuietHoursEnd] = useState<Date | null>(null);

  const { updatePreferences, resetToDefaults, isUpdatingPreferences, isResettingPreferences } =
    useNotificationPreferences();

  const { notificationTypes } = useNotificationTypes({ is_active: true });

  // Initialize form data
  useEffect(() => {
    if (preferences) {
      setFormData({
        // Global toggles
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        in_app_enabled: preferences.in_app_enabled,
        push_enabled: preferences.push_enabled,
        // System category
        system_email: preferences.system_email,
        system_sms: preferences.system_sms,
        system_in_app: preferences.system_in_app,
        system_push: preferences.system_push,
        // Event category
        event_email: preferences.event_email,
        event_sms: preferences.event_sms,
        event_in_app: preferences.event_in_app,
        event_push: preferences.event_push,
        // Task category
        task_email: preferences.task_email,
        task_sms: preferences.task_sms,
        task_in_app: preferences.task_in_app,
        task_push: preferences.task_push,
        // Payment category
        payment_email: preferences.payment_email,
        payment_sms: preferences.payment_sms,
        payment_in_app: preferences.payment_in_app,
        payment_push: preferences.payment_push,
        // Client category
        client_email: preferences.client_email,
        client_sms: preferences.client_sms,
        client_in_app: preferences.client_in_app,
        client_push: preferences.client_push,
        // Contract category
        contract_email: preferences.contract_email,
        contract_sms: preferences.contract_sms,
        contract_in_app: preferences.contract_in_app,
        contract_push: preferences.contract_push,
        // Workflow category
        workflow_email: preferences.workflow_email,
        workflow_sms: preferences.workflow_sms,
        workflow_in_app: preferences.workflow_in_app,
        workflow_push: preferences.workflow_push,
        // Communication category
        communication_email: preferences.communication_email,
        communication_sms: preferences.communication_sms,
        communication_in_app: preferences.communication_in_app,
        communication_push: preferences.communication_push,
        // Marketing category (opt-in only)
        marketing_email: preferences.marketing_email,
        marketing_sms: preferences.marketing_sms,
        marketing_in_app: preferences.marketing_in_app,
        marketing_push: preferences.marketing_push,
        // Advanced
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        digest_frequency: preferences.digest_frequency,
        disabled_types: preferences.disabled_types,
      });

      // Set quiet hours times
      if (preferences.quiet_hours_start) {
        const startTime = new Date();
        const [hours, minutes] = preferences.quiet_hours_start.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setQuietHoursStart(startTime);
      }

      if (preferences.quiet_hours_end) {
        const endTime = new Date();
        const [hours, minutes] = preferences.quiet_hours_end.split(':');
        endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setQuietHoursEnd(endTime);
      }

      setHasChanges(false);
    }
  }, [preferences]);

  const handleFieldChange = (
    field: keyof UpdateNotificationPreferenceData,
    value: boolean | string | number[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: Date | null) => {
    if (field === 'start') {
      setQuietHoursStart(value);
      const timeString = value
        ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`
        : null;
      handleFieldChange('quiet_hours_start', timeString || '');
    } else {
      setQuietHoursEnd(value);
      const timeString = value
        ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`
        : null;
      handleFieldChange('quiet_hours_end', timeString || '');
    }
  };

  const handleDisabledTypesChange = (typeId: number, disabled: boolean) => {
    const currentDisabled = formData.disabled_types || [];
    let newDisabled: number[];

    if (disabled) {
      newDisabled = [...currentDisabled, typeId];
    } else {
      newDisabled = currentDisabled.filter((id) => id !== typeId);
    }

    handleFieldChange('disabled_types', newDisabled);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences(formData);
    setHasChanges(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setHasChanges(false);
  };

  return {
    formData,
    hasChanges,
    quietHoursStart,
    quietHoursEnd,
    notificationTypes,
    isUpdatingPreferences,
    isResettingPreferences,
    handleFieldChange,
    handleQuietHoursChange,
    handleDisabledTypesChange,
    handleSubmit,
    handleReset,
  };
};
