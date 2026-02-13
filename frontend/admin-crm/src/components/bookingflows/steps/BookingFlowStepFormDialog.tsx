// frontend/admin-crm/src/components/bookingflows/steps/BookingFlowStepFormDialog.tsx

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Settings as ConfigIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import {
  type BookingFlowStepFormDialogProps,
  type CreateBookingFlowStepData,
  type UpdateBookingFlowStepData,
  type StepType,
} from "../../../types/bookingflows.types";
import { useBookingFlowSteps } from "../../../hooks/useBookingFlows";

interface StepFormData {
  step_type: StepType;
  description: string;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  display_conditions: Record<string, unknown>;
  configuration: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
}

const defaultFormData: StepFormData = {
  step_type: "introduction",
  description: "",
  is_enabled: true,
  is_required: true,
  is_skippable: false,
  display_conditions: {},
  configuration: {},
  validation_rules: {},
};

export const BookingFlowStepFormDialog: React.FC<
  BookingFlowStepFormDialogProps
> = ({ open, onClose, editingStep, flowId, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<StepFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conditionsExpanded, setConditionsExpanded] = useState(false);
  const [validationExpanded, setValidationExpanded] = useState(false);
  const [displayConditionsJson, setDisplayConditionsJson] = useState("{}");
  const [validationRulesJson, setValidationRulesJson] = useState("{}");
  const [jsonErrors, setJsonErrors] = useState<{
    conditions?: string;
    validation?: string;
  }>({});

  // Use evolved hooks for step types
  const { useAvailableStepTypes } = useBookingFlowSteps();
  const {
    data: stepTypesResponse,
    isLoading: isLoadingStepTypes,
    error: stepTypesError,
  } = useAvailableStepTypes();

  useEffect(() => {
    if (open) {
      if (editingStep) {
        // Populate form with existing step data
        const stepData: StepFormData = {
          step_type: editingStep.step_type,
          description: editingStep.description || "",
          is_enabled: editingStep.is_enabled ?? true,
          is_required: editingStep.is_required ?? true,
          is_skippable: editingStep.is_skippable ?? false,
          display_conditions: editingStep.display_conditions || {},
          configuration: editingStep.configuration || {},
          validation_rules: editingStep.validation_rules || {},
        };

        setFormData(stepData);
        setDisplayConditionsJson(
          JSON.stringify(stepData.display_conditions, null, 2),
        );
        setValidationRulesJson(
          JSON.stringify(stepData.validation_rules, null, 2),
        );
      } else {
        setFormData(defaultFormData);
        setDisplayConditionsJson("{}");
        setValidationRulesJson("{}");
      }

      setErrors({});
      setJsonErrors({});
      setConditionsExpanded(false);
      setValidationExpanded(false);
    }
  }, [editingStep, open]);

  const handleInputChange =
    (field: keyof StepFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof StepFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleStepTypeChange = (stepType: StepType) => {
    setFormData((prev) => ({
      ...prev,
      step_type: stepType,
    }));
  };

  const handleDisplayConditionsChange = (value: string) => {
    setDisplayConditionsJson(value);
    setJsonErrors((prev) => ({ ...prev, conditions: undefined }));

    try {
      const parsed = JSON.parse(value);
      setFormData((prev) => ({
        ...prev,
        display_conditions: parsed,
      }));
    } catch {
      setJsonErrors((prev) => ({
        ...prev,
        conditions: "Invalid JSON format",
      }));
    }
  };

  const handleValidationRulesChange = (value: string) => {
    setValidationRulesJson(value);
    setJsonErrors((prev) => ({ ...prev, validation: undefined }));

    try {
      const parsed = JSON.parse(value);
      setFormData((prev) => ({
        ...prev,
        validation_rules: parsed,
      }));
    } catch {
      setJsonErrors((prev) => ({
        ...prev,
        validation: "Invalid JSON format",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.step_type) {
      newErrors.step_type = "Step type is required";
    }

    // Check for removed step types
    if (formData.step_type === ("availability_check" as StepType)) {
      newErrors.step_type =
        "Availability check step type is no longer supported. Use date_time step with availability checking enabled instead.";
    }

    // Validate JSON fields
    if (jsonErrors.conditions) {
      newErrors.display_conditions = jsonErrors.conditions;
    }

    if (jsonErrors.validation) {
      newErrors.validation_rules = jsonErrors.validation;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Create submit data matching the evolved backend serializers
    const submitData: CreateBookingFlowStepData | UpdateBookingFlowStepData = {
      step_type: formData.step_type,
      description: formData.description.trim() || undefined,
      is_enabled: formData.is_enabled,
      is_required: formData.is_required,
      is_skippable: formData.is_skippable,
      display_conditions: formData.display_conditions,
      configuration: formData.configuration,
      validation_rules: formData.validation_rules,
    };

    // Add booking_flow for create operations (order auto-assigned by backend)
    if (!editingStep && flowId) {
      (submitData as CreateBookingFlowStepData).booking_flow = flowId;
    }

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const getStepTypeIcon = (stepType: StepType) => {
    const icons = {
      introduction: "👋",
      venue_selection: "🏠",
      date_time: "📅",
      questionnaire: "📝",
      package_selection: "📦",
      addon_selection: "🔧",
      pricing_summary: "💰",
      contact_info: "👤",
      payment_info: "💳",
      confirmation: "✅",
    };

    return icons[stepType as keyof typeof icons] || "⚙️";
  };

  const getStepTypeDescription = (stepType: StepType) => {
    const descriptions = {
      introduction: "Welcome message and flow overview",
      venue_selection: "Select spaces for custom package curation",
      date_time: "Date and time selection with availability checking",
      questionnaire: "Custom questionnaires and forms",
      package_selection: "Choose from available packages",
      addon_selection: "Optional add-on services",
      pricing_summary: "Display pricing breakdown",
      contact_info: "Collect client contact details",
      payment_info: "Payment method and processing",
      confirmation: "Booking confirmation and next steps",
    };

    return descriptions[stepType] || "Custom step configuration";
  };

  const isStepTypeRemoved = (stepType: string) => {
    return stepTypesResponse?.removed_types?.some(
      (removed) => removed.value === stepType,
    );
  };

  const getRemovedStepInfo = (stepType: string) => {
    return stepTypesResponse?.removed_types?.find(
      (removed) => removed.value === stepType,
    );
  };

  // Show loading state while fetching step types
  if (isLoadingStepTypes) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={4}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading step types...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error if step types failed to load
  if (stepTypesError) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Failed to load step types. Please try again.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "70vh" },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ConfigIcon color="primary" />
          {editingStep ? "Edit Booking Step" : "Create New Step"}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Stack spacing={3}>
            {/* Step Type Selection */}
            <FormControl fullWidth required error={!!errors.step_type}>
              <InputLabel>Step Type</InputLabel>
              <Select
                value={formData.step_type}
                onChange={(e) =>
                  handleStepTypeChange(e.target.value as StepType)
                }
                label="Step Type"
                disabled={!!editingStep} // Can't change type after creation
              >
                {stepTypesResponse?.step_types?.map((type) => (
                  <MenuItem
                    key={type.value}
                    value={type.value}
                    disabled={isStepTypeRemoved(type.value)}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      width="100%"
                    >
                      <Typography sx={{ fontSize: "1.2em" }}>
                        {getStepTypeIcon(type.value as StepType)}
                      </Typography>
                      <Box flexGrow={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {type.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getStepTypeDescription(type.value as StepType)}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {errors.step_type && (
                <FormHelperText error>{errors.step_type}</FormHelperText>
              )}

              {/* Show removed step types notice */}
              {stepTypesResponse?.removed_types &&
                stepTypesResponse.removed_types.length > 0 && (
                  <FormHelperText>
                    <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                      <InfoIcon fontSize="small" color="info" />
                      <Typography variant="caption" color="info.main">
                        Some step types have been removed:{" "}
                        {stepTypesResponse.removed_types
                          .map((r) => r.label)
                          .join(", ")}
                      </Typography>
                    </Box>
                  </FormHelperText>
                )}
            </FormControl>

            {/* Warning for editing removed step types */}
            {editingStep && isStepTypeRemoved(editingStep.step_type) && (
              <Alert severity="warning" icon={<WarningIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  Deprecated Step Type
                </Typography>
                <Typography variant="body2">
                  This step uses the deprecated "{editingStep.step_type_display}
                  " type.
                  {(() => {
                    const removedInfo = getRemovedStepInfo(
                      editingStep.step_type,
                    );
                    return removedInfo ? ` ${removedInfo.reason}` : "";
                  })()}
                </Typography>
                {(() => {
                  const removedInfo = getRemovedStepInfo(editingStep.step_type);
                  return (
                    removedInfo?.migration_available && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Migration is available for this step type.
                      </Typography>
                    )
                  );
                })()}
              </Alert>
            )}

            {/* Basic Information */}
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleInputChange("description")}
              multiline
              rows={2}
              helperText="Optional description for this step"
            />

            {/* Order Information Notice */}
            <Alert severity="info">
              Step order will be automatically assigned based on the current
              flow structure. You can reorder steps after creation using the
              step management interface.
            </Alert>

            {/* Step Configuration */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Step Configuration
              </Typography>

              <Stack spacing={2}>
                <Box display="flex" flexDirection="column" gap={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_enabled}
                        onChange={handleSwitchChange("is_enabled")}
                      />
                    }
                    label="Enabled"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Only enabled steps are shown to clients
                  </Typography>
                </Box>

                <Box display="flex" flexDirection="column" gap={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_required}
                        onChange={handleSwitchChange("is_required")}
                      />
                    }
                    label="Required"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Required steps must be completed to proceed
                  </Typography>
                </Box>

                <Box display="flex" flexDirection="column" gap={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_skippable}
                        onChange={handleSwitchChange("is_skippable")}
                      />
                    }
                    label="Skippable"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Allow clients to skip this step
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Advanced Configuration */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Advanced Configuration
              </Typography>

              {/* Display Conditions */}
              <Accordion
                expanded={conditionsExpanded}
                onChange={(_, expanded) => setConditionsExpanded(expanded)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2">
                      Display Conditions
                    </Typography>
                    {Object.keys(formData.display_conditions).length > 0 && (
                      <Chip label="Configured" size="small" color="info" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Display conditions control when this step is shown based on
                    previous step data. Leave empty to always show this step.
                  </Alert>
                  <TextField
                    fullWidth
                    label="Conditions (JSON)"
                    value={displayConditionsJson}
                    onChange={(e) =>
                      handleDisplayConditionsChange(e.target.value)
                    }
                    multiline
                    rows={4}
                    helperText={
                      jsonErrors.conditions ||
                      "JSON object defining display conditions"
                    }
                    error={
                      !!jsonErrors.conditions || !!errors.display_conditions
                    }
                  />
                  {errors.display_conditions && (
                    <Typography variant="caption" color="error">
                      {errors.display_conditions}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Validation Rules */}
              <Accordion
                expanded={validationExpanded}
                onChange={(_, expanded) => setValidationExpanded(expanded)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2">
                      Validation Rules
                    </Typography>
                    {Object.keys(formData.validation_rules).length > 0 && (
                      <Chip label="Configured" size="small" color="warning" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Validation rules ensure data quality and completeness for
                    this step.
                  </Alert>
                  <TextField
                    fullWidth
                    label="Validation Rules (JSON)"
                    value={validationRulesJson}
                    onChange={(e) =>
                      handleValidationRulesChange(e.target.value)
                    }
                    multiline
                    rows={4}
                    helperText={
                      jsonErrors.validation ||
                      "JSON object defining validation rules"
                    }
                    error={!!jsonErrors.validation || !!errors.validation_rules}
                  />
                  {errors.validation_rules && (
                    <Typography variant="caption" color="error">
                      {errors.validation_rules}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            isLoading ||
            Object.keys(jsonErrors).some(
              (key) => jsonErrors[key as keyof typeof jsonErrors],
            )
          }
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          {isLoading
            ? "Saving..."
            : editingStep
              ? "Update Step"
              : "Create Step"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
