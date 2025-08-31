// frontend/admin-crm/src/components/sales/QuoteTemplateForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  FormControlLabel,
  Switch,
  Chip,
  Paper,
  Autocomplete
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useEventTypes } from '../../hooks/useEvents';
import { useProducts } from '../../hooks/useProducts';
import { useCreateQuoteTemplate, useUpdateQuoteTemplate } from '../../hooks/useSales';
import { formatCurrency } from '../../utils/currency';
import { sanitizeHTML } from '../../utils/security';
import type { 
  QuoteTemplate, 
  CreateQuoteTemplateData,
  CreateQuoteTemplateProductData,
} from '../../types/sales.types';
import type { ProductOption } from '../../types/products.types';
import RichTextEditor from '../shared/RichTextEditor';
import QuoteVariableInserter from './QuoteVariableInserter';

interface QuoteTemplateFormProps {
  template?: QuoteTemplate;
  onSave: () => void;
  onCancel: () => void;
}

const quoteTemplateStarters = {
  wedding_quote: {
    introduction: `<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-size: 24px; color: #1976d2;">Wedding Services Proposal</h1>
  <p style="font-size: 16px;">For {{ client_name }}</p>
</div>

<p>Dear {{ client_first_name }},</p>

<p>Thank you for considering <strong>{{ company_name }}</strong> for your special day. We are excited to present this comprehensive proposal for your wedding celebration on <strong>{{ event_date }}</strong> at <strong>{{ event_venue }}</strong>.</p>

<p>We understand that your wedding day is one of the most important days of your life, and we are committed to making it absolutely perfect. Our team of experienced professionals will work closely with you to ensure every detail is executed flawlessly.</p>`,
    terms: `<h2>Terms and Conditions</h2>

<h3>Payment Terms</h3>
<ul>
  <li>A {{ deposit_percentage }}% deposit is required to secure your date</li>
  <li>Final payment is due {{ final_payment_due }}</li>
  <li>Late payments may incur a {{ late_fee }} fee</li>
</ul>

<h3>Cancellation Policy</h3>
<p>{{ cancellation_policy }}</p>

<h3>Changes and Amendments</h3>
<p>Any changes to this agreement must be made in writing and signed by both parties. Additional charges may apply for changes made within 30 days of the event.</p>

<h3>Force Majeure</h3>
<p>Neither party shall be liable for any failure to perform due to unforeseen circumstances beyond their control.</p>`
  },
  corporate_event: {
    introduction: `<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-size: 24px; color: #1976d2;">Corporate Event Proposal</h1>
  <p style="font-size: 16px;">Quote #{{ quote_number }}</p>
</div>

<p>Dear {{ client_name }},</p>

<p>Thank you for the opportunity to propose our services for your upcoming corporate event. <strong>{{ company_name }}</strong> specializes in creating memorable and professional corporate experiences that align with your business objectives.</p>

<h2>Event Overview</h2>
<ul>
  <li><strong>Event:</strong> {{ event_name }}</li>
  <li><strong>Date:</strong> {{ event_date }}</li>
  <li><strong>Venue:</strong> {{ event_venue }}</li>
  <li><strong>Expected Attendees:</strong> {{ event_guest_count }}</li>
</ul>

<p>Our comprehensive approach ensures your event runs smoothly from start to finish, allowing you to focus on your guests and business objectives.</p>`,
    terms: `<h2>Terms and Conditions</h2>

<h3>Payment Terms</h3>
<ul>
  <li>50% deposit required upon contract signing</li>
  <li>Remaining balance due 7 days before event date</li>
  <li>Payment accepted via check, wire transfer, or credit card</li>
</ul>

<h3>Cancellation Policy</h3>
<ul>
  <li>30+ days notice: Full refund minus ${formatCurrency(500, 'PHP')} processing fee</li>
  <li>15-29 days notice: 50% refund</li>
  <li>Less than 15 days: No refund</li>
</ul>

<h3>Additional Terms</h3>
<p>Setup begins 2 hours before event start time. Breakdown begins immediately after event conclusion.</p>`
  },
  photography_package: {
    introduction: `<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-size: 24px; color: #1976d2;">Photography Services Proposal</h1>
  <p style="font-size: 16px;">For {{ client_name }}</p>
</div>

<p>Dear {{ client_first_name }},</p>

<p>Thank you for your interest in our photography services. We are excited to capture the special moments of your {{ event_type }} on {{ event_date }}.</p>

<h2>What's Included</h2>
<ul>
  <li>Professional photographer for {{ service_hours }} hours</li>
  <li>High-resolution digital images</li>
  <li>Online gallery for easy sharing</li>
  <li>Professional editing and color correction</li>
</ul>

<p>We pride ourselves on capturing candid moments and creating lasting memories that you'll treasure for years to come.</p>`,
    terms: `<h2>Photography Terms</h2>

<h3>Delivery</h3>
<ul>
  <li>Gallery preview available within 48 hours</li>
  <li>Final edited images delivered within 2-3 weeks</li>
  <li>All images provided in high-resolution digital format</li>
</ul>

<h3>Usage Rights</h3>
<p>Client receives full usage rights for personal use. Commercial usage requires separate licensing agreement.</p>

<h3>Weather Policy</h3>
<p>For outdoor sessions, we will reschedule due to severe weather at no additional charge.</p>`
  }
};

