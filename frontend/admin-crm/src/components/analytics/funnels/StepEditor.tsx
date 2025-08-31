// frontend/admin-crm/src/components/analytics/funnels/StepEditor.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  Chip,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { DraggableList } from '../../common/DraggableList';
import type { FunnelStep } from '../../../types/analytics.types';

interface StepEditorProps {
  steps: FunnelStep[];
  onChange: (steps: FunnelStep[]) => void;
  availableEvents?: string[];
}

interface EventSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (eventName: string) => void;
  availableEvents?: string[];
}

const EventSelector: React.FC<EventSelectorProps> = ({
  open,
  onClose,
  onSelect,
  availableEvents = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const commonEvents = [
    'page_view',
    'user_registration',
    'login',
    'add_to_cart',
    'initiate_checkout',
    'purchase',
    'booking_started',
    'booking_completed',
    'payment_initiated',
    'payment_completed',
    'form_submitted',
    'download_started',
    'video_watched',
    'email_subscribed',
  ];

  const allEvents = [...new Set([...commonEvents, ...availableEvents])];
  
  const filteredEvents = allEvents.filter(event =>
    event.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (eventName: string) => {
    onSelect(eventName);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EventIcon />
          Select Event
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 2 }}
          size="small"
        />
        
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <ListItem key={event} disablePadding>
                <ListItemButton onClick={() => handleSelect(event)}>
                  <ListItemText 
                    primary={event}
                    secondary={commonEvents.includes(event) ? 'Common event' : 'Custom event'}
                  />
                </ListItemButton>
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText 
                primary="No events found"
                secondary="Type a custom event name or check your search"
              />
            </ListItem>
          )}
        </List>
        
        {searchQuery && !filteredEvents.includes(searchQuery) && (
          <Box mt={2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleSelect(searchQuery)}
              startIcon={<AddIcon />}
            >
              Use "{searchQuery}" as custom event
            </Button>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

interface StepCardProps {
  step: FunnelStep;
  index: number;
  totalSteps: number;
  onUpdate: (updatedStep: Partial<FunnelStep>) => void;
  onRemove: () => void;
  availableEvents?: string[];
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  availableEvents,
}) => {
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getStepIcon = () => {
    if (index === 0) return <StartIcon color="success" />;
    if (index === totalSteps - 1) return <CompleteIcon color="primary" />;
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: 'info.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" fontWeight="bold">
          {index + 1}
        </Typography>
      </Box>
    );
  };

  const getStepType = () => {
    if (index === 0) return 'Start';
    if (index === totalSteps - 1) return 'Goal';
    return 'Step';
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
            {getStepIcon()}
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="h6">
                  {step.name || `Step ${index + 1}`}
                </Typography>
                <Chip 
                  label={getStepType()}
                  size="small"
                  color={index === 0 ? 'success' : index === totalSteps - 1 ? 'primary' : 'default'}
                  variant="outlined"
                />
              </Box>
              
              {!isEditing ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Event: {step.event_name || 'Not set'}
                  </Typography>
                  {step.description && (
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Step Name"
                    value={step.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    size="small"
                    fullWidth
                    required
                  />
                  
                  <Box display="flex" gap={1}>
                    <TextField
                      label="Event Name"
                      value={step.event_name}
                      onChange={(e) => onUpdate({ event_name: e.target.value })}
                      size="small"
                      fullWidth
                      required
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={() => setShowEventSelector(true)}
                            title="Browse events"
                          >
                            <SearchIcon />
                          </IconButton>
                        ),
                      }}
                    />
                  </Box>
                  
                  <TextField
                    label="Description (Optional)"
                    value={step.description || ''}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Describe what happens in this step..."
                  />
                </Stack>
              )}
            </Box>
            
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Tooltip title="Edit step">
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(!isEditing)}
                  color={isEditing ? 'primary' : 'default'}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Remove step">
                <IconButton
                  size="small"
                  onClick={onRemove}
                  disabled={totalSteps <= 2}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Step validation */}
          {(!step.name || !step.event_name) && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {!step.name && !step.event_name 
                ? 'Step name and event name are required'
                : !step.name 
                ? 'Step name is required'
                : 'Event name is required'
              }
            </Alert>
          )}
        </CardContent>
        
        {isEditing && (
          <CardActions>
            <Button
              size="small"
              onClick={() => setIsEditing(false)}
              disabled={!step.name || !step.event_name}
            >
              Done Editing
            </Button>
          </CardActions>
        )}
      </Card>

      <EventSelector
        open={showEventSelector}
        onClose={() => setShowEventSelector(false)}
        onSelect={(eventName) => onUpdate({ event_name: eventName })}
        availableEvents={availableEvents}
      />
    </>
  );
};

export const StepEditor: React.FC<StepEditorProps> = ({ 
  steps, 
  onChange, 
  availableEvents 
}) => {
  const addStep = () => {
    const newStep: FunnelStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event_name: '',
      name: '',
      description: '',
      order: steps.length,
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, updatedStep: Partial<FunnelStep>) => {
    const newSteps = steps.map((step, i) => 
      i === index ? { ...step, ...updatedStep } : step
    );
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    const reorderedSteps = newSteps.map((step, i) => ({ ...step, order: i }));
    onChange(reorderedSteps);
  };


  const isValid = steps.length >= 2 && steps.every(step => step.name && step.event_name);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6">
            Funnel Steps
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define the sequence of events that make up your conversion funnel
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addStep}
          size="small"
        >
          Add Step
        </Button>
      </Box>

      {steps.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Add at least 2 steps to create a conversion funnel. Steps represent events that users complete in sequence.
        </Alert>
      ) : (
        <DraggableList
          items={steps}
          onReorder={(reorderedSteps) => {
            const stepsWithNewOrder = reorderedSteps.map((step, i) => ({ ...step, order: i }));
            onChange(stepsWithNewOrder);
          }}
          renderItem={(step) => {
            const stepIndex = steps.findIndex(s => s === step);
            return (
              <Box sx={{ width: '100%' }}>
                <StepCard
                  step={step}
                  index={stepIndex}
                  totalSteps={steps.length}
                  onUpdate={(updatedStep) => updateStep(stepIndex, updatedStep)}
                  onRemove={() => removeStep(stepIndex)}
                  availableEvents={availableEvents}
                />
              </Box>
            );
          }}
          keyExtractor={(step) => step.id}
          showSaveButton={false}
          enableKeyboardReorder={true}
          emptyMessage="No steps added yet."
        />
      )}

      {/* Funnel Preview */}
      {steps.length > 0 && (
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Funnel Preview
          </Typography>
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <Chip 
                  icon={index === 0 ? <StartIcon /> : index === steps.length - 1 ? <CompleteIcon /> : undefined}
                  label={step.name || `Step ${index + 1}`} 
                  size="small" 
                  variant="outlined"
                  color={index === 0 ? 'success' : index === steps.length - 1 ? 'primary' : 'default'}
                />
                {index < steps.length - 1 && (
                  <Typography variant="body2" color="text.secondary">
                    →
                  </Typography>
                )}
              </React.Fragment>
            ))}
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Users will progress through {steps.length} steps to complete this funnel
          </Typography>
          
          {!isValid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {steps.length < 2 
                ? 'At least 2 steps are required'
                : 'All steps must have a name and event name'
              }
            </Alert>
          )}
        </Box>
      )}
    </Box>
    );
};