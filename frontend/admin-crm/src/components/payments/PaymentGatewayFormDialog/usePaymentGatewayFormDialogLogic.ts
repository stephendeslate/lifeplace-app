// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/usePaymentGatewayFormDialogLogic.ts

import { useState, useEffect } from 'react';
import { useCreatePaymentGateway, useUpdatePaymentGateway } from '@/hooks/usePayments';
import type {
  PaymentGateway,
  PaymentGatewayFormData,
  StripeConfig,
  PayMongoConfig,
} from '@/types/payments';
import { GATEWAY_TEMPLATES } from '@/types/payments';

const EMPTY_FORM: PaymentGatewayFormData = {
  name: '',
  code: '',
  is_active: true,
  config: {},
  description: '',
};

export function usePaymentGatewayFormDialogLogic(
  open: boolean,
  onClose: () => void,
  gateway?: PaymentGateway | null,
) {
  const [formData, setFormData] = useState<PaymentGatewayFormData>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createGateway, isPending: isCreating } = useCreatePaymentGateway();
  const { mutate: updateGateway, isPending: isUpdating } = useUpdatePaymentGateway();

  const isEditing = !!gateway;
  const isSubmitting = isCreating || isUpdating;

  // Initialize form data
  useEffect(() => {
    if (gateway) {
      const initialConfig =
        gateway.masked_config && Object.keys(gateway.masked_config).length > 0
          ? {
              test_mode: gateway.masked_config.test_mode || false,
              environment: gateway.masked_config.environment || 'sandbox',
            }
          : {};

      setFormData({
        name: gateway.name,
        code: gateway.code,
        is_active: gateway.is_active,
        config: initialConfig,
        description: gateway.description,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
    setShowAdvanced(false);
  }, [gateway, open]);

  const handleChange =
    (field: keyof PaymentGatewayFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'is_active' ? event.target.checked : event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };

  const handleStripeConfigChange =
    (field: keyof StripeConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'test_mode' ? event.target.checked : event.target.value;
      setFormData((prev) => ({
        ...prev,
        config: { ...prev.config, [field]: value },
      }));
    };

  const handlePayMongoConfigChange =
    (field: keyof PayMongoConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'test_mode' ? event.target.checked : event.target.value;
      setFormData((prev) => ({
        ...prev,
        config: { ...prev.config, [field]: value },
      }));
    };

  const setupGateway = (gatewayType: 'stripe' | 'paymongo') => {
    const template = GATEWAY_TEMPLATES[gatewayType];
    setFormData((prev) => ({
      ...prev,
      name: template.name,
      code: template.code,
      description: template.description,
      config: template.config as unknown as Record<string, unknown>,
    }));
    setShowAdvanced(true);
  };

  const handleConfigJsonChange = (jsonString: string) => {
    try {
      const config = JSON.parse(jsonString);
      setFormData((prev) => ({ ...prev, config }));
    } catch {
      // Invalid JSON, don't update
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Gateway name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Gateway code is required';
    } else if (!/^[a-z0-9_-]+$/.test(formData.code)) {
      newErrors.code =
        'Code must contain only lowercase letters, numbers, underscores, and hyphens';
    }

    // Stripe specific validation
    if (formData.code === 'stripe') {
      const config = formData.config as unknown as StripeConfig;
      if (!config.publishable_key?.trim()) {
        newErrors.publishable_key = 'Publishable key is required for Stripe';
      }
      if (!config.secret_key?.trim()) {
        newErrors.secret_key = 'Secret key is required for Stripe';
      }
    }

    // PayMongo specific validation
    if (formData.code === 'paymongo') {
      const config = formData.config as unknown as PayMongoConfig;
      if (!config.public_key?.trim()) {
        newErrors.public_key = 'Public key is required for PayMongo';
      }
      if (!config.secret_key?.trim()) {
        newErrors.secret_key = 'Secret key is required for PayMongo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    let finalConfig = formData.config;

    if (isEditing && gateway?.masked_config) {
      const configToUpdate: Record<string, unknown> = {};

      if ('test_mode' in formData.config) {
        configToUpdate.test_mode = formData.config.test_mode;
      }
      if ('environment' in formData.config) {
        configToUpdate.environment = formData.config.environment;
      }

      Object.entries(formData.config).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim() !== '') {
          configToUpdate[key] = value.trim();
        }
      });

      finalConfig = configToUpdate;
    }

    const submitData = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      is_active: formData.is_active,
      config: finalConfig,
      description: formData.description.trim(),
    };

    if (isEditing && gateway) {
      updateGateway({ id: gateway.id, data: submitData }, { onSuccess: () => onClose() });
    } else {
      createGateway(submitData, {
        onSuccess: () => onClose(),
      });
    }
  };

  const isStripe = formData.code === 'stripe';
  const isPayMongo = formData.code === 'paymongo';
  const stripeConfig = formData.config as unknown as StripeConfig;
  const paymongoConfig = formData.config as unknown as PayMongoConfig;

  return {
    formData,
    errors,
    isEditing,
    isSubmitting,
    isStripe,
    isPayMongo,
    stripeConfig,
    paymongoConfig,
    showAdvanced,
    setShowAdvanced,
    handleChange,
    handleStripeConfigChange,
    handlePayMongoConfigChange,
    handleConfigJsonChange,
    setupGateway,
    handleSubmit,
  };
}
