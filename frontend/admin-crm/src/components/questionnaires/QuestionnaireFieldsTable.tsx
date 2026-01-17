// frontend/admin-crm/src/components/questionnaires/QuestionnaireFieldsTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  CheckBox as RequiredIcon,
  CheckBoxOutlineBlank as OptionalIcon,
  List as OptionsIcon,
} from '@mui/icons-material';
import type { QuestionnaireFieldTableProps, QuestionnaireField } from '../../types/questionnaires.types';
import { ModernEmptyState } from '../common/ModernEmptyState';
import ModernLoadingStates from '../common/ModernLoadingStates';

export const QuestionnaireFieldsTable: React.FC<QuestionnaireFieldTableProps> = ({
  fields,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedField, setSelectedField] = useState<QuestionnaireField | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, field: QuestionnaireField) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedField(field);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedField(null);
  };

  const handleEdit = () => {
    if (selectedField) {
      onEdit(selectedField);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedField) {
      onDelete(selectedField.id);
    }
    handleMenuClose();
  };

  const getTypeChip = (type: string, typeDisplay: string) => {
    const colors = {
      text: 'default',
      number: 'primary',
      date: 'secondary',
      time: 'secondary',
      boolean: 'warning',
      select: 'info',
      'multi-select': 'info',
      email: 'success',
      phone: 'success',
      file: 'error',
    } as const;

    return (
      <Chip
        label={typeDisplay}
        size="small"
        color={colors[type as keyof typeof colors] || 'default'}
        variant="outlined"
      />
    );
  };

  const getRequiredIcon = (required: boolean) => {
    return required ? (
      <Tooltip title="Required field">
        <RequiredIcon color="error" fontSize="small" />
      </Tooltip>
    ) : (
      <Tooltip title="Optional field">
        <OptionalIcon color="disabled" fontSize="small" />
      </Tooltip>
    );
  };

  if (isLoading) {
    return (
      <ModernLoadingStates.ModernTableSkeleton 
        rows={3} 
        columns={6} 
        hasHeader 
      />
    );
  }

  if (fields.length === 0) {
    return (
      <ModernEmptyState
        icon={OptionsIcon}
        title="No fields configured"
        description="Add fields to this questionnaire to start collecting client information"
        size="small"
        tip={{
          text: "Fields define what information you collect from clients",
          type: "info"
        }}
      />
    );
  }

  return (
    <>
      <TableContainer
        sx={{
          background: 'transparent',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Table size="small" sx={{ background: 'transparent' }}>
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  bgcolor: 'grey.50',
                  fontWeight: 600,
                  color: 'text.secondary',
                  borderBottom: 1,
                  borderColor: 'divider',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  py: 2,
                },
              }}
            >
              <TableCell width="30px"></TableCell>
              <TableCell>
                <TableSortLabel>
                  Field Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Required</TableCell>
              <TableCell align="center">Order</TableCell>
              <TableCell>Options</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow
                key={field.id}
                sx={{
                  cursor: 'pointer',
                  bgcolor: index % 2 === 0 ? 'grey.50' : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '& .MuiTableCell-root': {
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 1.5,
                  },
                }}
                onClick={() => onEdit(field)}
              >
                <TableCell>
                  <DragIcon color="action" fontSize="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {field.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {getTypeChip(field.type, field.type_display)}
                </TableCell>
                <TableCell align="center">
                  {getRequiredIcon(field.required)}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={field.order}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                </TableCell>
                <TableCell>
                  {field.options && field.options.length > 0 ? (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <OptionsIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {field.options.length} option{field.options.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, field)}
                    disabled={isDeleting}
                  >
                    {isDeleting && selectedField?.id === field.id ? (
                      <CircularProgress size={16} color="primary" />
                    ) : (
                      <MoreVertIcon fontSize="small" />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            minWidth: 200,
          },
        }}
      >
        <MenuItem
          onClick={handleEdit}
          sx={{
            borderRadius: 1,
            mx: 1,
            my: 0.5,
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>
            Edit Field
          </ListItemText>
        </MenuItem>

        <MenuItem
          onClick={handleDelete}
          sx={{
            borderRadius: 1,
            mx: 1,
            my: 0.5,
            color: 'error.main',
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>
            Delete Field
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};