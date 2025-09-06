// frontend/client-portal/src/components/contracts/ContractSigningDialog.tsx
import React, { useState, useCallback } from 'react';
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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import type { Contract, SigningStep, SignatureSubmission } from '../../types/contracts.types';
import { contractUtils } from '../../apis/contracts.api';
import { useContracts } from '../../contexts/ContractsContext';
import ContractViewer from './ContractViewer';
import EnhancedSignaturePad from './EnhancedSignaturePad';

interface ContractSigningDialogProps {
  open: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSignComplete: (signedContract: Contract) => void;
  onError: (error: string) => void;
}

const SIGNING_STEPS: { key: SigningStep; label: string }[] = [
  { key: 'review_contract', label: 'Review Contract' },
  { key: 'legal_disclosure', label: 'Legal Disclosure' },
  { key: 'signature_capture', label: 'Sign Document' },
  { key: 'confirmation', label: 'Confirm' },
];

// Helper functions for signature analysis
const calculateSignatureConfidence = (signatureData: string): number => {
  try {
    // Simple confidence calculation based on signature complexity
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0.5;

    const img = new Image();
    img.src = signatureData;
    
    // Basic complexity analysis
    const base64Part = signatureData.split(',')[1] || '';
    
    // Score based on data size (more strokes = higher confidence)
    let confidence = Math.min(base64Part.length / 10000, 1.0);
    
    // Adjust for minimum threshold
    confidence = Math.max(confidence, 0.1);
    
    return Math.round(confidence * 10000) / 10000; // Round to 4 decimal places
  } catch {
    return 0.5; // Default confidence if analysis fails
  }
};

// Utility functions for signature analysis (currently unused but kept for future enhancement)
// const getSignatureComplexity = (signatureData: string): number => {
//   // Analyze signature complexity based on data size and patterns
//   const base64Part = signatureData.split(',')[1] || '';
//   return Math.min(base64Part.length / 5000, 1.0);
// };

// const getSignatureDuration = (): number => {
//   // In a real implementation, this would track actual signing time
//   // For now, return a reasonable default
//   return Math.random() * 10 + 2; // 2-12 seconds
// };

// const getEnhancedDeviceInfo = () => {
//   return {
//     touchSupport: 'ontouchstart' in window,
//     maxTouchPoints: navigator.maxTouchPoints || 0,
//     pointerEvents: !!window.PointerEvent,
//     deviceMemory: (navigator as any).deviceMemory || 'unknown',
//     hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
//     connectionType: (navigator as any).connection?.effectiveType || 'unknown',
//     pixelRatio: window.devicePixelRatio || 1,
//   };
// };

