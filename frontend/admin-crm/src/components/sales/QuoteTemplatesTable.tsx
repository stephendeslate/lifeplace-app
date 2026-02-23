// frontend/admin-crm/src/components/sales/QuoteTemplatesTable.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  ContentCopy as DuplicateIcon,
  Assignment as TemplateIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { QuoteTemplate } from '../../types/sales.types';

interface QuoteTemplatesTableProps {
  templates: QuoteTemplate[];
  isLoading: boolean;
  onEdit: (template: QuoteTemplate) => void;
  onDelete: (id: number) => void;
  onView?: (template: QuoteTemplate) => void;
  onDuplicate?: (template: QuoteTemplate) => void;
  isDeleting: boolean;
}

export const QuoteTemplatesTable: React.FC<QuoteTemplatesTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  isDeleting,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<QuoteTemplate | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: QuoteTemplate) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleEdit = () => {
    if (selectedTemplate) {
      onEdit(selectedTemplate);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedTemplate) {
      onDelete(selectedTemplate.id);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedTemplate && onView) {
      onView(selectedTemplate);
    }
    handleMenuClose();
  };

  const handleDuplicate = () => {
    if (selectedTemplate && onDuplicate) {
      onDuplicate(selectedTemplate);
    }
    handleMenuClose();
  };

  const getStatusChip = (isActive: boolean) => {
    return (
      <Chip
        label={isActive ? 'Active' : 'Inactive'}
        color={isActive ? 'success' : 'default'}
        size="small"
        variant="filled"
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          height: '24px',
        }}
      />
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
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
        minHeight="300px"
        textAlign="center"
        p={3}
      >
        <TemplateIcon
          sx={{
            fontSize: 48,
            mb: 2,
          }}
          color="disabled"
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Quote Templates Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first quote template to get started with standardized quotes.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: 'none',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  bgcolor: 'grey.50',
                  borderBottom: 1,
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                },
              }}
            >
              <TableCell>Template Name</TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>Products</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Validity Days</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow
                key={template.id}
                hover
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'grey.50',
                  },
                  '& .MuiTableCell-root': {
                    borderBottom: 1,
                    borderColor: 'divider',
                  },
                }}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="600" color="text.primary">
                      {template.name}
                    </Typography>
                    {template.introduction && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}
                      >
                        {template.introduction}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {template.event_type_name || 'Any Event Type'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {template.products?.length || 0} products
                  </Typography>
                </TableCell>
                <TableCell>{getStatusChip(template.is_active)}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {template.default_validity_days} days
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, template)}
                    disabled={isDeleting}
                  >
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          },
        }}
      >
        {onView && (
          <MenuItem onClick={handleView} sx={{ fontSize: '0.875rem' }}>
            <ViewIcon sx={{ mr: 1.5, fontSize: 16 }} />
            View Template
          </MenuItem>
        )}
        <MenuItem onClick={handleEdit} sx={{ fontSize: '0.875rem' }}>
          <EditIcon sx={{ mr: 1.5, fontSize: 16 }} />
          Edit Template
        </MenuItem>
        {onDuplicate && (
          <MenuItem onClick={handleDuplicate} sx={{ fontSize: '0.875rem' }}>
            <DuplicateIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Duplicate Template
          </MenuItem>
        )}
        <MenuItem
          onClick={handleDelete}
          sx={{
            fontSize: '0.875rem',
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.50',
            },
          }}
        >
          <DeleteIcon sx={{ mr: 1.5, fontSize: 16 }} />
          Delete Template
        </MenuItem>
      </Menu>
    </>
  );
};
