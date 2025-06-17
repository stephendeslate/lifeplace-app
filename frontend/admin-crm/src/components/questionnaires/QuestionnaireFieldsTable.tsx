// frontend/admin-crm/src/components/questionnaires/QuestionnaireFieldsTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Skeleton,
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
import type { QuestionnaireFieldTableProps } from '../../types/questionnaires.types';

export const QuestionnaireFieldsTable: React.FC<QuestionnaireFieldTableProps> = ({
  fields,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedField, setSelectedField] = useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, field: any) => {
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
      <Box p={3}>
        {[...Array(3)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="20%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (fields.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={6}
        textAlign="center"
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No fields configured
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add fields to this questionnaire to start collecting client information
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
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
            {fields.map((field) => (
              <TableRow 
                key={field.id} 
                hover
                sx={{ cursor: 'pointer' }}
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
                      <CircularProgress size={16} />
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
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Field</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Field</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};