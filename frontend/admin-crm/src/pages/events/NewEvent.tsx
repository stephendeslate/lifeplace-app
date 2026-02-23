// frontend/admin-crm/src/pages/events/NewEvent.tsx

import React, { useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { CalendarToday, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents } from '../../hooks/useEvents';
import { EventForm } from '../../components/events/EventForm';
import { ModernPageLayout, ModernPageHeader } from '../../components/common';
import type { CreateEventData } from '../../types/events.types';

export const NewEvent: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const { createEvent, isCreatingEvent } = useEvents();

  useEffect(() => {
    setBreadcrumbs([{ label: 'Events', path: '/events' }, { label: 'New Event' }]);
  }, [setBreadcrumbs]);

  const handleSubmit = (data: CreateEventData | Partial<CreateEventData>) => {
    createEvent(data as CreateEventData, {
      onSuccess: (newEvent) => {
        navigate(`/events/${newEvent.id}`);
      },
    });
  };

  const handleCancel = () => {
    navigate('/events');
  };

  return (
    <ModernPageLayout backgroundPattern="default">
      <ModernPageHeader
        title="New Event"
        subtitle="Create a new event to track and manage"
        icon={<CalendarToday />}
        size="medium"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'New Event', current: true },
        ]}
        secondaryActions={[
          {
            label: 'Back to Events',
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
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <EventForm onSubmit={handleSubmit} onCancel={handleCancel} isLoading={isCreatingEvent} />
        </Box>
      </Paper>
    </ModernPageLayout>
  );
};
