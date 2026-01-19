// frontend/admin-crm/src/pages/payments/NewPayment.tsx

import React, { useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { Payment as PaymentIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { usePayments } from '../../hooks/usePayments';
import { PaymentForm } from '../../components/payments/PaymentForm';
import { ModernPageLayout, ModernPageHeader } from '../../components/common';
import type { CreatePaymentData } from '../../types/payments.types';

export const NewPayment: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const { createPayment, isCreatingPayment } = usePayments();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Payments', path: '/payments' },
      { label: 'New Payment' },
    ]);
  }, [setBreadcrumbs]);

  const handleSubmit = (data: CreatePaymentData) => {
    createPayment(data, {
      onSuccess: (newPayment) => {
        navigate(`/payments/${newPayment.id}`);
      },
    });
  };

  const handleCancel = () => {
    navigate('/payments');
  };

  return (
    <ModernPageLayout backgroundPattern="default">
      <ModernPageHeader
        title="New Payment"
        subtitle="Record a new payment for an event"
        icon={<PaymentIcon />}
        size="medium"
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'New Payment', current: true },
        ]}
        secondaryActions={[
          {
            label: 'Back to Payments',
            icon: <ArrowBackIcon />,
            onClick: handleCancel,
            variant: 'outlined',
          },
        ]}
      />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <PaymentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isCreatingPayment}
          />
        </Box>
      </Paper>
    </ModernPageLayout>
  );
};
