// frontend/admin-crm/src/components/contracts/AdminContractSigningDialog.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Alert,
  Checkbox,
  FormControlLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import type { EventContract, ContractSigningData, SignatureRole } from '../../types/contracts.types';
import { SIGNATURE_ROLES } from '../../types/contracts.types';
import { useSignContract } from '../../hooks/useContracts';
import EnhancedSignaturePad from './EnhancedSignaturePad';

type SigningStep = 'review_contract' | 'signer_info' | 'signature_capture' | 'confirmation';

interface AdminContractSigningDialogProps {
  open: boolean;
  onClose: () => void;
  contract: EventContract | null;
  onSignComplete: (signedContract: EventContract) => void;
  onError: (error: string) => void;
}

const SIGNING_STEPS: { key: SigningStep; label: string }[] = [
  { key: 'review_contract', label: 'Review Contract' },
  { key: 'signer_info', label: 'Signer Information' },
  { key: 'signature_capture', label: 'Sign Document' },
  { key: 'confirmation', label: 'Confirm' },
];

export const AdminContractSigningDialog: React.FC<AdminContractSigningDialogProps> = ({
  open,
  onClose,
  contract,
  onSignComplete,
  onError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mutate: signContract, isPending: isSubmitting } = useSignContract();

  const [currentStep, setCurrentStep] = useState<SigningStep>('review_contract');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerRole, setSignerRole] = useState<SignatureRole>('COMPANY_REP');
  const [witnessName, setWitnessName] = useState('');
  const [witnessSignature, setWitnessSignature] = useState('');
  const [legalDisclosureAccepted, setLegalDisclosureAccepted] = useState(false);
  const [signatureIntentConfirmed, setSignatureIntentConfirmed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const currentStepIndex = SIGNING_STEPS.findIndex(step => step.key === currentStep);
  const requiresWitness = false; // TODO: Get from template when available

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && contract) {
      setCurrentStep('review_contract');
      setSignatureData(null);
      setSignerName('');
      setSignerTitle('');
      setSignerEmail('');
      setSignerRole('COMPANY_REP');
      setWitnessName('');
      setWitnessSignature('');
      setLegalDisclosureAccepted(false);
      setSignatureIntentConfirmed(false);
      setErrors([]);
    }
  }, [open, contract]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return; // Prevent closing during submission
    onClose();
  }, [isSubmitting, onClose]);

  const handleNext = useCallback(() => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < SIGNING_STEPS.length) {
      setCurrentStep(SIGNING_STEPS[nextStepIndex].key);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(SIGNING_STEPS[prevStepIndex].key);
    }
  }, [currentStepIndex]);

  const handleSubmitSignature = useCallback(() => {
    if (!contract || !signatureData) return;

    setErrors([]);

    const submissionData: ContractSigningData = {
      signature_data: signatureData,
      role: signerRole,
      signer_name: signerName,
      signer_title: signerTitle,
      signer_email: signerEmail,
      verification_method: 'electronic_signature',
    };

    if (requiresWitness) {
      submissionData.witness_name = witnessName;
      submissionData.witness_signature = witnessSignature;
    }

    signContract(
      { id: contract.id, data: submissionData },
      {
        onSuccess: (signedContract) => {
          onSignComplete(signedContract);
          onClose();
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to submit signature';
          onError(errorMessage);
          setErrors([errorMessage]);
        },
      }
    );
  }, [
    contract,
    signatureData,
    signerRole,
    signerName,
    signerTitle,
    signerEmail,
    requiresWitness,
    witnessName,
    witnessSignature,
    signContract,
    onSignComplete,
    onClose,
    onError,
  ]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'review_contract':
        return true; // Always can proceed from review
      case 'signer_info':
        return (
          signerName.trim() !== '' &&
          signerEmail.trim() !== '' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail) &&
          legalDisclosureAccepted
        );
      case 'signature_capture': {
        const hasSignature = signatureData !== null;
        const hasWitnessInfo = !requiresWitness || (witnessName.trim() !== '' && witnessSignature.trim() !== '');
        return hasSignature && hasWitnessInfo;
      }
      case 'confirmation':
        return signatureIntentConfirmed;
      default:
        return false;
    }
  }, [currentStep, signerName, signerEmail, legalDisclosureAccepted, signatureData, requiresWitness, witnessName, witnessSignature, signatureIntentConfirmed]);

  const renderStepContent = () => {
    if (!contract) return null;

    switch (currentStep) {
      case 'review_contract':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Contract Review
            </Typography>
            
            <Paper elevation={0} sx={{ p: 2, backgroundColor: theme.palette.grey[50], mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Contract Details
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Template:</strong> {contract.template_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {contract.status}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Event:</strong> {typeof contract.event === 'object' && contract.event?.name ? contract.event.name : `Event #${typeof contract.event === 'number' ? contract.event : contract.event?.id || 'Unknown'}`}
              </Typography>
              {contract.contract_value && (
                <Typography variant="body2" gutterBottom>
                  <strong>Value:</strong> {contract.contract_value} {contract.currency}
                </Typography>
              )}
            </Paper>

            <Alert severity="info" sx={{ mb: 2 }}>
              Please review the contract details above before proceeding to sign as a company representative.
            </Alert>

            {contract.content && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  maxHeight: 300,
                  overflow: 'auto',
                  backgroundColor: 'white',
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: contract.content }}
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                />
              </Paper>
            )}
          </Box>
        );

      case 'signer_info':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Signer Information
            </Typography>

            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Signing Role</InputLabel>
                <Select
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value as SignatureRole)}
                  label="Signing Role"
                >
                  {SIGNATURE_ROLES.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Full Name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                fullWidth
                required
                helperText="Your full name as it should appear on the signature"
              />

              <TextField
                label="Title/Position"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                fullWidth
                helperText="Your title or position within the company"
              />

              <TextField
                label="Email Address"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                fullWidth
                required
                helperText="Email address for signature verification"
              />

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Electronic Signature Consent
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  By proceeding with electronic signature, you understand and agree to the following terms.
                </Alert>

                <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Electronic Signature Disclosure:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • You consent to use electronic signatures instead of paper documents
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • Electronic signatures have the same legal validity as handwritten signatures
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • You have the right to request paper copies of signed documents
                  </Typography>
                  <Typography variant="body2">
                    • Technical requirements: A device with internet access and a supported web browser
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={legalDisclosureAccepted}
                      onChange={(e) => setLegalDisclosureAccepted(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I have read, understand, and agree to the electronic signature disclosure above
                    </Typography>
                  }
                />
              </Box>
            </Stack>
          </Box>
        );

      case 'signature_capture':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Electronic Signature
            </Typography>

            <EnhancedSignaturePad
              onSignatureChange={(data) => {
                setSignatureData(data);
                if (data) {
                  setErrors(prev => prev.filter(error => !error.includes('signature')));
                }
              }}
              width={isMobile ? 300 : 500}
              height={200}
              required
              label="Your Electronic Signature"
              helperText="Draw your signature in the box above using your mouse or touch screen"
              enableBiometricAnalysis={true}
              showAnalytics={true}
            />

            {requiresWitness && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Witness Information (Required)
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Witness Name"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    fullWidth
                    required
                    helperText="Full name of the witness"
                  />
                  <TextField
                    label="Witness Signature"
                    value={witnessSignature}
                    onChange={(e) => setWitnessSignature(e.target.value)}
                    fullWidth
                    required
                    helperText="Witness signature or typed name"
                  />
                </Stack>
              </Box>
            )}
          </Box>
        );

      case 'confirmation':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Confirm Signature
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                You are about to electronically sign this contract as a {SIGNATURE_ROLES.find(r => r.value === signerRole)?.label}
              </Typography>
            </Alert>

            <Box sx={{ mb: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Signature Summary:</strong>
              </Typography>
              <Typography variant="body2">Name: {signerName}</Typography>
              {signerTitle && <Typography variant="body2">Title: {signerTitle}</Typography>}
              <Typography variant="body2">Email: {signerEmail}</Typography>
              <Typography variant="body2">Role: {SIGNATURE_ROLES.find(r => r.value === signerRole)?.label}</Typography>
              <Typography variant="body2">
                Date: {new Date().toLocaleDateString()}
              </Typography>
              {requiresWitness && witnessName && (
                <Typography variant="body2">Witness: {witnessName}</Typography>
              )}
            </Box>

            {signatureData && (
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Your Signature:
                </Typography>
                <img
                  src={signatureData}
                  alt="Your signature"
                  style={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 4,
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              </Box>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={signatureIntentConfirmed}
                  onChange={(e) => setSignatureIntentConfirmed(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I confirm my intent to sign this contract electronically and agree that this 
                  electronic signature is legally binding
                </Typography>
              }
            />
          </Box>
        );

      default:
        return null;
    }
  };

  if (!contract) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          minHeight: isMobile ? '100vh' : '600px',
          maxHeight: isMobile ? '100vh' : '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Sign Contract - {contract.template_name}
        <Button onClick={handleClose} disabled={isSubmitting}>
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {/* Progress Stepper */}
        <Stepper 
          activeStep={currentStepIndex} 
          sx={{ mb: 3 }}
          orientation={isMobile ? 'vertical' : 'horizontal'}
        >
          {SIGNING_STEPS.map((step) => (
            <Step key={step.key}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error Display */}
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <Typography key={index} variant="body2">
                {error}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Step Content */}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={handleBack}
          disabled={currentStepIndex === 0 || isSubmitting}
          startIcon={<BackIcon />}
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentStep === 'confirmation' ? (
            <LoadingButton
              onClick={handleSubmitSignature}
              loading={isSubmitting}
              disabled={!canProceed()}
              variant="contained"
              color="success"
              startIcon={<CompleteIcon />}
            >
              {isSubmitting ? 'Signing...' : 'Complete Signature'}
            </LoadingButton>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              variant="contained"
              endIcon={<ForwardIcon />}
            >
              Next
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default AdminContractSigningDialog;