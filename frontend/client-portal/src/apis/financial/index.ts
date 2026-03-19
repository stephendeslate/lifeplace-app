// frontend/client-portal/src/apis/financial/index.ts
// Barrel file — reassembles the FinancialApi class interface from sub-modules

import * as payments from './payments';
import * as invoices from './invoices';
import * as paymentPlans from './payment-plans';
import * as paymentMethods from './payment-methods';
import * as refunds from './refunds';
import * as financialUtils from './financial-utils';
import * as currency from './currency';
import * as paymentGateway from './payment-gateway';

/**
 * Financial API service for client portal
 * All endpoints use the /payments/client/ prefix for client-specific access
 *
 * This class delegates to sub-modules while preserving the original static method interface
 * for backward compatibility with existing consumers.
 */
export class FinancialApi {
  // ==================== PAYMENTS ====================
  static getPayments = payments.getPayments;
  static getPayment = payments.getPayment;
  static getPaymentSummary = payments.getPaymentSummary;
  static getPaymentSettings = payments.getPaymentSettings;
  static getPaymentPlanSettings = payments.getPaymentPlanSettings;
  static downloadPaymentReceipt = payments.downloadPaymentReceipt;

  // ==================== INVOICES ====================
  static getInvoices = invoices.getInvoices;
  static getInvoice = invoices.getInvoice;
  static downloadInvoicePdf = invoices.downloadInvoicePdf;
  static payInvoice = invoices.payInvoice;
  static createInvoicePaymentIntent = invoices.createInvoicePaymentIntent;
  static createStripeSetupIntent = invoices.createStripeSetupIntent;
  static setupInvoicePaymentPlan = invoices.setupInvoicePaymentPlan;

  // ==================== PAYMENT PLANS ====================
  static getPaymentPlans = paymentPlans.getPaymentPlans;
  static getPaymentPlan = paymentPlans.getPaymentPlan;
  static payInstallment = paymentPlans.payInstallment;
  static calculatePaymentPlanProgress = paymentPlans.calculatePaymentPlanProgress;
  static isInstallmentOverdue = paymentPlans.isInstallmentOverdue;
  static getDaysUntilDue = paymentPlans.getDaysUntilDue;
  static getUpcomingInstallments = paymentPlans.getUpcomingInstallments;
  static getOverdueInstallments = paymentPlans.getOverdueInstallments;

  // ==================== PAYMENT METHODS ====================
  static getPaymentMethods = paymentMethods.getPaymentMethods;
  static getPaymentMethod = paymentMethods.getPaymentMethod;
  static createPaymentMethod = paymentMethods.createPaymentMethod;
  static updatePaymentMethod = paymentMethods.updatePaymentMethod;
  static deletePaymentMethod = paymentMethods.deletePaymentMethod;

  // ==================== REFUNDS ====================
  static getRefunds = refunds.getRefunds;
  static getRefund = refunds.getRefund;

  // ==================== UTILITY METHODS ====================
  static getStatusColor = financialUtils.getStatusColor;
  static handleError = financialUtils.handleError;
  static downloadFile = financialUtils.downloadFile;
  static calculateInvoicePaymentStatus = financialUtils.calculateInvoicePaymentStatus;
  static getInvoiceDisplayStatus = financialUtils.getInvoiceDisplayStatus;

  // ==================== CURRENCY UTILITIES ====================
  static formatAmount = currency.formatAmount;
  static getCurrencySymbol = currency.getCurrencySymbol;
  static readonly STRIPE_MINIMUM_CHARGE = currency.STRIPE_MINIMUM_CHARGE;
  static getMinimumCharge = currency.getMinimumCharge;
  static formatAmountWithSettings = currency.formatAmountWithSettings;
  static getCurrencySymbolFromSettings = currency.getCurrencySymbolFromSettings;
  static getAvailableCurrencies = currency.getAvailableCurrencies;
  static getDefaultCurrency = currency.getDefaultCurrency;

  // ==================== PAYMENT GATEWAY ====================
  static getActivePaymentGateways = paymentGateway.getActivePaymentGateways;
  static getClientPaymentGateways = paymentGateway.getClientPaymentGateways;
  static getAvailableGateways = paymentGateway.getAvailableGateways;
  static createPaymentIntent = paymentGateway.createPaymentIntent;
  static confirmPaymentIntent = paymentGateway.confirmPaymentIntent;
  static getGatewayHealth = paymentGateway.getGatewayHealth;
}

export default FinancialApi;

// Also re-export sub-modules for direct imports
export * from './payments';
export * from './invoices';
export * from './payment-plans';
export * from './payment-methods';
export * from './refunds';
export * from './financial-utils';
export * from './currency';
export * from './payment-gateway';
