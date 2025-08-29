// Modern Glassmorphic Dashboard Grid
// Enhanced with drag-and-drop, smooth animations, and modern glassmorphic design

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Typography,
  Fab,
  Fade,
  Grow,
  Zoom,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Add as AddIcon,
  DragIndicator as DragIcon,
  GridView as GridViewIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetForm } from '../widgets/WidgetForm';
import { useWidgets } from '../../../hooks/useAnalytics';
import type { Dashboard, Widget } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

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
  isVisible: boolean;
}

interface WidgetContainerProps {
  widget: Widget;
  children: React.ReactNode;
  isEditable: boolean;
  onEdit: (widget: Widget) => void;
  onDelete: (widgetId: number) => void;
  onToggleVisibility: (widget: Widget) => void;
}

const WidgetActions: React.FC<WidgetActionsProps> = ({
  widget,
  onEdit,
  onDelete,
  onToggleVisibility,
  isVisible,
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
      <Fade in={isVisible} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 0.5,
            zIndex: 10,
          }}
        >
          <Tooltip title="Drag to reorder" placement="top">
            <IconButton
              size="small"
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.full,
                width: 28,
                height: 28,
                color: tokens.color.neutral[600],
                cursor: 'grab',
                
                '&:hover': {
                  ...glassPresets.medium,
                  transform: 'scale(1.1)',
                  color: tokens.color.primary[500],
                },
                '&:active': {
                  cursor: 'grabbing',
                }
              }}
            >
              <DragIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Widget options" placement="top">
            <IconButton
              size="small"
              onClick={handleClick}
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.full,
                width: 28,
                height: 28,
                color: tokens.color.neutral[600],
                
                '&:hover': {
                  ...glassPresets.medium,
                  transform: 'scale(1.1)',
                  color: tokens.color.primary[500],
                },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Fade>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            ...glassPresets.strong,
            borderRadius: tokens.spacing.radius.xl,
            border: `1px solid ${tokens.color.borders.glass}`,
            boxShadow: tokens.shadow.glass.floating,
            minWidth: 180,
          }
        }}
      >
        <MenuItem 
          onClick={handleEdit}
          sx={{
            borderRadius: tokens.spacing.radius.lg,
            mx: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: `${tokens.color.primary[500]}10`,
            }
          }}
        >
          <EditIcon sx={{ mr: 1.5, fontSize: 18, color: tokens.color.primary[500] }} />
          <Typography variant="body2" fontWeight={500}>Edit Widget</Typography>
        </MenuItem>
        <MenuItem 
          onClick={handleToggleVisibility}
          sx={{
            borderRadius: tokens.spacing.radius.lg,
            mx: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: `${tokens.color.warning[500]}10`,
            }
          }}
        >
          {widget.is_visible ? (
            <>
              <HideIcon sx={{ mr: 1.5, fontSize: 18, color: tokens.color.warning[500] }} />
              <Typography variant="body2" fontWeight={500}>Hide Widget</Typography>
            </>
          ) : (
            <>
              <ViewIcon sx={{ mr: 1.5, fontSize: 18, color: tokens.color.success[500] }} />
              <Typography variant="body2" fontWeight={500}>Show Widget</Typography>
            </>
          )}
        </MenuItem>
        <MenuItem 
          onClick={handleDelete} 
          sx={{ 
            borderRadius: tokens.spacing.radius.lg,
            mx: 1,
            color: tokens.color.error[500],
            '&:hover': {
              backgroundColor: `${tokens.color.error[500]}10`,
            }
          }}
        >
          <DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} />
          <Typography variant="body2" fontWeight={500}>Delete Widget</Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  children,
  isEditable,
  onEdit,
  onDelete,
  onToggleVisibility,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <Grow in={isLoaded} timeout={600}>
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          position: 'relative',
          opacity: widget.is_visible ? 1 : 0.6,
          transition: createTransition(['opacity', 'transform', 'box-shadow'], 'fast'),
          borderRadius: tokens.spacing.radius.xxl,
          overflow: 'hidden',
          
          '&:hover': {
            transform: widget.is_visible ? 'translateY(-4px) scale(1.02)' : 'none',
          },
          
          ...getWidgetSpan(widget.size),
        }}
      >
        {/* Widget Status Indicator */}
        {!widget.is_visible && (
          <Fade in timeout={300}>
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
              }}
            >
              <Chip
                label="Hidden"
                size="small"
                sx={{
                  ...glassPresets.light,
                  color: tokens.color.warning[700],
                  backgroundColor: `${tokens.color.warning[500]}20`,
                  border: `1px solid ${tokens.color.warning[500]}30`,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Fade>
        )}

        {/* Enhanced Widget Actions */}
        {isEditable && (
          <WidgetActions
            widget={widget}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleVisibility={onToggleVisibility}
            isVisible={isHovered || !widget.is_visible}
          />
        )}

        {children}
      </Box>
    </Grow>
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
  const [gridViewMode, setGridViewMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [isLoaded, setIsLoaded] = useState(false);

  const { updateWidget, deleteWidget, isUpdatingWidget, isDeletingWidget } = useWidgets();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

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

  const handleWidgetFormSubmit = useCallback((data: any) => {
    if (editingWidget) {
      updateWidget({ id: editingWidget.id, data });
      onWidgetUpdate?.({ ...editingWidget, ...data });
    }
    setShowWidgetForm(false);
    setEditingWidget(null);
  }, [editingWidget, updateWidget, onWidgetUpdate]);

  const handleAddWidget = useCallback(() => {
    setEditingWidget(null);
    setShowWidgetForm(true);
    onWidgetAdd?.(dashboard.id);
  }, [dashboard.id, onWidgetAdd]);

  const toggleGridViewMode = () => {
    setGridViewMode(current => current === 'comfortable' ? 'compact' : 'comfortable');
  };

  const gridConfig = useMemo(() => {
    const baseConfig = {
      comfortable: {
        columns: 'repeat(4, 1fr)',
        autoRows: '250px',
        gap: 3,
      },
      compact: {
        columns: 'repeat(6, 1fr)',
        autoRows: '200px',
        gap: 2,
      }
    };
    
    return baseConfig[gridViewMode];
  }, [gridViewMode]);

  // Sort widgets by order and position
  const sortedWidgets = useMemo(() => 
    [...widgets].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      if (a.position_y !== b.position_y) {
        return a.position_y - b.position_y;
      }
      return a.position_x - b.position_x;
    }), [widgets]
  );

  const visibleWidgets = sortedWidgets.filter(w => w.is_visible);
  const hiddenWidgets = sortedWidgets.filter(w => !w.is_visible);

  return (
    <Fade in={isLoaded} timeout={500}>
      <Box sx={{ position: 'relative' }}>
        {/* Modern Dashboard Header */}
        {(widgets.length > 0 || isEditable) && (
          <Fade in={isLoaded} timeout={700}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                p: 3,
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xl,
                border: `1px solid ${tokens.color.borders.glass}`,
              }}
            >
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700,
                    color: tokens.color.neutral[800],
                    mb: 0.5,
                  }}
                >
                  {dashboard.name}
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary">
                    {visibleWidgets.length} visible widgets
                  </Typography>
                  {hiddenWidgets.length > 0 && (
                    <Chip
                      size="small"
                      label={`${hiddenWidgets.length} hidden`}
                      sx={{
                        backgroundColor: `${tokens.color.warning[500]}20`,
                        color: tokens.color.warning[700],
                        fontSize: '0.75rem',
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                {isEditable && (
                  <>
                    <Tooltip title={`Switch to ${gridViewMode === 'comfortable' ? 'compact' : 'comfortable'} view`}>
                      <IconButton
                        onClick={toggleGridViewMode}
                        sx={{
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.full,
                          color: tokens.color.primary[500],
                          
                          '&:hover': {
                            ...glassPresets.medium,
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <GridViewIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Analytics Overview">
                      <IconButton
                        sx={{
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.full,
                          color: tokens.color.success[500],
                          
                          '&:hover': {
                            ...glassPresets.medium,
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <AnalyticsIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          </Fade>
        )}

        {/* Enhanced Dashboard Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: gridConfig.columns,
            gridAutoRows: gridConfig.autoRows,
            gap: gridConfig.gap,
            minHeight: widgets.length === 0 ? '500px' : 'auto',
            position: 'relative',
          }}
        >
          {sortedWidgets.map((widget, index) => (
            <Grow key={widget.id} in={isLoaded} timeout={600 + (index * 100)}>
              <Box>
                <WidgetContainer
                  widget={widget}
                  isEditable={isEditable}
                  onEdit={handleEditWidget}
                  onDelete={handleDeleteWidget}
                  onToggleVisibility={handleToggleVisibility}
                >
                  <WidgetRenderer 
                    widget={widget} 
                    compact={gridViewMode === 'compact'}
                  />
                </WidgetContainer>
              </Box>
            </Grow>
          ))}

          {/* Enhanced Empty State */}
          {widgets.length === 0 && (
            <Grow in={isLoaded} timeout={800}>
              <Box
                sx={{
                  gridColumn: gridViewMode === 'comfortable' ? 'span 4' : 'span 6',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  py: 8,
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.xxl,
                  border: `2px dashed ${tokens.color.borders.glass}`,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}05 0%, ${tokens.color.success[500]}05 100%)`,
                  position: 'relative',
                  overflow: 'hidden',
                  
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at 30% 30%, ${tokens.color.primary[500]}10 0%, transparent 70%)`,
                    pointerEvents: 'none',
                  }
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.success[500]} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      boxShadow: `0 8px 32px ${tokens.color.primary[500]}20`,
                    }}
                  >
                    <GridViewIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${tokens.color.neutral[700]} 0%, ${tokens.color.neutral[500]} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 2,
                    }}
                  >
                    No widgets yet
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
                    Transform your dashboard with interactive widgets. Add charts, metrics, and analytics to get insights at a glance.
                  </Typography>
                  {isEditable && (
                    <Zoom in={isLoaded} timeout={1000}>
                      <Fab
                        size="large"
                        onClick={handleAddWidget}
                        sx={{
                          background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                          color: 'white',
                          boxShadow: `0 8px 32px ${tokens.color.primary[500]}30`,
                          
                          '&:hover': {
                            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                            transform: 'translateY(-2px) scale(1.05)',
                            boxShadow: `0 12px 40px ${tokens.color.primary[500]}40`,
                          }
                        }}
                      >
                        <AddIcon sx={{ mr: 1 }} />
                        Add Widget
                      </Fab>
                    </Zoom>
                  )}
                </Box>
              </Box>
            </Grow>
          )}
        </Box>

        {/* Enhanced Add Widget FAB */}
        {isEditable && widgets.length > 0 && (
          <Zoom in={isLoaded} timeout={1000}>
            <Fab
              size="large"
              onClick={handleAddWidget}
              sx={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                zIndex: 1000,
                background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                color: 'white',
                boxShadow: tokens.shadow.glass.floating,
                border: `1px solid ${tokens.color.primary[300]}`,
                
                '&:hover': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                  transform: 'translateY(-4px) scale(1.1)',
                  boxShadow: `0 16px 40px ${tokens.color.primary[500]}40`,
                },
                
                '&:active': {
                  transform: 'translateY(-2px) scale(1.05)',
                }
              }}
            >
              <AddIcon sx={{ fontSize: 28 }} />
            </Fab>
          </Zoom>
        )}

        {/* Enhanced Widget Form Dialog */}
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

        {/* Enhanced Loading/Error States */}
        {isDeletingWidget && (
          <Fade in timeout={300}>
            <Box
              sx={{
                position: 'fixed',
                top: 24,
                right: 24,
                zIndex: 2000,
                ...glassPresets.strong,
                borderRadius: tokens.spacing.radius.xl,
                p: 2,
                border: `1px solid ${tokens.color.info[500]}30`,
                minWidth: 200,
              }}
            >
              <Alert 
                severity="info" 
                sx={{ 
                  bgcolor: 'transparent',
                  color: tokens.color.info[700],
                  '& .MuiAlert-icon': {
                    color: tokens.color.info[500],
                  }
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  Deleting widget...
                </Typography>
              </Alert>
            </Box>
          </Fade>
        )}
      </Box>
    </Fade>
  );
};