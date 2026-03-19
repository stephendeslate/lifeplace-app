import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { ConfigSection } from '@/components/common';
import type { CustomField } from './types';
import { FIELD_TYPES } from './types';

interface CustomFieldsSectionProps {
  customFields: CustomField[];
  onAdd: () => void;
  onEdit: (field: CustomField) => void;
  onDelete: (fieldId: string) => void;
  disabled: boolean;
}

export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  customFields,
  onAdd,
  onEdit,
  onDelete,
  disabled,
}) => (
  <ConfigSection title={`Custom Fields (${customFields.length})`}>
    <Box display="flex" justifyContent="flex-end" mb={2}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onAdd}
        size="small"
        disabled={disabled}
      >
        Add Custom Field
      </Button>
    </Box>

    {customFields.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No custom fields added. Custom fields allow you to collect additional information specific
        to your business needs.
      </Typography>
    ) : (
      <List dense>
        {customFields.map((field) => (
          <ListItem
            key={field.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <ListItemText
              primary={field.name}
              secondary={
                <Box display="flex" gap={1} mt={0.5}>
                  <Typography variant="caption" component="span">
                    Type: {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                  </Typography>
                  {field.required && (
                    <Typography variant="caption" component="span" color="error">
                      Required
                    </Typography>
                  )}
                  {field.type === 'select' && field.options && field.options.length > 0 && (
                    <Typography variant="caption" component="span" color="info.main">
                      {field.options.length} options
                    </Typography>
                  )}
                </Box>
              }
            />

            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={() => onEdit(field)}
                size="small"
                sx={{ mr: 1 }}
                disabled={disabled}
                aria-label={`Edit ${field.name}`}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                edge="end"
                onClick={() => onDelete(field.id)}
                size="small"
                color="error"
                disabled={disabled}
                aria-label={`Delete ${field.name}`}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    )}
  </ConfigSection>
);