export const QuoteTemplateForm: React.FC<QuoteTemplateFormProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateQuoteTemplateData>({
    name: '',
    introduction: '',
    event_type: null,
    terms_and_conditions: '',
    is_active: true,
    default_validity_days: 30,
    has_multiple_options: false,
    default_tax_rate: null,
    workflow_template: null,
    products: [],
  });

  const [selectedProducts, setSelectedProducts] = useState<Record<string, unknown>[]>([]);
  const [previewData, setPreviewData] = useState<{ introduction?: string; terms?: string } | null>(null);

  // Get active event types and products
  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [], isLoading: isLoadingEventTypes } = useActiveEventTypes();
  const { useActiveProducts } = useProducts();
  const { data: products = [] } = useActiveProducts();

  // Mutations
  const createMutation = useCreateQuoteTemplate();
  const updateMutation = useUpdateQuoteTemplate();

  const isEditing = !!template;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        introduction: template.introduction || '',
        event_type: template.event_type,
        terms_and_conditions: template.terms_and_conditions || '',
        is_active: template.is_active,
        default_validity_days: template.default_validity_days,
        has_multiple_options: template.has_multiple_options,
        default_tax_rate: template.default_tax_rate,
        workflow_template: template.workflow_template,
        products: template.products?.map(p => ({
          product: p.product,
          quantity: p.quantity,
          is_required: p.is_required,
        })) || [],
      });

      // Set selected products for autocomplete
      const selectedProductsData = template.products?.map(p => 
        products.find(prod => prod.id === p.product)
      ).filter(Boolean) || [];
      setSelectedProducts(selectedProductsData.filter(Boolean) as unknown as Record<string, unknown>[]);
    }
  }, [template, products]);

  const handleInputChange = (field: keyof CreateQuoteTemplateData, value: string | boolean | number | null | CreateQuoteTemplateProductData[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && template) {
      updateMutation.mutate(
        { id: template.id, data: formData },
        {
          onSuccess: () => {
            onSave();
          }
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          onSave();
        }
      });
    }
  };

  const handlePreview = () => {
    if (!formData.introduction && !formData.terms_and_conditions) return;
    
    // Create sample context data for preview
    const sampleData = {
      quote_number: 'QT-2024-001',
      quote_date: new Date().toLocaleDateString(),
      company_name: 'LifePlace Events',
      company_address: '123 Business St, City, State 12345',
      company_phone: '(555) 123-4567',
      company_email: 'info@lifeplace.com',
      sales_representative: 'John Smith',
      client_name: 'Jane Doe',
      client_first_name: 'Jane',
      client_last_name: 'Doe',
      client_email: 'jane.doe@example.com',
      client_company: 'ABC Corporation',
      event_name: 'Annual Corporate Gala',
      event_type: 'Corporate Event',
      event_date: 'March 15, 2024',
      event_venue: 'Grand Ballroom Hotel',
      event_guest_count: '150',
      total_amount: formatCurrency(15000, 'PHP'),
      deposit_percentage: '50',
      final_payment_due: '7 days before event date',
      late_fee: formatCurrency(100, 'PHP'),
      cancellation_policy: 'Cancellation must be made 30 days in advance for full refund.',
      service_hours: '8'
    };

    // Simple variable replacement for preview
    let previewIntroduction = formData.introduction ?? '';
    let previewTerms = formData.terms_and_conditions ?? '';

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      previewIntroduction = previewIntroduction.replace(regex, value);
      previewTerms = previewTerms.replace(regex, value);
    });

    setPreviewData({
      introduction: previewIntroduction,
      terms: previewTerms
    });
  };

  const handleVariableInsert = (variable: string) => {
    // Use the global function to insert variable if available
    const insertFunction = (window as Window & { _richTextEditorInsertVariable?: (variable: string) => void })._richTextEditorInsertVariable;
    if (insertFunction) {
      insertFunction(variable);
    }
  };

  const loadTemplate = (templateKey: string) => {
    const starter = quoteTemplateStarters[templateKey as keyof typeof quoteTemplateStarters];
    
    if (starter) {
      handleInputChange('introduction', starter.introduction);
      handleInputChange('terms_and_conditions', starter.terms);
    }
  };

  const handleProductsChange = (_event: React.SyntheticEvent, newValue: unknown[]) => {
    setSelectedProducts(newValue as Record<string, unknown>[]);
    
    // Update form data with selected products
    const productFormData = newValue.map(product => ({
      product: (product as ProductOption).id,
      quantity: 1,
      is_required: false,
    }));
    
    handleInputChange('products', productFormData);
  };

  const handleProductQuantityChange = (index: number, quantity: number) => {
    const updatedProducts = (formData.products ?? []).map((product, i) => 
      i === index ? { ...product, quantity } : product
    );
    handleInputChange('products', updatedProducts);
  };

  const handleProductRequiredChange = (index: number, is_required: boolean) => {
    const updatedProducts = (formData.products ?? []).map((product, i) => 
      i === index ? { ...product, is_required } : product
    );
    handleInputChange('products', updatedProducts);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {isEditing ? 'Edit Quote Template' : 'Create Quote Template'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  label="Template Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  fullWidth
                  helperText="A descriptive name for this quote template"
                />

                <FormControl fullWidth>
                  <InputLabel>Event Type (Optional)</InputLabel>
                  <Select
                    value={formData.event_type || ''}
                    label="Event Type (Optional)"
                    onChange={(e) => handleInputChange('event_type', e.target.value || null)}
                    disabled={isLoadingEventTypes}
                  >
                    <MenuItem value="">
                      <em>Any Event Type</em>
                    </MenuItem>
                    {eventTypes.map((eventType) => (
                      <MenuItem key={eventType.id} value={eventType.id}>
                        {eventType.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {isLoadingEventTypes && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <CircularProgress size={20} />
                    </Box>
                  )}
                </FormControl>

                <Box display="flex" gap={2}>
                  <TextField
                    label="Default Validity (Days)"
                    value={formData.default_validity_days}
                    onChange={(e) => handleInputChange('default_validity_days', parseInt(e.target.value) || 30)}
                    type="number"
                    helperText="How long quotes remain valid"
                    sx={{ flex: 1 }}
                  />
                  
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.is_active}
                          onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        />
                      }
                      label="Active Template"
                    />
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Quote Introduction */}
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Quote Introduction
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={!formData.introduction && !formData.terms_and_conditions}
                >
                  Preview
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                This content appears at the beginning of your quotes
              </Typography>
              
              <RichTextEditor
                value={formData.introduction ?? ''}
                onChange={(value) => handleInputChange('introduction', value)}
                placeholder="Enter your quote introduction here. Use variables like {{ client_name }} for personalization."
                minHeight={250}
              />
            </CardContent>
          </Card>

          {/* Variable Helper */}
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <QuoteVariableInserter
                onVariableInsert={handleVariableInsert}
                onTemplateLoad={loadTemplate}
              />
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Template Products
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select products to include in this quote template
              </Typography>

              <Autocomplete
                multiple
                options={products}
                getOptionLabel={(option) => (option as ProductOption).name}
                value={selectedProducts as unknown as ProductOption[]}
                onChange={handleProductsChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Products"
                    placeholder="Choose products for this template"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
              />

              {/* Product Configuration */}
              {(formData.products ?? []).length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Product Configuration
                  </Typography>
                  <Stack spacing={2}>
                    {(formData.products ?? []).map((product, index) => {
                      const productData = selectedProducts[index];
                      return (
                        <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                          <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                              {String(productData?.name || 'Unknown Product')}
                            </Typography>
                            <TextField
                              size="small"
                              label="Quantity"
                              type="number"
                              value={product.quantity}
                              onChange={(e) => handleProductQuantityChange(index, parseInt(e.target.value) || 1)}
                              sx={{ width: 100 }}
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={product.is_required}
                                  onChange={(e) => handleProductRequiredChange(index, e.target.checked)}
                                />
                              }
                              label="Required"
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Template Settings */}
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Template Settings
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.has_multiple_options}
                      onChange={(e) => handleInputChange('has_multiple_options', e.target.checked)}
                    />
                  }
                  label="Support Multiple Options"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 5 }}>
                  Allow quotes to have multiple package options for clients to choose from
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>Default Tax Rate (Optional)</InputLabel>
                  <Select
                    value={formData.default_tax_rate || ''}
                    onChange={(e) => handleInputChange('default_tax_rate', e.target.value || null)}
                    label="Default Tax Rate (Optional)"
                  >
                    <MenuItem value="">
                      <em>No Default Tax Rate</em>
                    </MenuItem>
                    {/* TODO: Add tax rates from API */}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Workflow Template (Optional)</InputLabel>
                  <Select
                    value={formData.workflow_template || ''}
                    onChange={(e) => handleInputChange('workflow_template', e.target.value || null)}
                    label="Workflow Template (Optional)"
                  >
                    <MenuItem value="">
                      <em>No Workflow Template</em>
                    </MenuItem>
                    {/* TODO: Add workflow templates from API */}
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Terms and Conditions
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Default terms and conditions for quotes generated from this template
              </Typography>
              
              <RichTextEditor
                value={formData.terms_and_conditions ?? ''}
                onChange={(value) => handleInputChange('terms_and_conditions', value)}
                placeholder="Enter your terms and conditions here..."
                minHeight={10}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          {previewData && (
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quote Preview
                </Typography>
                
                {previewData.introduction && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Introduction:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box 
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewData.introduction, 'preview') }}
                        sx={{ 
                          '& *': { maxWidth: '100%' },
                          wordBreak: 'break-word',
                          '& .variable-placeholder': {
                            backgroundColor: '#4caf50',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontFamily: 'monospace',
                            fontSize: '0.875em'
                          }
                        }}
                      />
                    </Paper>
                  </Box>
                )}

                {previewData.terms && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Terms and Conditions:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box 
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewData.terms, 'preview') }}
                        sx={{ 
                          '& *': { maxWidth: '100%' },
                          wordBreak: 'break-word',
                          '& .variable-placeholder': {
                            backgroundColor: '#4caf50',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontFamily: 'monospace',
                            fontSize: '0.875em'
                          }
                        }}
                      />
                    </Paper>
                  </Box>
                )}

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Preview Note:</strong> This preview uses sample data. Actual quotes will use real client and event information.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={20} />
              ) : (
                isEditing ? 'Update Template' : 'Create Template'
              )}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default QuoteTemplateForm;