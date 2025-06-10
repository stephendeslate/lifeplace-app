// frontend/admin-crm/src/components/communications/TemplateList.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Message as MessageIcon,
  SearchOff as SearchOffIcon
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationTemplate, CommunicationFilters } from '../../types/communications.types';

interface TemplateListProps {
  onCreateClick: () => void;
  onEditClick: (template: CommunicationTemplate) => void;
  onPreviewClick: (template: CommunicationTemplate) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  onCreateClick,
  onEditClick,
  onPreviewClick
}) => {
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CommunicationTemplate | null>(null);

  const { useTemplates, useDeleteTemplate } = useCommunications();
  const { data: templates, isLoading } = useTemplates(filters);
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, template: CommunicationTemplate) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedTemplate here if delete dialog might be opening
  };

  const handleDeleteClick = () => {
    if (selectedTemplate) {
      setTemplateToDelete(selectedTemplate);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      console.log('Deleting template:', templateToDelete.id, templateToDelete.name);
      deleteTemplate(templateToDelete.id, {
        onSuccess: () => {
          console.log('Template deleted successfully');
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
          setSelectedTemplate(null);
        },
        onError: (error) => {
          console.error('Failed to delete template:', error);
          // Dialog will remain open so user can try again
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
    setSelectedTemplate(null);
  };

  const handleFilterChange = (key: keyof CommunicationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon /> : <SmsIcon />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SYSTEM': return 'primary';
      case 'AUTO': return 'secondary';
      case 'MANUAL': return 'default';
      default: return 'default';
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value);
  const filteredTemplatesCount = templates?.length || 0;

  // Empty state when no templates exist at all
  const renderNoTemplatesState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <MessageIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Communication Templates Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        Communication templates help you send consistent, professional messages to your clients. 
        Create your first template to get started with automated communications.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          You can create templates for:
        </Typography>
        <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap" mt={1}>
          <Chip 
            icon={<EmailIcon />} 
            label="Email Communications" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            icon={<SmsIcon />} 
            label="SMS Messages" 
            variant="outlined" 
            size="small" 
          />
        </Box>
      </Box>

      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={onCreateClick}
        sx={{ mt: 2 }}
      >
        Create Your First Template
      </Button>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> System templates for admin invitations and welcome emails are created automatically
      </Typography>
    </Paper>
  );

  // Empty state when filters return no results
  const renderNoResultsState = () => (
    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
      <SearchOffIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        No Templates Match Your Filters
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Try adjusting your search criteria or clearing filters to see more templates.
      </Typography>
      <Button variant="outlined" onClick={handleClearFilters}>
        Clear All Filters
      </Button>
    </Paper>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Show appropriate empty state
  if (!templates || templates.length === 0) {
    return (
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            Communication Templates
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateClick}
          >
            Create Template
          </Button>
        </Box>

        {hasActiveFilters ? renderNoResultsState() : renderNoTemplatesState()}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Communication Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredTemplatesCount} template{filteredTemplatesCount !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateClick}
        >
          Create Template
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search templates..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category || ''}
                label="Category"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="SYSTEM">System</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
                <MenuItem value="AUTO">Auto</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Channel</InputLabel>
              <Select
                value={filters.channel || ''}
                label="Channel"
                onChange={(e) => handleFilterChange('channel', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="SMS">SMS</MenuItem>
              </Select>
            </FormControl>
            {hasActiveFilters && (
              <Button variant="outlined" size="small" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell width="50"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates?.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getChannelIcon(template.channel)}
                      <Typography variant="body2" fontWeight="medium">
                        {template.name}
                      </Typography>
                      {template.is_system && (
                        <Chip label="System" size="small" color="info" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.channel}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.category}
                      size="small"
                      color={getCategoryColor(template.category) as any}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {template.subject_template || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(template.updated_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, template)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedTemplate) onPreviewClick(selectedTemplate);
          handleMenuClose();
          setSelectedTemplate(null);
        }}>
          <PreviewIcon sx={{ mr: 1 }} />
          Preview
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedTemplate) onEditClick(selectedTemplate);
          handleMenuClose();
          setSelectedTemplate(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedTemplate && !selectedTemplate.is_system && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};