// frontend/admin-crm/src/components/contracts/ContractTemplatesTable.tsx

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
  Description as ContractIcon,
  EventNote as EventIcon,
  Gavel as SignatureIcon,
  Business as CompanyIcon,
  VisibilityOff as WitnessIcon,
  FileCopy as DuplicateIcon,
} from '@mui/icons-material';
import type { ContractTemplateTableProps } from '../../types/contracts.types';

export const ContractTemplatesTable: React.FC<ContractTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: any) => {
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

  const getRequirementChips = (template: any) => {
    const chips = [];
    
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
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="20%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (templates.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={8}
        textAlign="center"
      >
        <ContractIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No contract templates found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first contract template to streamline your contract process
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel>
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
            {templates.map((template) => (
              <TableRow 
                key={template.id} 
                hover
                sx={{ cursor: 'pointer' }}
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
                  >
                    {isDeleting && selectedTemplate?.id === template.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <MoreVertIcon />
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
          <ListItemText>Edit Template</ListItemText>
        </MenuItem>
        
        {onDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <ListItemIcon>
              <DuplicateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate Template</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Template</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};