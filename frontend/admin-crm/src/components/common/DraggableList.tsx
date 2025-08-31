// frontend/admin-crm/src/components/common/DraggableList.tsx

import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DroppableProvided,
} from '@hello-pangea/dnd';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Stack,
  Button,
  Alert,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  KeyboardArrowUp as MoveUpIcon,
  KeyboardArrowDown as MoveDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface DraggableItem {
  id: string | number;
  order?: number;
}

interface DraggableListProps<T extends DraggableItem> {
  items: T[];
  onReorder: (items: T[]) => Promise<void> | void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T) => string;
  showSaveButton?: boolean;
  enableKeyboardReorder?: boolean;
  emptyMessage?: string;
  isDragDisabled?: (item: T) => boolean;
  containerProps?: Record<string, unknown>;
}

export function DraggableList<T extends DraggableItem>({
  items,
  onReorder,
  renderItem,
  keyExtractor = (item) => String(item.id),
  showSaveButton = true,
  enableKeyboardReorder = true,
  emptyMessage = 'No items to reorder',
  isDragDisabled = () => false,
  containerProps = {},
}: DraggableListProps<T>) {
  const [orderedItems, setOrderedItems] = useState<T[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    // Sort items by order property if it exists
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setOrderedItems(sorted);
    setHasChanges(false);
  }, [items]);

  const handleDragStart = (result: { draggableId: string }) => {
    setDraggedItem(result.draggableId);
  };

  const handleDragEnd = (result: DropResult) => {
    setDraggedItem(null);

    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const newItems = Array.from(orderedItems);
    const [removed] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, removed);

    setOrderedItems(newItems);
    setHasChanges(true);

    // If not showing save button, auto-save
    if (!showSaveButton) {
      handleSave(newItems);
    }
  };

  const handleKeyboardReorder = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedItems.length) {
      return;
    }

    const newItems = Array.from(orderedItems);
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);

    setOrderedItems(newItems);
    setHasChanges(true);

    if (!showSaveButton) {
      handleSave(newItems);
    }
  };

  const handleSave = async (itemsToSave?: T[]) => {
    const finalItems = itemsToSave || orderedItems;
    
    // Update order properties
    const reorderedWithNewOrder = finalItems.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setIsSaving(true);
    try {
      await onReorder(reorderedWithNewOrder);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setOrderedItems(sorted);
    setHasChanges(false);
  };

  if (orderedItems.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box {...containerProps}>
      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          • Drag and drop items to reorder
          {enableKeyboardReorder && ' • Use arrow buttons for keyboard navigation'}
          {showSaveButton && ' • Changes are highlighted until saved'}
        </Typography>
      </Alert>

      {/* Action buttons */}
      {showSaveButton && (
        <Box display="flex" justifyContent="flex-end" gap={1} mb={2}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UndoIcon />}
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={() => handleSave()}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Order'}
          </Button>
        </Box>
      )}

      {/* Changes warning */}
      {hasChanges && showSaveButton && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Order has been modified. Click "Save Order" to apply changes.
          </Typography>
        </Alert>
      )}

      {/* Draggable list */}
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <Droppable droppableId="droppable-list">
          {(provided: DroppableProvided, snapshot) => (
            <Stack
              {...provided.droppableProps}
              ref={provided.innerRef}
              spacing={1}
              sx={{
                backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                borderRadius: 1,
                p: snapshot.isDraggingOver ? 1 : 0,
                transition: 'all 0.2s ease',
              }}
            >
              {orderedItems.map((item, index) => {
                const key = keyExtractor(item);
                const isDisabled = isDragDisabled(item);
                const originalIndex = items.findIndex(i => keyExtractor(i) === key);
                const hasOrderChanged = originalIndex !== index;

                return (
                  <Draggable 
                    key={key} 
                    draggableId={key} 
                    index={index}
                    isDragDisabled={isDisabled}
                  >
                    {(provided: DraggableProvided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          p: 2,
                          opacity: isDisabled ? 0.5 : 1,
                          border: 1,
                          borderColor: hasOrderChanged ? 'warning.main' : 'divider',
                          backgroundColor: snapshot.isDragging 
                            ? 'primary.50' 
                            : hasOrderChanged 
                            ? 'warning.50' 
                            : 'background.paper',
                          boxShadow: snapshot.isDragging ? 4 : 0,
                          cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                          transform: snapshot.isDragging 
                            ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                            : provided.draggableProps.style?.transform,
                          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                          '&:hover': {
                            borderColor: isDisabled ? 'divider' : 'primary.main',
                            boxShadow: isDisabled ? 0 : 1,
                          },
                          ...provided.draggableProps.style,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          {/* Drag handle */}
                          <Box
                            {...provided.dragHandleProps}
                            sx={{
                              cursor: isDisabled ? 'not-allowed' : 'grab',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Tooltip title={isDisabled ? 'Reordering disabled' : 'Drag to reorder'}>
                              <DragIcon 
                                color={isDisabled ? 'disabled' : 'action'}
                                sx={{
                                  '&:active': {
                                    cursor: 'grabbing',
                                  },
                                }}
                              />
                            </Tooltip>
                          </Box>

                          {/* Order indicator */}
                          <Box display="flex" alignItems="center" gap={1}>
                            {hasOrderChanged ? (
                              <>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textDecoration: 'line-through',
                                    color: 'text.disabled',
                                  }}
                                >
                                  {originalIndex + 1}
                                </Typography>
                                <Typography color="warning.main">→</Typography>
                                <Typography
                                  variant="h6"
                                  color="warning.main"
                                  fontWeight="bold"
                                >
                                  {index + 1}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="h6" color="primary.main">
                                {index + 1}
                              </Typography>
                            )}
                          </Box>

                          {/* Item content */}
                          <Box flex={1}>
                            {renderItem(item, index)}
                          </Box>

                          {/* Keyboard navigation buttons */}
                          {enableKeyboardReorder && !isDisabled && (
                            <Box display="flex" flexDirection="column">
                              <Tooltip title="Move up (Alt+↑)">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleKeyboardReorder(index, index - 1)}
                                    disabled={index === 0}
                                    sx={{ p: 0.5 }}
                                  >
                                    <MoveUpIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Move down (Alt+↓)">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleKeyboardReorder(index, index + 1)}
                                    disabled={index === orderedItems.length - 1}
                                    sx={{ p: 0.5 }}
                                  >
                                    <MoveDownIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>

      {/* Summary */}
      {orderedItems.length > 3 && (
        <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            Order: {orderedItems.map((item, idx) => `${idx + 1}. ${(item as {name?: string; title?: string}).name || (item as {name?: string; title?: string}).title || 'Item'}`).join(' → ')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}