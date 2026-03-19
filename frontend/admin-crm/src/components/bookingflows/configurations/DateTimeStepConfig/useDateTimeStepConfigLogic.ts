import { useState, useEffect } from 'react';
import type { DateTimeStepConfiguration, BookingFlowStep } from '@/types/bookingflows';
import { useBookingFlowStepConfiguration } from '@/hooks/useBookingFlows';
import { useFormHandlers } from '@/hooks/useFormHandlers';
import type { DateTimeConfigFormData } from './types';
import { defaultFormData } from './types';

export function useDateTimeStepConfigLogic(
  step: BookingFlowStep,
  config: DateTimeStepConfiguration | null | undefined,
  onUpdate: (updatedStep: BookingFlowStep) => void,
) {
  const [formData, setFormData] = useState<DateTimeConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const { handleSwitchChange } = useFormHandlers(setFormData, errors, setErrors);

  const { updateConfiguration, isUpdatingConfiguration } = useBookingFlowStepConfiguration();

  useEffect(() => {
    if (config) {
      setFormData({
        allow_multi_day: config.allow_multi_day ?? false,
        min_event_days: config.min_event_days ?? 1,
        max_event_days: config.max_event_days ?? 7,
        show_calendar_view: config.show_calendar_view ?? true,
        enable_real_time_availability: config.enable_real_time_availability ?? true,
        show_availability_status: config.show_availability_status ?? true,
        auto_check_conflicts: config.auto_check_conflicts ?? true,
        blocked_dates: config.blocked_dates || [],
        available_days_of_week: config.available_days_of_week || [1, 2, 3, 4, 5, 6, 0],
        available_time_slots: config.available_time_slots || [],
        buffer_before_hours: config.buffer_before_hours ?? 0,
        buffer_after_hours: config.buffer_after_hours ?? 0,
        check_venue_availability: config.check_venue_availability ?? true,
        check_resource_availability: config.check_resource_availability ?? true,
        check_staff_availability: config.check_staff_availability ?? true,
        availability_display_mode: config.availability_display_mode ?? 'FULL',
        allow_overbooking: config.allow_overbooking ?? false,
        overbooking_threshold: config.overbooking_threshold ?? 0,
        sync_with_calendar: config.sync_with_calendar ?? false,
        calendar_source: config.calendar_source ?? '',
      });
    }
  }, [config]);

  const handleInputChange =
    (field: keyof DateTimeConfigFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      const value = event.target.value;
      const isNumericField =
        field.includes('hours') || field.includes('threshold') || field.includes('_days');
      setFormData((prev) => ({
        ...prev,
        [field]: isNumericField ? parseInt(value as string) || 0 : value,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleDaysOfWeekChange = (value: number[]) => {
    setFormData((prev) => ({
      ...prev,
      available_days_of_week: value,
    }));
  };

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !formData.blocked_dates.includes(newBlockedDate)) {
      setFormData((prev) => ({
        ...prev,
        blocked_dates: [...prev.blocked_dates, newBlockedDate],
      }));
      setNewBlockedDate('');
    }
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      blocked_dates: prev.blocked_dates.filter((date) => date !== dateToRemove),
    }));
  };

  const handleSelectChange = (field: keyof DateTimeConfigFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.buffer_before_hours < 0 || formData.buffer_after_hours < 0) {
      newErrors.buffer = 'Buffer hours cannot be negative';
    }

    if (formData.available_days_of_week.length === 0) {
      newErrors.available_days_of_week = 'At least one day of the week must be available';
    }

    if (formData.allow_overbooking && formData.overbooking_threshold < 0) {
      newErrors.overbooking_threshold = 'Overbooking threshold cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    updateConfiguration(
      {
        stepId: step.id,
        data: formData as unknown as Record<string, unknown>,
      },
      {
        onSuccess: () => {
          const updatedStep: BookingFlowStep = {
            ...step,
            configuration_data: {
              ...config,
              ...formData,
            } as DateTimeStepConfiguration,
          };
          onUpdate(updatedStep);
        },
      },
    );
  };

  const handleReset = () => setFormData(defaultFormData);

  return {
    formData,
    setFormData,
    errors,
    newBlockedDate,
    setNewBlockedDate,
    isUpdatingConfiguration,
    handleInputChange,
    handleSwitchChange,
    handleDaysOfWeekChange,
    handleAddBlockedDate,
    handleRemoveBlockedDate,
    handleSelectChange,
    handleSave,
    handleReset,
  };
}
