// frontend/admin-crm/src/components/contracts/ContractTemplatesTable.tsx

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
  Description as ContractIcon,
  EventNote as EventIcon,
  Gavel as SignatureIcon,
  Business as CompanyIcon,
  VisibilityOff as WitnessIcon,
  FileCopy as DuplicateIcon,
} from '@mui/icons-material';
import type { ContractTemplateTableProps, ContractTemplate } from '../../types/contracts.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { ModernEmptyState } from '../common/ModernEmptyState';
import ModernLoadingStates from '../common/ModernLoadingStates';

export const ContractTemplatesTable: React.FC<ContractTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: ContractTemplate) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedTemplate(null);
  };

  const handleEdit = () => {
    if (selectedTemplate) {
      onEdit(selectedTemplate);
    }
    handleMenuClose();
  };

  const handleDuplicate = () => {
    if (selectedTemplate && onDuplicate) {
      onDuplicate(selectedTemplate);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedTemplate) {
      onDelete(selectedTemplate.id);
    }
    handleMenuClose();
  };

  const getRequirementChips = (template: ContractTemplate) => {
    const chips: React.ReactElement[] = [];
    
    if (template.requires_signature) {
      chips.push(
        <Chip
          key="signature"
          icon={<SignatureIcon />}
          label="Signature Required"
          size="small"
          color="primary"
          variant="outlined"
        />
      );
    }

    if (template.requires_company_signature) {
      chips.push(
        <Chip
          key="company"
          icon={<CompanyIcon />}
          label="Company Signature"
          size="small"
          color="secondary"
          variant="outlined"
        />
      );
    }

    if (template.requires_witness) {
      chips.push(
        <Chip
          key="witness"
          icon={<WitnessIcon />}
          label="Witness Required"
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    }

    return chips;
  };

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

  if (isLoading) {
    return (
      <ModernLoadingStates.ModernTableSkeleton 
        rows={5} 
        columns={7} 
        hasHeader 
      />
    );
  }

  if (templates.length === 0) {
    return (
      <ModernEmptyState
        icon={ContractIcon}
        title="No contract templates found"
        description="Create your first contract template to streamline your contract process"
        size="medium"
        illustration="gradient"
        tip={{
          text: "Contract templates help standardize legal documents across your events",
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
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: tokens.color.neutral[300],
            borderRadius: 4,
            '&:hover': {
              background: tokens.color.neutral[400],
            },
          },
        }}
      >
        <Table sx={{ background: 'transparent' }}>
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
                  fontWeight: 600,
                  color: tokens.color.neutral[700],
                  borderBottom: `1px solid ${tokens.color.borders.glass}`,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  py: 2.5,
                },
              }}
            >
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
                  Template Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>Requirements</TableCell>
              <TableCell>Variables</TableCell>
              <TableCell>Amendments</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template, index) => (
              <TableRow 
                key={template.id} 
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
                    py: 2.5,
                  },
                }}
                onClick={() => onEdit(template)}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ContractIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {template.name}
                      </Typography>
                      {template.description && (
                        <Typography variant="caption" color="text.secondary">
                          {template.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {getEventTypeChip(template.event_type_name)}
                </TableCell>
                <TableCell>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {getRequirementChips(template)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title={`${template.variables?.length || 0} variables available for this template`}>
                    <Chip
                      label={`${template.variables?.length || 0} variables`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={template.allows_amendments ? 'Allowed' : 'Not Allowed'}
                    size="small"
                    color={template.allows_amendments ? 'success' : 'default'}
                    variant={template.allows_amendments ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(template.updated_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(template.updated_at).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, template)}
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
                    {isDeleting && selectedTemplate?.id === template.id ? (
                      <CircularProgress size={20} color="primary" />
                    ) : (
                      <MoreVertIcon sx={{ color: tokens.color.neutral[600] }} />
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
            Edit Template
          </ListItemText>
        </MenuItem>
        
        {onDuplicate && (
          <MenuItem 
            onClick={handleDuplicate}
            sx={{
              borderRadius: tokens.spacing.radius.md,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.info[50]} 0%, ${tokens.color.info[100]} 100%)`,
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <DuplicateIcon 
                fontSize="small" 
                sx={{ color: tokens.color.info[600] }} 
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
              Duplicate Template
            </ListItemText>
          </MenuItem>
        )}
        
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
            Delete Template
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};