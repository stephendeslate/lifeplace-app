// frontend/admin-crm/src/components/common/TemplatePreviewDialog.tsx

import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

interface TemplatePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  templateName: string;
  templateType: 'communication' | 'contract';
  variables: string[];
  onPreview: (contextData: Record<string, unknown>) => Promise<{
    rendered_content: string;
    template_name: string;
    variables?: string[];
    [key: string]: unknown;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`preview-tabpanel-${index}`}
    aria-labelledby={`preview-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    )}
  </div>
);

export const TemplatePreviewDialog: React.FC<TemplatePreviewDialogProps> = ({
  open,
  onClose,
  templateName,
  templateType,
  variables,
  onPreview,
}) => {
  const [contextData, setContextData] = useState<Record<string, unknown>>({});
  const [previewData, setPreviewData] = useState<{
    rendered_content: string;
    template_name: string;
    [key: string]: unknown;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  // Initialize context data with sample values when dialog opens
  useEffect(() => {
    if (open && variables.length > 0) {
      const sampleData: Record<string, unknown> = {};
      
      variables.forEach(variable => {
        // Provide sample values based on variable names
        if (variable.includes('name')) {
          sampleData[variable] = 'John Doe';
        } else if (variable.includes('email')) {
          sampleData[variable] = 'john.doe@example.com';
        } else if (variable.includes('date')) {
          sampleData[variable] = new Date().toLocaleDateString();
        } else if (variable.includes('amount') || variable.includes('price') || variable.includes('total')) {
          sampleData[variable] = '50,000.00';
        } else if (variable.includes('venue')) {
          sampleData[variable] = 'Beautiful Gardens';
        } else if (variable.includes('time')) {
          sampleData[variable] = '3:00 PM';
        } else if (variable.includes('phone')) {
          sampleData[variable] = '+1 (555) 123-4567';
        } else if (variable.includes('address')) {
          sampleData[variable] = '123 Event Street, Manila, Philippines';
        } else {
          sampleData[variable] = `Sample ${variable}`;
        }
      });
      
      setContextData(sampleData);
    }
  }, [open, variables]);

  const handlePreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await onPreview(contextData);
      setPreviewData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  }, [contextData, onPreview]);

  // Generate preview when context data changes
  useEffect(() => {
    if (open && Object.keys(contextData).length > 0) {
      handlePreview();
    }
  }, [open, contextData, handlePreview]);

  const handleContextChange = (variable: string, value: string) => {
    setContextData(prev => ({
      ...prev,
      [variable]: value,
    }));
  };

  const handleClose = () => {
    setPreviewData(null);
    setError(null);
    setCurrentTab(0);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PreviewIcon color="primary" />
          <Box>
            <Typography variant="h6">
              Preview Template
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {templateName}
            </Typography>
          </Box>
          <Box ml="auto">
            <Chip
              label={templateType === 'communication' ? 'Communication' : 'Contract'}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
        >
          <Tab 
            icon={<CodeIcon />} 
            label="Variables" 
            iconPosition="start"
          />
          <Tab 
            icon={<VisibilityIcon />} 
            label="Preview" 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Template Variables ({variables.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Adjust the values below to see how they appear in the rendered template:
          </Typography>
          
          <Box mt={2}>
            {variables.length === 0 ? (
              <Alert severity="info">
                This template does not use any variables.
              </Alert>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {variables.map((variable) => (
                  <TextField
                    key={variable}
                    label={variable}
                    value={contextData[variable] || ''}
                    onChange={(e) => handleContextChange(variable, e.target.value)}
                    fullWidth
                    size="small"
                    helperText={`This value will replace {{${variable}}} in the template`}
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              Rendered Preview
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={handlePreview}
              disabled={isLoading}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {isLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {previewData && !isLoading && (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                backgroundColor: 'background.default',
                maxHeight: '400px',
                overflow: 'auto',
              }}
            >
              {templateType === 'communication' ? (
                <Box>
                  <Typography variant="body1" component="div">
                    <div dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(previewData.rendered_content.replace(/\n/g, '<br />'))
                    }} />
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <div dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(previewData.rendered_content)
                  }} />
                </Box>
              )}
            </Paper>
          )}
        </TabPanel>
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          startIcon={<CloseIcon />}
          color="inherit"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplatePreviewDialog;