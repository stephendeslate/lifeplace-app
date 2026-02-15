// frontend/admin-crm/src/components/questionnaires/QuestionnairesTable.tsx

import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import {
  Psychology as QuestionnaireIcon,
  EventNote as EventIcon,
  QuestionAnswer as FieldsIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
} from "@mui/icons-material";
import type { Questionnaire } from "../../types/questionnaires.types";
import { ModernTable, ModernLoadingStates, ModernEmptyState } from "../common";
import type { ModernTableColumn, ModernTableAction } from "../common";

interface QuestionnaireTableProps {
  questionnaires: Questionnaire[];
  isLoading: boolean;
  onEdit: (questionnaire: Questionnaire) => void;
  onPreview?: (questionnaire: Questionnaire) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (questionnaire: Questionnaire) => void;
  isDeleting?: boolean;
}

export const QuestionnairesTable: React.FC<QuestionnaireTableProps> = ({
  questionnaires,
  isLoading,
  onEdit,
  onPreview,
  onDelete,
  onDuplicate,
  isDeleting = false,
}) => {
  const getStatusChip = (isActive: boolean) => (
    <Chip
      label={isActive ? "Active" : "Inactive"}
      size="small"
      color={isActive ? "success" : "default"}
      variant={isActive ? "filled" : "outlined"}
    />
  );

  const getEventTypeChip = (eventTypeName?: string) => {
    if (!eventTypeName) {
      return (
        <Chip
          label="Any Event Type"
          size="small"
          variant="outlined"
          color="default"
        />
      );
    }

    return (
      <Chip
        icon={<EventIcon />}
        label={eventTypeName}
        size="small"
        color="primary"
        variant="outlined"
      />
    );
  };

  const columns: ModernTableColumn[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (_, row) => {
        const questionnaire = row as unknown as Questionnaire;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <QuestionnaireIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {questionnaire.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {questionnaire.id}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: "event_type",
      label: "Event Type",
      hideBelow: "md",
      render: (_, row) => {
        const questionnaire = row as unknown as Questionnaire;
        return getEventTypeChip(questionnaire.event_type_name);
      },
    },
    {
      key: "fields",
      label: "Fields",
      align: "center",
      hideBelow: "md",
      render: (_, row) => {
        const questionnaire = row as unknown as Questionnaire;
        return (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={0.5}
          >
            <FieldsIcon fontSize="small" color="action" />
            <Typography variant="body2" fontWeight="medium">
              {questionnaire.fields_count || 0}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: "sort_order",
      label: "Order",
      align: "center",
      hideBelow: "lg",
      render: (_, row) => {
        const questionnaire = row as unknown as Questionnaire;
        return (
          <Typography variant="body2" color="text.secondary">
            {questionnaire.order || 0}
          </Typography>
        );
      },
    },
    {
      key: "is_active",
      label: "Status",
      render: (_, row) => {
        const questionnaire = row as unknown as Questionnaire;
        return getStatusChip(questionnaire.is_active);
      },
    },
    {
      key: "updated_at",
      label: "Last Updated",
      hideBelow: "lg",
      render: (_, row) => {
        const questionnaire = row as unknown as Questionnaire;
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              {new Date(questionnaire.updated_at).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(questionnaire.updated_at).toLocaleTimeString()}
            </Typography>
          </Box>
        );
      },
    },
  ];

  // Custom actions for questionnaires
  const actions: ModernTableAction[] = [
    ...(onPreview
      ? [
          {
            label: "Preview",
            icon: <ViewIcon fontSize="small" />,
            onClick: (row: Record<string, unknown>) =>
              onPreview && onPreview(row as unknown as Questionnaire),
          },
        ]
      : []),
    {
      label: "Edit",
      icon: <EditIcon fontSize="small" />,
      onClick: (row: Record<string, unknown>) =>
        onEdit(row as unknown as Questionnaire),
    },
    ...(onDuplicate
      ? [
          {
            label: "Duplicate",
            icon: <DuplicateIcon fontSize="small" />,
            onClick: (row: Record<string, unknown>) =>
              onDuplicate && onDuplicate(row as unknown as Questionnaire),
          },
        ]
      : []),
    {
      label: "Delete",
      icon: <DeleteIcon fontSize="small" />,
      onClick: (row) => onDelete((row as { id: number }).id),
      color: "error" as const,
    },
  ];

  if (isLoading) {
    return (
      <ModernLoadingStates.ModernTableSkeleton rows={5} columns={6} hasHeader />
    );
  }

  if (questionnaires.length === 0) {
    return (
      <ModernEmptyState
        icon={QuestionnaireIcon}
        title="No questionnaires found"
        description="Create your first questionnaire template to gather client information"
        size="medium"
        tip={{
          text: "Questionnaires help collect structured information from clients during booking",
          type: "info",
        }}
      />
    );
  }

  return (
    <ModernTable
      columns={
        columns as unknown as ModernTableColumn<Record<string, unknown>>[]
      }
      data={questionnaires as unknown as Record<string, unknown>[]}
      actions={
        actions as unknown as ModernTableAction<Record<string, unknown>>[]
      }
      onRowClick={(row) => onEdit(row as unknown as Questionnaire)}
      sortBy="sort_order"
      sortOrder="asc"
      loading={isDeleting}
    />
  );
};
