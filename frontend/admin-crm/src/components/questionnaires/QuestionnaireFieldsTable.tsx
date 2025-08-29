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
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
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
        illustration="gradient"
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
          borderRadius: tokens.spacing.radius.xxl,
          overflow: 'hidden',
        }}
      >
        <Table size="small" sx={{ background: 'transparent' }}>
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
                  fontWeight: 600,
                  color: tokens.color.neutral[700],
                  borderBottom: `1px solid ${tokens.color.borders.glass}`,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  py: 2,
                },
              }}
            >
              <TableCell width="30px"></TableCell>
              <TableCell>
                <TableSortLabel
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: `${tokens.color.primary[500]} !important`,
                    },
                    '&:hover': {
                      color: tokens.color.primary[600],
                    },
                    '&.Mui-active': {
                      color: tokens.color.primary[600],
                    },
                  }}
                >
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
                  background: index % 2 === 0 
                    ? `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`
                    : 'transparent',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 20px ${tokens.color.primary[500]}08`,
                  },
                  '& .MuiTableCell-root': {
                    borderBottom: `1px solid ${tokens.color.borders.glass}`,
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
                    sx={{
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      borderRadius: tokens.spacing.radius.full,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'scale(1.05)',
                        border: `1px solid ${tokens.color.primary[300]}`,
                      },
                      '&:disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    {isDeleting && selectedField?.id === field.id ? (
                      <CircularProgress size={16} color="primary" />
                    ) : (
                      <MoreVertIcon fontSize="small" sx={{ color: tokens.color.neutral[600] }} />
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
            backdropFilter: 'blur(20px)',
            borderRadius: tokens.spacing.radius.lg,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
            boxShadow: `0 25px 80px ${tokens.color.neutral[900]}15`,
            minWidth: 200,
          },
        }}
      >
        <MenuItem 
          onClick={handleEdit}
          sx={{
            borderRadius: tokens.spacing.radius.md,
            mx: 1,
            my: 0.5,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`,
              transform: 'translateX(4px)',
            },
          }}
        >
          <ListItemIcon>
            <EditIcon 
              fontSize="small" 
              sx={{ color: tokens.color.primary[600] }} 
            />
          </ListItemIcon>
          <ListItemText 
            sx={{ 
              '& .MuiTypography-root': { 
                fontWeight: 500,
                color: tokens.color.neutral[700],
              } 
            }}
          >
            Edit Field
          </ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={handleDelete}
          sx={{
            borderRadius: tokens.spacing.radius.md,
            mx: 1,
            my: 0.5,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              background: `linear-gradient(135deg, ${tokens.color.error[50]} 0%, ${tokens.color.error[100]} 100%)`,
              transform: 'translateX(4px)',
            },
          }}
        >
          <ListItemIcon>
            <DeleteIcon 
              fontSize="small" 
              sx={{ color: tokens.color.error[600] }} 
            />
          </ListItemIcon>
          <ListItemText 
            sx={{ 
              '& .MuiTypography-root': { 
                fontWeight: 500,
                color: tokens.color.error[600],
              } 
            }}
          >
            Delete Field
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};