// frontend/admin-crm/src/components/analytics/dashboards/DashboardGrid.tsx

import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Typography,
  Fab,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetForm } from '../widgets/WidgetForm';
import { useWidgets } from '../../../hooks/useAnalytics';
import type { Dashboard, Widget } from '../../../types/analytics.types';

interface DashboardGridProps {
  dashboard: Dashboard;
  widgets: Widget[];
  isEditable?: boolean;
  onWidgetUpdate?: (widget: Widget) => void;
  onWidgetDelete?: (widgetId: number) => void;
  onWidgetAdd?: (dashboardId: number) => void;
}

interface WidgetActionsProps {
  widget: Widget;
  onEdit: (widget: Widget) => void;
  onDelete: (widgetId: number) => void;
  onToggleVisibility: (widget: Widget) => void;
}

const WidgetActions: React.FC<WidgetActionsProps> = ({
  widget,
  onEdit,
  onDelete,
  onToggleVisibility,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(widget);
    handleClose();
  };

  const handleDelete = () => {
    onDelete(widget.id);
    handleClose();
  };

  const handleToggleVisibility = () => {
    onToggleVisibility(widget);
    handleClose();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': {
            bgcolor: 'background.paper',
            boxShadow: 2,
          },
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit Widget
        </MenuItem>
        <MenuItem onClick={handleToggleVisibility}>
          {widget.is_visible ? (
            <>
              <HideIcon sx={{ mr: 1 }} fontSize="small" />
              Hide Widget
            </>
          ) : (
            <>
              <ViewIcon sx={{ mr: 1 }} fontSize="small" />
              Show Widget
            </>
          )}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Widget
        </MenuItem>
      </Menu>
    </>
  );
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  dashboard,
  widgets,
  isEditable = false,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetAdd,
}) => {
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showWidgetForm, setShowWidgetForm] = useState(false);

  const { updateWidget, deleteWidget, isUpdatingWidget, isDeletingWidget } = useWidgets();

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowWidgetForm(true);
  };

  const handleDeleteWidget = async (widgetId: number) => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      deleteWidget(widgetId);
      onWidgetDelete?.(widgetId);
    }
  };

  const handleToggleVisibility = (widget: Widget) => {
    const updatedWidget = { is_visible: !widget.is_visible };
    updateWidget({ id: widget.id, data: updatedWidget });
    onWidgetUpdate?.({ ...widget, ...updatedWidget });
  };

  const handleWidgetFormSubmit = (data: any) => {
    if (editingWidget) {
      updateWidget({ id: editingWidget.id, data });
      onWidgetUpdate?.({ ...editingWidget, ...data });
    }
    setShowWidgetForm(false);
    setEditingWidget(null);
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    setShowWidgetForm(true);
    onWidgetAdd?.(dashboard.id);
  };

  const getWidgetGridStyles = (widget: Widget) => {
    const getWidgetSpan = (size: string) => {
      switch (size) {
        case 'SMALL': return { gridColumn: 'span 1', gridRow: 'span 1' };
        case 'MEDIUM': return { gridColumn: 'span 2', gridRow: 'span 1' };
        case 'LARGE': return { gridColumn: 'span 2', gridRow: 'span 2' };
        case 'WIDE': return { gridColumn: 'span 3', gridRow: 'span 1' };
        case 'EXTRA_WIDE': return { gridColumn: 'span 4', gridRow: 'span 1' };
        case 'TALL': return { gridColumn: 'span 1', gridRow: 'span 2' };
        default: return { gridColumn: 'span 2', gridRow: 'span 1' };
      }
    };

    return {
      position: 'relative' as const,
      opacity: widget.is_visible ? 1 : 0.5,
      transition: 'opacity 0.3s ease',
      ...getWidgetSpan(widget.size),
    };
  };

  // Sort widgets by order and position
  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    if (a.position_y !== b.position_y) {
      return a.position_y - b.position_y;
    }
    return a.position_x - b.position_x;
  });

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Dashboard Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: '250px',
          gap: 3,
          minHeight: widgets.length === 0 ? '400px' : 'auto',
        }}
      >
        {sortedWidgets.map((widget) => (
          <Box key={widget.id} sx={getWidgetGridStyles(widget)}>
            {isEditable && (
              <WidgetActions
                widget={widget}
                onEdit={handleEditWidget}
                onDelete={handleDeleteWidget}
                onToggleVisibility={handleToggleVisibility}
              />
            )}
            <WidgetRenderer widget={widget} />
          </Box>
        ))}

        {/* Empty State */}
        {widgets.length === 0 && (
          <Box
            sx={{
              gridColumn: 'span 4',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              py: 8,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No widgets added yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Add your first widget to start building this dashboard
            </Typography>
            {isEditable && (
              <Fab
                color="primary"
                variant="extended"
                onClick={handleAddWidget}
              >
                <AddIcon sx={{ mr: 1 }} />
                Add Widget
              </Fab>
            )}
          </Box>
        )}
      </Box>

      {/* Add Widget FAB */}
      {isEditable && widgets.length > 0 && (
        <Fab
          color="primary"
          onClick={handleAddWidget}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Widget Form Dialog */}
      <WidgetForm
        open={showWidgetForm}
        onClose={() => {
          setShowWidgetForm(false);
          setEditingWidget(null);
        }}
        editingWidget={editingWidget}
        dashboardId={dashboard.id}
        onSubmit={handleWidgetFormSubmit}
        isLoading={isUpdatingWidget}
      />

      {/* Loading/Error States */}
      {isDeletingWidget && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting widget...
        </Alert>
      )}
    </Box>
  );
};