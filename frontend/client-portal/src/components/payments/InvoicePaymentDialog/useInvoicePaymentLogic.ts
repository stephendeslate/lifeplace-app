import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PaymentFlowResult, PaymentFlowError } from '@/types/unified-payment-flow.types';
import FinancialApi from '@/apis/financial';
import { usePaymentPlanSettings } from '@/hooks/usePaymentPlanSettings';
import { useCurrencySettings } from '@/hooks/useCurrency';
import type {
  Invoice,
  PaymentMethod,
  PaymentGateway,
  InvoicePaymentRequest,
  InvoicePaymentResponse,
} from '@/types/financial';

export interface InvoicePaymentDialogProps {
  open: boolean;
  invoice: Invoice;
  onClose: () => void;
  onPaymentSuccess?: (response: InvoicePaymentResponse) => void;
}

export function useInvoicePaymentLogic({
  invoice,
  onClose,
  onPaymentSuccess,
}: Pick<InvoicePaymentDialogProps, 'invoice' | 'onClose' | 'onPaymentSuccess'>) {
  const [paymentType, setPaymentType] = useState<'FULL' | 'DEPOSIT' | 'CUSTOM'>('FULL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [isAddingNewMethod, setIsAddingNewMethod] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  const { data: globalPaymentSettings, isLoading: isLoadingPaymentSettings } =
    usePaymentPlanSettings();
  const { formatAmount } = useCurrencySettings();

  const paymentAmounts = useMemo(() => {
    const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
    const remainingAmount = paymentStatus.amountRemaining;

    const effectiveTerms = invoice.effective_payment_terms;
    const depositPercentage =
      effectiveTerms?.deposit_percentage ?? globalPaymentSettings?.default_deposit_percentage ?? 0;
    const balanceDueDays =
      effectiveTerms?.balance_due_days ?? globalPaymentSettings?.balance_due_days ?? 0;

    if (depositPercentage === 0 && !effectiveTerms && !globalPaymentSettings) {
      return {
        full: remainingAmount,
        deposit: 0,
        depositPercentage: 0,
        remaining: 0,
        balanceDueDays: 0,
      };
    }

    const depositAmount = (parseFloat(invoice.total_amount) * depositPercentage) / 100;
    const balanceAmount = parseFloat(invoice.total_amount) - depositAmount;

    return {
      full: remainingAmount,
      deposit: depositAmount,
      depositPercentage,
      remaining: balanceAmount,
      balanceDueDays,
    };
  }, [invoice, globalPaymentSettings]);

  const isDepositAlreadyPaid = useMemo(() => {
    const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
    const depositAmount = paymentAmounts.deposit;

    return paymentStatus.amountPaid >= depositAmount;
  }, [invoice, paymentAmounts.deposit]);

  const calculatePaymentAmount = useCallback(() => {
    switch (paymentType) {
      case 'FULL':
        return paymentAmounts.full;
      case 'DEPOSIT':
        return paymentAmounts.deposit;
      case 'CUSTOM':
        return parseFloat(customAmount) || 0;
    }
  }, [paymentType, paymentAmounts, customAmount]);

  const validateCustomAmount = useCallback(
    (amount: string) => {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return 'Please enter a valid amount';
      }
      const minAmount = FinancialApi.getMinimumCharge(invoice.currency);
      const maxAmount = paymentAmounts.full;

      if (numAmount < minAmount) {
        return `Minimum payment is ${formatAmount(minAmount, invoice.currency)}`;
      }
      if (numAmount > maxAmount) {
        return `Amount cannot exceed remaining balance of ${formatAmount(maxAmount, invoice.currency)}`;
      }

      const remainingAfterPayment = maxAmount - numAmount;
      const gatewayMinimum = FinancialApi.getMinimumCharge(invoice.currency);

      if (numAmount < maxAmount && remainingAfterPayment < gatewayMinimum) {
        return `Remaining balance would be ${formatAmount(remainingAfterPayment, invoice.currency)}, which is below the minimum chargeable amount of ${formatAmount(gatewayMinimum, invoice.currency)}. Please pay the full amount of ${formatAmount(maxAmount, invoice.currency)}, or leave at least ${formatAmount(gatewayMinimum, invoice.currency)} remaining.`;
      }

      return null;
    },
    [paymentAmounts, invoice.currency, formatAmount],
  );

  useEffect(() => {
    if (paymentType === 'DEPOSIT' && isDepositAlreadyPaid) {
      setPaymentType('FULL');
    }
  }, [isDepositAlreadyPaid, paymentType]);

  const handlePaymentMethodSelect = (method: PaymentMethod | null) => {
    if (import.meta.env.DEV) {
      console.log('🔍 PAYMENT METHOD SELECT - Method changed:', {
        previousMethod: selectedPaymentMethod
          ? {
              id: selectedPaymentMethod.id,
              type: selectedPaymentMethod.type,
              nickname: selectedPaymentMethod.nickname,
            }
          : null,
        newMethod: method
          ? {
              id: method.id,
              type: method.type,
              nickname: method.nickname,
              gateway_details: !!method.gateway_details,
            }
          : null,
        wasAddingNew: isAddingNewMethod,
      });
    }

    setSelectedPaymentMethod(method);

    if (method) {
      setIsAddingNewMethod(false);
      setSelectedGateway(null);
      if (import.meta.env.DEV)
        console.log('✅ PAYMENT METHOD SELECT - Selected saved method, clearing gateway state');
    } else {
      setSelectedGateway(null);
      if (import.meta.env.DEV) console.log('🔄 PAYMENT METHOD SELECT - Cleared method selection');
    }

    setPaymentError(null);
  };

  const handleGatewaySelect = (gateway: PaymentGateway | null) => {
    setSelectedGateway(gateway);
    setPaymentError(null);
  };

  const handleFullPayment = async () => {
    if (import.meta.env.DEV) {
      console.log('🔍 PAYMENT DEBUG - handleFullPayment called with state:', {
        selectedPaymentMethod: selectedPaymentMethod
          ? {
              id: selectedPaymentMethod.id,
              type: selectedPaymentMethod.type,
              nickname: selectedPaymentMethod.nickname,
              gateway_details: selectedPaymentMethod.gateway_details,
              last_four: selectedPaymentMethod.last_four,
            }
          : null,
        selectedGateway: selectedGateway
          ? {
              id: selectedGateway.id,
              code: selectedGateway.code,
              name: selectedGateway.name,
            }
          : null,
        isAddingNewMethod,
        paymentType,
        customAmount: paymentType === 'CUSTOM' ? customAmount : null,
        invoice: {
          id: invoice.id,
          invoice_id: invoice.invoice_id,
          total_amount: invoice.total_amount,
        },
      });
    }

    if (paymentType === 'CUSTOM') {
      const error = validateCustomAmount(customAmount);
      if (error) {
        setPaymentError(error);
        return;
      }
    }

    if (!selectedPaymentMethod) {
      if (import.meta.env.DEV) console.error('❌ PAYMENT ERROR - No payment method selected');
      setPaymentError('Please select a payment method');
      return;
    }

    if (isAddingNewMethod) {
      const requiresGateway = ['CREDIT_CARD', 'DIGITAL_WALLET'].includes(
        selectedPaymentMethod.type,
      );
      if (import.meta.env.DEV) {
        console.log('🔍 PAYMENT DEBUG - New method validation:', {
          requiresGateway,
          selectedGateway: !!selectedGateway,
          paymentMethodType: selectedPaymentMethod.type,
        });
      }

      if (requiresGateway && !selectedGateway) {
        if (import.meta.env.DEV)
          console.error('❌ PAYMENT ERROR - Gateway required but not selected');
        setPaymentError('Please select a payment gateway');
        return;
      }
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      let paymentData: InvoicePaymentRequest;

      if (isAddingNewMethod) {
        paymentData = {
          payment_type: paymentType,
          gateway_code: selectedGateway?.code || 'stripe',
          gateway_id: selectedGateway?.id,
          notes: `${paymentType === 'CUSTOM' ? 'Custom' : paymentType === 'DEPOSIT' ? 'Deposit' : 'Full'} payment for invoice ${invoice.invoice_id}`,
        };
        if (paymentType === 'CUSTOM') {
          paymentData.amount = customAmount;
        }
        if (import.meta.env.DEV)
          console.log('🔍 PAYMENT DEBUG - New method payment data:', paymentData);
      } else {
        paymentData = {
          payment_type: paymentType,
          payment_method: selectedPaymentMethod.id,
          notes: `${paymentType === 'CUSTOM' ? 'Custom' : paymentType === 'DEPOSIT' ? 'Deposit' : 'Full'} payment for invoice ${invoice.invoice_id}`,
        };
        if (paymentType === 'CUSTOM') {
          paymentData.amount = customAmount;
        }
        if (import.meta.env.DEV)
          console.log('🔍 PAYMENT DEBUG - Saved method payment data:', paymentData);
      }

      if (import.meta.env.DEV) {
        console.log('🚀 PAYMENT DEBUG - About to call FinancialApi.payInvoice:', {
          invoiceId: invoice.id,
          paymentData,
          selectedPaymentMethodValid: !!selectedPaymentMethod?.id,
          isAddingNewMethod,
        });
      }

      const response = await FinancialApi.payInvoice(invoice.id, paymentData);

      setPaymentSuccess(true);
      onPaymentSuccess?.(response);

      setTimeout(() => {
        onClose();
        setPaymentSuccess(false);
      }, 2000);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleInvoicePaymentSuccess = useCallback(
    (result: PaymentFlowResult) => {
      if (result.mode === 'invoice' && result.invoiceResult) {
        setPaymentSuccess(true);
        setPaymentSuccessMessage(result.message || 'Payment processed successfully');

        const response: InvoicePaymentResponse = {
          payment: result.invoiceResult.payment,
          invoice: result.invoiceResult.invoice,
          success: true,
          message: result.message || 'Payment processed successfully',
        };

        onPaymentSuccess?.(response);

        setTimeout(() => {
          onClose();
          setPaymentSuccess(false);
          setPaymentSuccessMessage(null);
        }, 2000);
      }
    },
    [onPaymentSuccess, onClose],
  );

  const handleInvoicePaymentError = useCallback((error: PaymentFlowError) => {
    setPaymentError(error.message);
    setPaymentLoading(false);
  }, []);

  const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
  const canPay = paymentStatus.amountRemaining > 0;

  return {
    paymentType,
    setPaymentType,
    selectedPaymentMethod,
    selectedGateway,
    paymentLoading,
    paymentError,
    paymentSuccess,
    paymentSuccessMessage,
    savePaymentMethod,
    setSavePaymentMethod,
    isAddingNewMethod,
    setIsAddingNewMethod,
    customAmount,
    setCustomAmount,
    customAmountError,
    setCustomAmountError,
    isLoadingPaymentSettings,
    globalPaymentSettings,
    formatAmount,
    paymentAmounts,
    isDepositAlreadyPaid,
    calculatePaymentAmount,
    validateCustomAmount,
    handlePaymentMethodSelect,
    handleGatewaySelect,
    handleFullPayment,
    handleInvoicePaymentSuccess,
    handleInvoicePaymentError,
    paymentStatus,
    canPay,
  };
}
