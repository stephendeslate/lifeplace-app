import React, { useState } from 'react';
import { List as StepsIcon } from '@mui/icons-material';
import { Box, Typography, Button } from '@mui/material';
import type { BookingFlowStep } from '@/types/bookingflows';
import type { ModernFormSection } from '@/components/common/ModernForm';
import type { HeaderAction } from '@/components/common/ModernPageHeader';
import { createStandardActions } from '@/components/common';
import { SettingsTable } from '@/components/common/settings/SettingsTable';
import { SettingsFormDialog } from '@/components/common/settings/SettingsFormDialog';
import type { SettingsTableColumn } from '@/components/common/settings';
import type { ModernTableAction } from '@/components/common/ModernTable';
import { columns } from './constants';

interface EmbeddedStepsTableProps {
  sortedSteps: BookingFlowStep[];
  isLoadingSteps: boolean;
  stepsError: Error | null;
  customTableActions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (step: BookingFlowStep) => void;
    color?: 'default' | 'primary' | 'secondary' | 'error';
    show?: (step: BookingFlowStep) => boolean;
  }>;
  customHeaderActions: HeaderAction[];
  handleCreate: (data: BookingFlowStep) => Promise<void>;
  handleUpdate: (id: string | number, data: BookingFlowStep) => Promise<void>;
  handleDelete: (id: string | number) => Promise<void>;
  defaultStepValues: BookingFlowStep;
  formSections: ModernFormSection[];
  isCreatingStep: boolean;
  isUpdatingStep: boolean;
  isDeletingStep: boolean;
}

export const EmbeddedStepsTable: React.FC<EmbeddedStepsTableProps> = ({
  sortedSteps,
  isLoadingSteps,
  stepsError,
  customTableActions,
  customHeaderActions,
  handleCreate,
  handleUpdate,
  handleDelete,
  defaultStepValues,
  formSections,
  isCreatingStep,
  isUpdatingStep,
  isDeletingStep,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BookingFlowStep | null>(null);

  const tableActions = [
    ...customTableActions.map((action) => ({
      ...action,
      onClick: action.onClick,
    })),
    ...createStandardActions(
      (item: BookingFlowStep) => {
        setEditingItem(item);
        setDialogOpen(true);
      },
      (item: BookingFlowStep) => handleDelete(item.id),
    ),
  ];

  const handleFormSubmit = async (formData: BookingFlowStep) => {
    if (editingItem) {
      await handleUpdate(editingItem.id, formData);
    } else {
      await handleCreate(formData);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleFormDelete = async (item: BookingFlowStep) => {
    await handleDelete(item.id);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Booking Flow Steps ({sortedSteps.length})</Typography>
        <Box display="flex" gap={1}>
          {customHeaderActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant === 'icon' ? 'outlined' : action.variant || 'outlined'}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          ))}
          <Button
            variant="contained"
            startIcon={<StepsIcon />}
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
            disabled={isCreatingStep}
          >
            {isCreatingStep ? 'Adding...' : 'Add Step'}
          </Button>
        </Box>
      </Box>

      <SettingsTable
        data={sortedSteps as unknown as Record<string, unknown>[]}
        columns={columns as unknown as SettingsTableColumn<Record<string, unknown>>[]}
        actions={tableActions as unknown as ModernTableAction<Record<string, unknown>>[]}
        searchable={true}
        searchFields={['step_type_display']}
        isLoading={isLoadingSteps}
        error={stepsError?.message}
        emptyState={{
          icon: <StepsIcon />,
          title: 'No steps configured',
          description: 'Add steps to guide clients through the booking process',
          primaryAction: {
            label: 'Add First Step',
            onClick: () => {
              setEditingItem(null);
              setDialogOpen(true);
            },
          },
        }}
      />

      <SettingsFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingItem(null);
        }}
        title="Booking Flow Step"
        subtitle="Configure step properties and behavior"
        sections={formSections}
        item={editingItem as unknown as Record<string, unknown> | null}
        defaultValues={defaultStepValues as unknown as Record<string, unknown>}
        onSubmit={async (data: Record<string, unknown>) =>
          handleFormSubmit(data as unknown as BookingFlowStep)
        }
        onDelete={
          editingItem
            ? async (item: Record<string, unknown>) =>
                handleFormDelete(item as unknown as BookingFlowStep)
            : undefined
        }
        maxWidth="lg"
        showDelete={Boolean(editingItem)}
        isSubmitting={editingItem ? isUpdatingStep : isCreatingStep}
        isDeleting={isDeletingStep}
      />
    </Box>
  );
};
