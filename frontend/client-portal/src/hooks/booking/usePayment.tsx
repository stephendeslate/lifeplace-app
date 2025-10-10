// frontend/client-portal/src/hooks/booking/usePayment.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PaymentApi } from '../../apis/booking/payment.api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  PaymentGateway,
  PaymentGatewayResponse,
} from '../../types/booking';

// Hook for managing payment gateways
export const usePaymentGateways = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await PaymentApi.getPaymentGateways();
      setGateways(data);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  return {
    gateways,
    loading,
    error,
    refetch: fetchGateways,
  };
};

// Hook for managing flow-specific payment gateways
export const useFlowPaymentGateways = (flowId?: number) => {
  const [paymentData, setPaymentData] = useState<PaymentGatewayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlowGateways = useCallback(async () => {
    if (!flowId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await PaymentApi.getFlowPaymentGateways(flowId);
      setPaymentData(data);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    fetchFlowGateways();
  }, [fetchFlowGateways]);

  // Use all available gateways from the API response
  const availableGateways = paymentData?.available_gateways || [];

  return {
    paymentData,
    gateways: availableGateways,
    defaultGateway: null, // No longer using global primary gateway
    requireImmediatePayment: paymentData?.require_immediate_payment || false,
    loading,
    error,
    refetch: fetchFlowGateways,
  };
};

// Hook for managing a specific payment gateway
export const usePaymentGateway = (gatewayId?: number) => {
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGateway = useCallback(async () => {
    if (!gatewayId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await PaymentApi.getPaymentGateway(gatewayId);
      setGateway(data);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [gatewayId]);

  useEffect(() => {
    fetchGateway();
  }, [fetchGateway]);

  // Get supported payment methods for this gateway
  const supportedMethods = useMemo(() => {
    return gateway ? PaymentApi.getSupportedPaymentMethods(gateway) : [];
  }, [gateway]);

  // Get available features for this gateway
  const availableFeatures = useMemo(() => {
    return gateway ? PaymentApi.getAvailableFeatures(gateway) : [];
  }, [gateway]);

  // Check if gateway supports a specific feature
  const supportsFeature = useCallback((feature: string) => {
    return gateway ? PaymentApi.supportsFeature(gateway, feature) : false;
  }, [gateway]);

  return {
    gateway,
    loading,
    error,
    supportedMethods,
    availableFeatures,
    supportsFeature,
    isTestMode: gateway ? PaymentApi.isTestMode(gateway) : false,
    displayName: gateway ? PaymentApi.getGatewayDisplayName(gateway) : '',
    iconIdentifier: gateway ? PaymentApi.getGatewayIcon(gateway) : '',
    refetch: fetchGateway,
  };
};

// Hook for payment calculations
export const usePaymentCalculations = () => {
  const calculateDeposit = useCallback((
    totalAmount: string | number,
    depositType: 'PERCENTAGE' | 'FIXED',
    depositValue: string | number
  ) => {
    return PaymentApi.calculateDepositAmount(totalAmount, depositType, depositValue);
  }, []);

  const calculateRemaining = useCallback((
    totalAmount: string | number,
    depositAmount: string | number
  ) => {
    return PaymentApi.calculateRemainingBalance(totalAmount, depositAmount);
  }, []);

  // DEPRECATED: Use useCurrentCurrency hook instead for DRY compliance
  // This is kept for backward compatibility with legacy code
  const formatAmount = useCallback((
    amount: string | number,
    currency?: string
  ) => {
    return PaymentApi.formatAmount(amount, currency || 'PHP');
  }, []);

  const validateAmount = useCallback((
    gateway: PaymentGateway,
    amount: number
  ) => {
    return PaymentApi.validateAmountLimits(gateway, amount);
  }, []);

  return {
    calculateDeposit,
    calculateRemaining,
    formatAmount,
    validateAmount,
  };
};

// Hook for payment method validation and formatting
export const usePaymentValidation = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validatePaymentMethod = useCallback((
    gateway: PaymentGateway,
    paymentData: Record<string, unknown>
  ) => {
    const validation = PaymentApi.validatePaymentMethod(gateway, paymentData);
    setValidationErrors(validation.errors);
    return validation;
  }, []);

  const formatPaymentData = useCallback((
    gateway: PaymentGateway,
    paymentMethod: string,
    paymentType: 'FULL' | 'DEPOSIT',
    additionalData: Record<string, unknown> = {}
  ) => {
    return PaymentApi.formatPaymentData(gateway, paymentMethod, paymentType, additionalData);
  }, []);

  const clearErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  const getFieldError = useCallback((field: string) => {
    return validationErrors[field]?.[0];
  }, [validationErrors]);

  const hasFieldError = useCallback((field: string) => {
    return !!(validationErrors[field]?.length > 0);
  }, [validationErrors]);

  return {
    validationErrors,
    validatePaymentMethod,
    formatPaymentData,
    clearErrors,
    getFieldError,
    hasFieldError,
  };
};

// Hook for payment gateway configuration
export const useGatewayConfig = (gatewayCode?: string) => {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!gatewayCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await PaymentApi.getGatewayPublicConfig(gatewayCode);
      setConfig(data);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [gatewayCode]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
};

// Hook for payment flow management
export const usePaymentFlow = (
  totalAmount: string | number,
  gateway?: PaymentGateway,
  depositConfig?: {
    acceptDeposit: boolean;
    depositType: 'PERCENTAGE' | 'FIXED';
    depositAmount: string | number;
  }
) => {
  const [selectedPaymentType, setSelectedPaymentType] = useState<'FULL' | 'DEPOSIT'>('FULL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentData, setPaymentData] = useState<Record<string, unknown>>({});

  const { calculateDeposit, calculateRemaining, formatAmount, validateAmount } = usePaymentCalculations();
  const { validatePaymentMethod, formatPaymentData, validationErrors } = usePaymentValidation();

  // Calculate amounts based on payment type
  const amounts = useMemo(() => {
    const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    
    let depositAmount = 0;
    if (depositConfig?.acceptDeposit && selectedPaymentType === 'DEPOSIT') {
      depositAmount = calculateDeposit(
        total,
        depositConfig.depositType,
        depositConfig.depositAmount
      );
    }

    const dueNow = selectedPaymentType === 'DEPOSIT' ? depositAmount : total;
    const remaining = selectedPaymentType === 'DEPOSIT' ? calculateRemaining(total, depositAmount) : 0;

    return {
      total,
      deposit: depositAmount,
      dueNow,
      remaining,
      formattedTotal: formatAmount(total),
      formattedDeposit: formatAmount(depositAmount),
      formattedDueNow: formatAmount(dueNow),
      formattedRemaining: formatAmount(remaining),
    };
  }, [totalAmount, selectedPaymentType, depositConfig, calculateDeposit, calculateRemaining, formatAmount]);

  // Validate current payment setup
  const validation = useMemo(() => {
    if (!gateway) {
      return { isValid: false, errors: { gateway: ['Payment gateway is required'] } };
    }

    if (!selectedPaymentMethod) {
      return { isValid: false, errors: { payment_method: ['Payment method is required'] } };
    }

    const amountValidation = validateAmount(gateway, amounts.dueNow);
    if (!amountValidation.isValid) {
      return { isValid: false, errors: { amount: [amountValidation.error || 'Invalid amount'] } };
    }

    const methodValidation = validatePaymentMethod(gateway, paymentData);
    return methodValidation;
  }, [gateway, selectedPaymentMethod, amounts.dueNow, paymentData, validateAmount, validatePaymentMethod]);

  // Get formatted payment data for submission
  const getFormattedData = useCallback(() => {
    if (!gateway) return null;

    return formatPaymentData(
      gateway,
      selectedPaymentMethod,
      selectedPaymentType,
      paymentData
    );
  }, [gateway, selectedPaymentMethod, selectedPaymentType, paymentData, formatPaymentData]);

  // Update payment data
  const updatePaymentData = useCallback((newData: Record<string, unknown>) => {
    setPaymentData(prev => ({ ...prev, ...newData }));
  }, []);

  // Reset payment flow
  const resetPaymentFlow = useCallback(() => {
    setSelectedPaymentType('FULL');
    setSelectedPaymentMethod('');
    setPaymentData({});
  }, []);

  // Check if payment flow is complete
  const isComplete = useMemo(() => {
    return validation.isValid && selectedPaymentMethod && gateway;
  }, [validation.isValid, selectedPaymentMethod, gateway]);

  return {
    // Payment type and method selection
    selectedPaymentType,
    setSelectedPaymentType,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    
    // Payment data
    paymentData,
    updatePaymentData,
    
    // Calculated amounts
    amounts,
    
    // Validation
    validation,
    validationErrors,
    isComplete,
    
    // Actions
    getFormattedData,
    resetPaymentFlow,
  };
};

// Hook for payment gateway filtering and selection
export const useGatewaySelection = (availableGateways: PaymentGateway[] = []) => {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [filterCriteria, setFilterCriteria] = useState<{
    supportedMethods?: string[];
    requiredFeatures?: string[];
    environment?: 'test' | 'live';
  }>({});

  // Filter gateways based on criteria
  const filteredGateways = useMemo(() => {
    return availableGateways.filter(gateway => {
      // Filter by supported methods
      if (filterCriteria.supportedMethods?.length) {
        const gatewayMethods = PaymentApi.getSupportedPaymentMethods(gateway);
        const hasRequiredMethod = filterCriteria.supportedMethods.some(method =>
          gatewayMethods.includes(method)
        );
        if (!hasRequiredMethod) return false;
      }

      // Filter by required features
      if (filterCriteria.requiredFeatures?.length) {
        const hasAllFeatures = filterCriteria.requiredFeatures.every(feature =>
          PaymentApi.supportsFeature(gateway, feature)
        );
        if (!hasAllFeatures) return false;
      }

      // Filter by environment
      if (filterCriteria.environment) {
        const isTest = PaymentApi.isTestMode(gateway);
        if (filterCriteria.environment === 'test' && !isTest) return false;
        if (filterCriteria.environment === 'live' && isTest) return false;
      }

      return true;
    });
  }, [availableGateways, filterCriteria]);

  // Auto-select first gateway if none selected
  useEffect(() => {
    if (!selectedGateway && filteredGateways.length > 0) {
      setSelectedGateway(filteredGateways[0]);
    }
  }, [selectedGateway, filteredGateways]);

  // Update filter criteria
  const updateFilter = useCallback((newCriteria: Partial<typeof filterCriteria>) => {
    setFilterCriteria(prev => ({ ...prev, ...newCriteria }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilterCriteria({});
  }, []);

  return {
    selectedGateway,
    setSelectedGateway,
    filteredGateways,
    filterCriteria,
    updateFilter,
    clearFilters,
    availableCount: availableGateways.length,
    filteredCount: filteredGateways.length,
  };
};