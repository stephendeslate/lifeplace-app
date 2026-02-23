import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { PaymentStatusChip, PaymentPlanStatusChip, InstallmentStatusChip } from './StatusChips';

describe('PaymentStatusChip', () => {
  it('renders CREATED label', () => {
    renderWithProviders(<PaymentStatusChip status="CREATED" />);
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('renders PENDING label', () => {
    renderWithProviders(<PaymentStatusChip status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders PROCESSING label', () => {
    renderWithProviders(<PaymentStatusChip status="PROCESSING" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders COMPLETED label', () => {
    renderWithProviders(<PaymentStatusChip status="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders FAILED label', () => {
    renderWithProviders(<PaymentStatusChip status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders CANCELLED label', () => {
    renderWithProviders(<PaymentStatusChip status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders REFUNDED label', () => {
    renderWithProviders(<PaymentStatusChip status="REFUNDED" />);
    expect(screen.getByText('Refunded')).toBeInTheDocument();
  });
});

describe('PaymentPlanStatusChip', () => {
  it('renders PENDING label', () => {
    renderWithProviders(<PaymentPlanStatusChip status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders ACTIVE label', () => {
    renderWithProviders(<PaymentPlanStatusChip status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders COMPLETED label', () => {
    renderWithProviders(<PaymentPlanStatusChip status="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders SUSPENDED label', () => {
    renderWithProviders(<PaymentPlanStatusChip status="SUSPENDED" />);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('renders DEFAULTED label', () => {
    renderWithProviders(<PaymentPlanStatusChip status="DEFAULTED" />);
    expect(screen.getByText('Defaulted')).toBeInTheDocument();
  });

  it('renders CANCELLED label', () => {
    renderWithProviders(<PaymentPlanStatusChip status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});

describe('InstallmentStatusChip', () => {
  it('renders PENDING label', () => {
    renderWithProviders(<InstallmentStatusChip status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders PAID label', () => {
    renderWithProviders(<InstallmentStatusChip status="PAID" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders PARTIAL label', () => {
    renderWithProviders(<InstallmentStatusChip status="PARTIAL" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('renders WAIVED label', () => {
    renderWithProviders(<InstallmentStatusChip status="WAIVED" />);
    expect(screen.getByText('Waived')).toBeInTheDocument();
  });

  it('renders CANCELLED label', () => {
    renderWithProviders(<InstallmentStatusChip status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders OVERDUE label', () => {
    renderWithProviders(<InstallmentStatusChip status="OVERDUE" />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});
