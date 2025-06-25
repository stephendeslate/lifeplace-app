// frontend/admin-crm/src/components/notes/NoteCard.tsx

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { NoteCardProps } from '../../types/notes.types';

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
  allowEdit = true,
  allowDelete = true,
  compact = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(note);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(note.id);
    }
    handleMenuClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldTruncate = compact && note.content.length > 150;
  const displayContent = shouldTruncate && !expanded 
    ? note.content.substring(0, 150) + '...'
    : note.content;

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 1,
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      <CardContent sx={{ pb: compact ? 2 : 3, '&:last-child': { pb: compact ? 2 : 3 } }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1} minWidth={0}>
            {note.title && (
              <Typography 
                variant={compact ? "subtitle2" : "h6"} 
                fontWeight="medium" 
                gutterBottom
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mr: 1,
                }}
              >
                {note.title}
              </Typography>
            )}
            
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              {note.created_by_name && (
                <Chip
                  icon={<PersonIcon />}
                  label={note.created_by_name}
                  size="small"
                  variant="outlined"
                  sx={{ height: 24, fontSize: '0.75rem' }}
                />
              )}
              
              <Tooltip title={new Date(note.created_at).toLocaleString()}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(note.created_at)}
                </Typography>
              </Tooltip>
              
              {note.updated_at !== note.created_at && (
                <Tooltip title={`Updated: ${new Date(note.updated_at).toLocaleString()}`}>
                  <Typography variant="caption" color="text.secondary">
                    (edited)
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </Box>

          {(allowEdit || allowDelete) && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{ ml: 1, flexShrink: 0 }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Content */}
        <Typography 
          variant="body2" 
          color="text.primary"
          sx={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            mt: 1,
          }}
        >
          {displayContent}
        </Typography>

        {/* Expand/Collapse for long content */}
        {shouldTruncate && (
          <Box display="flex" justifyContent="center" mt={1}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ 
                fontSize: '0.75rem',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.50',
                },
              }}
            >
              {expanded ? (
                <>
                  <ExpandLessIcon fontSize="small" />
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    Show Less
                  </Typography>
                </>
              ) : (
                <>
                  <ExpandMoreIcon fontSize="small" />
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    Show More
                  </Typography>
                </>
              )}
            </IconButton>
          </Box>
        )}
      </CardContent>

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
      >
        {allowEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Note</ListItemText>
          </MenuItem>
        )}
        
        {allowDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Note</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};