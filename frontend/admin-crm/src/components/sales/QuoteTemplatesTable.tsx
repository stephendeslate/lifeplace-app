// frontend/admin-crm/src/components/sales/QuoteTemplatesTable.tsx

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
  Description as QuoteIcon,
  EventNote as EventIcon,
  Inventory as ProductIcon,
  AccessTime as DurationIcon,
  FileCopy as DuplicateIcon,
} from '@mui/icons-material';
import type { QuoteTemplateTableProps } from '../../types/sales.types';

export const QuoteTemplatesTable: React.FC<QuoteTemplateTableProps> = ({
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

  const getStatusChip = (isActive: boolean) => (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
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

  const getValidityChip = (days: number) => (
    <Chip
      icon={<DurationIcon />}
      label={`${days} days`}
      size="small"
      color="info"
      variant="outlined"
    />
  );

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="10%" />
            <Skeleton variant="text" width="15%" />
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
        <QuoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No quote templates found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first quote template to streamline your sales process
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
              <TableCell align="center">Products</TableCell>
              <TableCell align="center">Validity</TableCell>
              <TableCell>Options</TableCell>
              <TableCell>Status</TableCell>
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
                    <QuoteIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {template.name}
                      </Typography>
                      {template.introduction && (
                        <Typography variant="caption" color="text.secondary">
                          {template.introduction.length > 60 
                            ? `${template.introduction.substring(0, 60)}...` 
                            : template.introduction}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {getEventTypeChip(template.event_type_name)}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={`${template.products?.length || 0} products in this template`}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <ProductIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="medium">
                        {template.products?.length || 0}
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  {getValidityChip(template.default_validity_days)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={template.has_multiple_options ? 'Multiple Options' : 'Single Option'}
                    size="small"
                    color={template.has_multiple_options ? 'secondary' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {getStatusChip(template.is_active)}
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