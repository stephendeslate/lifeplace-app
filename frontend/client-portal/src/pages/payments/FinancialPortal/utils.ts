// frontend/client-portal/src/pages/payments/FinancialPortal/utils.ts

import React from 'react';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';

export const getPaymentStatusIcon = (status: string): React.ReactElement => {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'COMPLETED':
      return React.createElement(CheckCircleIcon);
    case 'PENDING':
      return React.createElement(ScheduleIcon);
    case 'OVERDUE':
    case 'FAILED':
      return React.createElement(ErrorIcon);
    default:
      return React.createElement(ScheduleIcon);
  }
};

export const getPaymentMethodIcon = (method: string): React.ReactElement => {
  switch (method) {
    case 'CREDIT_CARD':
      return React.createElement(CreditCardIcon);
    case 'BANK_TRANSFER':
      return React.createElement(AccountBalanceIcon);
    case 'CHECK':
    case 'CASH':
      return React.createElement(ReceiptIcon);
    default:
      return React.createElement(PaymentIcon);
  }
};
