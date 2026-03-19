// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/usePaymentTermsConfigLogic.ts

import { useState, useEffect, useCallback } from 'react';
import { usePaymentSettings } from '@/hooks/usePayments';
import { useCurrentCurrency } from '@/hooks/useCurrency';
import type { PaymentTermsConfiguration } from '@/types/bookingflows';
import type { ChildPricingTier, PaymentTermsFormData } from './types';
import { defaultFormData } from './types';

export function usePaymentTermsConfigLogic(
  config: PaymentTermsConfiguration | null | undefined,
  onUpdate: (data: Partial<PaymentTermsConfiguration>) => void,
) {
  const [formData, setFormData] = useState<PaymentTermsFormData>(defaultFormData);
  const [expanded, setExpanded] = useState(false);
  const [hasOverrides, setHasOverrides] = useState(false);

  const { data: paymentSettings } = usePaymentSettings();
  const { currencyConfig } = useCurrentCurrency();

  const safeString = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  useEffect(() => {
    if (config) {
      const newFormData: PaymentTermsFormData = {
        deposit_type: config.deposit_type,
        deposit_percentage: safeString(config.deposit_percentage),
        deposit_fixed_amount: safeString(config.deposit_fixed_amount),
        deposit_is_refundable: config.deposit_is_refundable,
        deposit_is_deductible: config.deposit_is_deductible,
        deposit_waived_on_full_payment: config.deposit_waived_on_full_payment,
        late_fee_type: config.late_fee_type,
        late_fee_amount: safeString(config.late_fee_amount),
        late_fee_percentage: safeString(config.late_fee_percentage),
        security_deposit_enabled: config.security_deposit_enabled,
        security_deposit_amount: safeString(config.security_deposit_amount),
        security_deposit_is_refundable: config.security_deposit_is_refundable,
        security_deposit_description: config.security_deposit_description || '',
        cancellation_admin_fee_percentage: safeString(config.cancellation_admin_fee_percentage),
        downpayment_percentage: safeString(config.downpayment_percentage),
        downpayment_due_days: safeString(config.downpayment_due_days),
        balance_due_days: safeString(config.balance_due_days),
        balance_due_type: config.balance_due_type,
        date_blocking_policy: config.date_blocking_policy ?? null,
        downpayment_due_reference: config.downpayment_due_reference ?? null,
        downpayment_deadline_days: safeString(config.downpayment_deadline_days),
        child_pricing_enabled: config.child_pricing_enabled ?? null,
        child_pricing_tiers: config.child_pricing_tiers ?? null,
      };
      setFormData(newFormData);

      const hasAnyOverride = Object.entries(newFormData).some(([key, v]) => {
        if (key === 'child_pricing_tiers') {
          return v !== null && Array.isArray(v) && v.length > 0;
        }
        return v !== null && v !== '' && v !== undefined;
      });
      setHasOverrides(hasAnyOverride);
      if (hasAnyOverride) {
        setExpanded(true);
      }
    }
  }, [config]);

  const handleInputChange =
    (field: keyof PaymentTermsFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSelectChange =
    (field: keyof PaymentTermsFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value === '' ? null : value,
      }));
    };

  const handleNullableSwitchChange =
    (field: keyof PaymentTermsFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleSave = useCallback(() => {
    const parseOptionalNumber = (val: string): number | null => {
      if (val === '' || val === null) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const parseOptionalInt = (val: string): number | null => {
      if (val === '' || val === null) return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    };

    const updateData: Partial<PaymentTermsConfiguration> = {
      deposit_type: formData.deposit_type,
      deposit_percentage: parseOptionalNumber(formData.deposit_percentage),
      deposit_fixed_amount: parseOptionalNumber(formData.deposit_fixed_amount),
      deposit_is_refundable: formData.deposit_is_refundable,
      deposit_is_deductible: formData.deposit_is_deductible,
      deposit_waived_on_full_payment: formData.deposit_waived_on_full_payment,
      late_fee_type: formData.late_fee_type,
      late_fee_amount: parseOptionalNumber(formData.late_fee_amount),
      late_fee_percentage: parseOptionalNumber(formData.late_fee_percentage),
      security_deposit_enabled: formData.security_deposit_enabled,
      security_deposit_amount: parseOptionalNumber(formData.security_deposit_amount),
      security_deposit_is_refundable: formData.security_deposit_is_refundable,
      security_deposit_description: formData.security_deposit_description || '',
      cancellation_admin_fee_percentage: parseOptionalNumber(
        formData.cancellation_admin_fee_percentage,
      ),
      downpayment_percentage: parseOptionalNumber(formData.downpayment_percentage),
      downpayment_due_days: parseOptionalInt(formData.downpayment_due_days),
      balance_due_days: parseOptionalInt(formData.balance_due_days),
      balance_due_type: formData.balance_due_type,
      date_blocking_policy: formData.date_blocking_policy,
      downpayment_due_reference: formData.downpayment_due_reference,
      downpayment_deadline_days: parseOptionalInt(formData.downpayment_deadline_days),
      child_pricing_enabled: formData.child_pricing_enabled,
      child_pricing_tiers: formData.child_pricing_tiers,
    };

    onUpdate(updateData);
  }, [formData, onUpdate]);

  const handleClearOverrides = useCallback(() => {
    setFormData(defaultFormData);
    onUpdate({
      deposit_type: null,
      deposit_percentage: null,
      deposit_fixed_amount: null,
      deposit_is_refundable: null,
      deposit_is_deductible: null,
      deposit_waived_on_full_payment: null,
      late_fee_type: null,
      late_fee_amount: null,
      late_fee_percentage: null,
      security_deposit_enabled: null,
      security_deposit_amount: null,
      security_deposit_is_refundable: null,
      security_deposit_description: '',
      cancellation_admin_fee_percentage: null,
      downpayment_percentage: null,
      downpayment_due_days: null,
      balance_due_days: null,
      balance_due_type: null,
      date_blocking_policy: null,
      downpayment_due_reference: null,
      downpayment_deadline_days: null,
      child_pricing_enabled: null,
      child_pricing_tiers: null,
    });
  }, [onUpdate]);

  const handleAddChildTier = useCallback(() => {
    const newTier: ChildPricingTier = {
      min_age: 0,
      max_age: 12,
      discount_percentage: 50,
      label: 'Child',
    };
    setFormData((prev) => ({
      ...prev,
      child_pricing_tiers: [...(prev.child_pricing_tiers || []), newTier],
    }));
  }, []);

  const handleUpdateChildTier = useCallback(
    (index: number, field: keyof ChildPricingTier, value: string | number) => {
      setFormData((prev) => {
        const tiers = [...(prev.child_pricing_tiers || [])];
        tiers[index] = { ...tiers[index], [field]: value };
        return { ...prev, child_pricing_tiers: tiers };
      });
    },
    [],
  );

  const handleRemoveChildTier = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      child_pricing_tiers: (prev.child_pricing_tiers || []).filter((_, i) => i !== index),
    }));
  }, []);

  const renderGlobalDefault = (_field: string, value: unknown) => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return {
    // State
    formData,
    expanded,
    hasOverrides,
    paymentSettings,
    currencyConfig,

    // Setters
    setExpanded,

    // Handlers
    handleInputChange,
    handleSelectChange,
    handleNullableSwitchChange,
    handleSave,
    handleClearOverrides,
    handleAddChildTier,
    handleUpdateChildTier,
    handleRemoveChildTier,
    renderGlobalDefault,
  };
}