export const ContractSigningDialog: React.FC<ContractSigningDialogProps> = ({
  open,
  onClose,
  contract,
  onSignComplete,
  onError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { signContract } = useContracts();

  const [currentStep, setCurrentStep] = useState<SigningStep>('review_contract');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [legalDisclosureAccepted, setLegalDisclosureAccepted] = useState(false);
  const [signatureIntentConfirmed, setSignatureIntentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const currentStepIndex = SIGNING_STEPS.findIndex(step => step.key === currentStep);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open && contract) {
      setCurrentStep('review_contract');
      setSignatureData(null);
      setSignerName('');
      setSignerTitle('');
      setSignerEmail('');
      setLegalDisclosureAccepted(false);
      setSignatureIntentConfirmed(false);
      setIsSubmitting(false);
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


  const handleSubmitSignature = useCallback(async () => {
    if (!contract || !signatureData) return;

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Validate signature quality before submission
      const signatureQuality = contractUtils.validateSignature(signatureData);
      if (!signatureQuality) {
        throw new Error('Signature quality is insufficient. Please provide a clearer signature.');
      }

      // Calculate signature confidence score
      const confidenceScore = calculateSignatureConfidence(signatureData);
      if (confidenceScore < 0.3) {
        throw new Error('Signature appears too simple. Please provide a more detailed signature.');
      }

      // Prepare signature submission with enhanced metadata
      const submission: SignatureSubmission = {
        signature_data: signatureData,
        signer_name: signerName,
        signer_title: signerTitle,
        signer_email: signerEmail,
        verification_method: 'electronic_signature',
        device_fingerprint: contractUtils.generateDeviceFingerprint(),
        signature_timestamp: new Date().toISOString(),
        screen_resolution: `${screen.width}x${screen.height}`,
        legal_disclosure_accepted: legalDisclosureAccepted,
        signature_intent_confirmed: signatureIntentConfirmed,
      };

      // Submit signature to API using ContractsContext
      const signedContract = await signContract(contract.id, submission);

      onSignComplete(signedContract);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit signature';
      onError(errorMessage);
      setErrors([errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    contract,
    signatureData,
    signerName,
    signerTitle,
    signerEmail,
    legalDisclosureAccepted,
    signatureIntentConfirmed,
    onSignComplete,
    onError,
    onClose,
  ]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'review_contract':
        console.log('✅ canProceed: review_contract - always true');
        return true; // Always can proceed from review
      case 'legal_disclosure':
        console.log('✅ canProceed: legal_disclosure', { legalDisclosureAccepted });
        return legalDisclosureAccepted;
      case 'signature_capture':
        const hasSignatureData = !!signatureData;
        const isSignatureValid = signatureData ? contractUtils.validateSignature(signatureData) : false;
        const hasName = !!signerName.trim();
        const hasEmail = !!signerEmail.trim();
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail);
        const canProceedFromSignature = hasSignatureData && isSignatureValid && hasName && hasEmail && isEmailValid;
        
        console.log('✅ canProceed: signature_capture validation', {
          hasSignatureData,
          isSignatureValid,
          hasName,
          hasEmail,
          isEmailValid,
          canProceedFromSignature,
          signatureDataLength: signatureData?.length || 0,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim()
        });
        
        return canProceedFromSignature;
      case 'confirmation':
        console.log('✅ canProceed: confirmation', { signatureIntentConfirmed });
        return signatureIntentConfirmed;
      default:
        console.log('✅ canProceed: default case - false');
        return false;
    }
  }, [currentStep, legalDisclosureAccepted, signatureData, signerName, signerEmail, signatureIntentConfirmed]);

  const renderStepContent = () => {
    if (!contract) return null;

    switch (currentStep) {
      case 'review_contract':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Please review the contract carefully
            </Typography>
            <ContractViewer
              contract={contract}
              showContent={true}
              showSignatures={false}
              showMetadata={false}
              compact={true}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Please read through the entire contract before proceeding to sign.
            </Alert>
          </Box>
        );

      case 'legal_disclosure':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Electronic Signature Disclosure
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              By proceeding with electronic signature, you understand and agree to the following terms.
            </Alert>

            <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Electronic Signature Consent:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • You consent to use electronic signatures instead of paper documents
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • Electronic signatures have the same legal validity as handwritten signatures
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • You have the right to request paper copies of signed documents
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • You can withdraw this consent at any time by contacting us
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
        );

      case 'signature_capture':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sign the Contract
            </Typography>

            <Box sx={{ mb: 3 }}>
              <TextField
                label="Full Name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                fullWidth
                required
                sx={{ mb: 2 }}
                helperText="Your name as it should appear on the signature"
              />

              <TextField
                label="Title/Position"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                helperText="Your title or position (optional)"
              />

              <TextField
                label="Email Address"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                fullWidth
                required
                sx={{ mb: 2 }}
                helperText="Email address for signature verification"
              />
            </Box>

            <EnhancedSignaturePad
              onSignatureChange={(data, analysis) => {
                console.log('🖊️ SIGNATURE CHANGE HANDLER CALLED', {
                  hasData: !!data,
                  dataLength: data?.length || 0,
                  isValidData: data ? contractUtils.validateSignature(data) : false,
                  timestamp: Date.now(),
                  analysis: analysis ? 'Analysis provided' : 'No analysis'
                });
                
                setSignatureData(data);
                
                // Clear any signature-related errors when signature is provided
                if (data) {
                  console.log('🖊️ Clearing signature-related errors');
                  setErrors(prev => prev.filter(error => !error.includes('signature')));
                } else {
                  console.log('🖊️ No signature data provided - keeping errors');
                }
                
                // Store analysis for later use
                if (analysis) {
                  console.log('🖊️ Signature analysis:', analysis);
                }
              }}
              width={isMobile ? 300 : 500}
              height={200}
              required
              label="Electronic Signature"
              helperText="Draw your signature in the box above. We'll analyze it for security."
              enableBiometricAnalysis={true}
              showAnalytics={true}
            />
          </Box>
        );

      case 'confirmation':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Confirm Your Signature
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                You are about to electronically sign the contract for <strong>{contract.event.title}</strong>
              </Typography>
            </Alert>

            <Box sx={{ mb: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Signature Details:</strong>
              </Typography>
              <Typography variant="body2">Name: {signerName}</Typography>
              {signerTitle && <Typography variant="body2">Title: {signerTitle}</Typography>}
              <Typography variant="body2">Email: {signerEmail}</Typography>
              <Typography variant="body2">
                Date: {new Date().toLocaleDateString()}
              </Typography>
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
        Sign Contract - {contract.event.title}
        <Button onClick={handleClose} disabled={isSubmitting}>
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent 
        dividers
        onClick={(e) => {
          const target = e.target as HTMLElement;
          console.log('📋 Dialog content clicked', { 
            target: target.tagName, 
            className: target.className,
            isSignatureCanvas: target.tagName === 'CANVAS',
            canvasId: target.id,
            timestamp: Date.now()
          });
          // Check if click is inside signature canvas area
          if (target.tagName === 'CANVAS' || target.closest('.signature-pad')) {
            console.log('🎯 Click detected inside signature area - NOT stopping propagation');
          } else {
            console.log('🎯 Click outside signature area');
          }
        }}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          console.log('📋 Dialog content mouse down', { 
            target: target.tagName,
            isSignatureCanvas: target.tagName === 'CANVAS',
            timestamp: Date.now()
          });
          // Don't prevent default for canvas interactions
          if (target.tagName === 'CANVAS') {
            console.log('🎯 Mouse down on canvas - allowing event');
          }
        }}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'CANVAS') {
            console.log('🎯 Pointer down on canvas', {
              pointerId: e.pointerId,
              pointerType: e.pointerType,
              pressure: e.pressure,
              timestamp: Date.now()
            });
          }
        }}
      >
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

export default ContractSigningDialog;