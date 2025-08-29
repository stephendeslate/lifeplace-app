import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Fade,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  AutorenewOutlined as AutoSaveIcon,
  Preview as PreviewIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';
import type { ProgressiveFormProps, AutoSaveState, SettingsFormSection } from '../../types/enhanced-settings.types';

export const ProgressiveForm: React.FC<ProgressiveFormProps> = ({
  sections,
  onSubmit,
  autoSave = false,
  preview = false,
  completionTracking = true,
  variant = 'accordion',
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>([sections[0]?.id]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [history] = useState<Array<Record<string, unknown>>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    isDirty: false,
    isSaving: false,
  });
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const completedSections = sections.filter(s => s.isComplete).length;
    return (completedSections / sections.length) * 100;
  }, [sections]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !autoSaveState.isDirty) return;

    const saveTimer = setTimeout(() => {
      setAutoSaveState(prev => ({ ...prev, isSaving: true }));
      
      // Simulate save operation
      setTimeout(() => {
        onSubmit(formData);
        setAutoSaveState({
          isDirty: false,
          isSaving: false,
          lastSaved: new Date().toISOString(),
        });
        setShowSaveNotification(true);
      }, 1000);
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [autoSave, autoSaveState.isDirty, formData, onSubmit]);

  // Handler for data changes - currently not used but will be needed for form integration
  // const handleDataChange = (newData: Record<string, unknown>) => {
  //   setFormData(prev => {
  //     const updated = { ...prev, ...newData };
      
  //     // Add to history for undo/redo
  //     if (historyIndex < history.length - 1) {
  //       setHistory(history.slice(0, historyIndex + 1));
  //     }
  //     setHistory(prev => [...prev, updated]);
  //     setHistoryIndex(prev => prev + 1);
      
  //     return updated;
  //   });
  //   setAutoSaveState(prev => ({ ...prev, isDirty: true }));
  // };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setFormData(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setFormData(history[historyIndex + 1]);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderSection = (section: SettingsFormSection) => {
    const isExpanded = expandedSections.includes(section.id);
    const hasErrors = section.validationErrors && section.validationErrors.length > 0;

    return (
      <Accordion
        key={section.id}
        expanded={isExpanded}
        onChange={() => toggleSection(section.id)}
        sx={{
          mb: 2,
          boxShadow: theme.shadows[1],
          '&:before': { display: 'none' },
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.3s',
          ...(isExpanded && {
            boxShadow: theme.shadows[3],
          }),
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6" fontWeight={600}>
                {section.title}
              </Typography>
              {section.description && !isExpanded && (
                <Typography variant="body2" color="text.secondary">
                  {section.description}
                </Typography>
              )}
            </Box>
            
            <Box display="flex" gap={1} mr={2}>
              {section.isComplete && (
                <Chip
                  icon={<CheckIcon fontSize="small" />}
                  label="Complete"
                  size="small"
                  color="success"
                  variant="filled"
                />
              )}
              {hasErrors && (
                <Chip
                  icon={<WarningIcon fontSize="small" />}
                  label={`${section.validationErrors!.length} issues`}
                  size="small"
                  color="error"
                  variant="filled"
                />
              )}
            </Box>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 3 }}>
          {section.description && isExpanded && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {section.description}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {section.fields}
          </Box>

          {hasErrors && (
            <Box mt={2}>
              {section.validationErrors!.map((error, idx) => (
                <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                  {error}
                </Alert>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderSteppedForm = () => (
    <Stepper activeStep={activeStep} orientation="vertical">
      {sections.map((section, index) => (
        <Step key={section.id}>
          <StepLabel
            error={section.validationErrors && section.validationErrors.length > 0}
            optional={section.description && (
              <Typography variant="caption">{section.description}</Typography>
            )}
          >
            {section.title}
          </StepLabel>
          <StepContent>
            <Box sx={{ mb: 2 }}>
              {section.fields}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => setActiveStep(index + 1)}
                disabled={index === sections.length - 1}
              >
                Continue
              </Button>
              <Button
                disabled={index === 0}
                onClick={() => setActiveStep(index - 1)}
              >
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );

  const renderTabbedForm = () => (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
        }}
      >
        {sections.map((section) => (
          <Tab
            key={section.id}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                {section.title}
                {section.isComplete && (
                  <CheckIcon fontSize="small" color="success" />
                )}
                {section.validationErrors && section.validationErrors.length > 0 && (
                  <WarningIcon fontSize="small" color="error" />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>
      
      {sections.map((section, index) => (
        <Box
          key={section.id}
          hidden={activeTab !== index}
          sx={{ pt: 2 }}
        >
          {section.description && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {section.description}
            </Alert>
          )}
          {section.fields}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          p: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
        }}
      >
        <Box display="flex" gap={2} alignItems="center">
          {completionTracking && (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress
                variant="determinate"
                value={calculateCompletion()}
                size={40}
                thickness={4}
                sx={{
                  color: calculateCompletion() === 100 ? 'success.main' : 'primary.main',
                }}
              />
              <Typography variant="body2" fontWeight={600}>
                {Math.round(calculateCompletion())}% Complete
              </Typography>
            </Box>
          )}

          {autoSave && (
            <Fade in={true}>
              <Chip
                icon={autoSaveState.isSaving ? (
                  <CircularProgress size={16} thickness={2} />
                ) : (
                  <AutoSaveIcon />
                )}
                label={
                  autoSaveState.isSaving
                    ? 'Saving...'
                    : autoSaveState.lastSaved
                    ? `Saved ${new Date(autoSaveState.lastSaved).toLocaleTimeString()}`
                    : 'Auto-save enabled'
                }
                size="small"
                color={autoSaveState.isSaving ? 'warning' : 'success'}
                variant="outlined"
              />
            </Fade>
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Tooltip title="Undo">
            <IconButton
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              size="small"
            >
              <UndoIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Redo">
            <IconButton
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              size="small"
            >
              <RedoIcon />
            </IconButton>
          </Tooltip>

          {preview && (
            <Tooltip title="Preview Changes">
              <IconButton
                onClick={() => setPreviewMode(!previewMode)}
                color={previewMode ? 'primary' : 'default'}
                size="small"
              >
                <PreviewIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Form Content */}
      <Box sx={{ mb: 4 }}>
        {variant === 'accordion' && sections.map(renderSection)}
        {variant === 'stepped' && renderSteppedForm()}
        {variant === 'tabs' && renderTabbedForm()}
      </Box>

      {/* Submit Button */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        {previewMode && (
          <Button variant="outlined" onClick={() => setPreviewMode(false)}>
            Exit Preview
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          startIcon={autoSaveState.isSaving ? (
            <CircularProgress size={20} />
          ) : (
            <SaveIcon />
          )}
          disabled={autoSaveState.isSaving}
          size="large"
          sx={{
            minWidth: 160,
            boxShadow: theme.shadows[2],
            '&:hover': {
              boxShadow: theme.shadows[4],
            },
          }}
        >
          {autoSaveState.isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </Box>

      {/* Save Notification */}
      <Snackbar
        open={showSaveNotification}
        autoHideDuration={3000}
        onClose={() => setShowSaveNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowSaveNotification(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Settings saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};