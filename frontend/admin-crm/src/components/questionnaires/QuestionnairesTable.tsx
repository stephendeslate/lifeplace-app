// frontend/admin-crm/src/components/questionnaires/QuestionnairesTable.tsx

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
  Psychology as QuestionnaireIcon,
  EventNote as EventIcon,
  QuestionAnswer as FieldsIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import type { QuestionnaireTableProps } from '../../types/questionnaires.types';

export const QuestionnairesTable: React.FC<QuestionnaireTableProps> = ({
  questionnaires,
  isLoading,
  onEdit,
  onPreview,
  onDelete,
  onDuplicate,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, questionnaire: any) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedQuestionnaire(questionnaire);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedQuestionnaire(null);
  };

  const handleEdit = () => {
    if (selectedQuestionnaire) {
      onEdit(selectedQuestionnaire);
    }
    handleMenuClose();
  };

  const handlePreview = () => {
    if (selectedQuestionnaire && onPreview) {
      onPreview(selectedQuestionnaire);
    }
    handleMenuClose();
  };

  const handleDuplicate = () => {
    if (selectedQuestionnaire && onDuplicate) {
      onDuplicate(selectedQuestionnaire);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedQuestionnaire) {
      onDelete(selectedQuestionnaire.id);
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

  if (questionnaires.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={8}
        textAlign="center"
      >
        <QuestionnaireIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No questionnaires found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first questionnaire template to gather client information
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
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell align="center">Fields</TableCell>
              <TableCell align="center">Order</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questionnaires.map((questionnaire) => (
              <TableRow 
                key={questionnaire.id} 
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(questionnaire)}
              >
                <TableCell>
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
                </TableCell>
                <TableCell>
                  {getEventTypeChip(questionnaire.event_type_name)}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={`${questionnaire.fields_count || 0} fields in this questionnaire`}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <FieldsIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="medium">
                        {questionnaire.fields_count || 0}
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={questionnaire.order}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                </TableCell>
                <TableCell>
                  {getStatusChip(questionnaire.is_active)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(questionnaire.updated_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(questionnaire.updated_at).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, questionnaire)}
                    disabled={isDeleting}
                  >
                    {isDeleting && selectedQuestionnaire?.id === questionnaire.id ? (
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
          <ListItemText>Edit Questionnaire</ListItemText>
        </MenuItem>
        
        {onPreview && (
          <MenuItem onClick={handlePreview}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Preview Questionnaire</ListItemText>
          </MenuItem>
        )}
        
        {onDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <ListItemIcon>
              <QuestionnaireIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};