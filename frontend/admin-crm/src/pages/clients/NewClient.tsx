// frontend/admin-crm/src/pages/clients/NewClient.tsx

import React, { useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { People as PeopleIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { ClientForm } from '../../components/clients/ClientForm';
import { ModernPageLayout, ModernPageHeader } from '../../components/common';
import type { CreateClientData } from '../../types/clients.types';

export const NewClient: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const { createClient, isCreatingClient } = useClients();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Clients', path: '/clients' },
      { label: 'New Client' },
    ]);
  }, [setBreadcrumbs]);

  const handleSubmit = (data: CreateClientData) => {
    createClient(data, {
      onSuccess: (newClient) => {
        navigate(`/clients/${newClient.id}`);
      },
    });
  };

  const handleCancel = () => {
    navigate('/clients');
  };

  return (
    <ModernPageLayout backgroundPattern="default">
      <ModernPageHeader
        title="New Client"
        subtitle="Add a new client to your database"
        icon={<PeopleIcon />}
        size="medium"
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: 'New Client', current: true },
        ]}
        secondaryActions={[
          {
            label: 'Back to Clients',
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
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          <ClientForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isCreatingClient}
          />
        </Box>
      </Paper>
    </ModernPageLayout>
  );
};
