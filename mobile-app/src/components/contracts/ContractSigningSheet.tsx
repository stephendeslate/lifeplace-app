/**
 * ContractSigningSheet Component
 *
 * Bottom sheet for contract signing flow.
 * Matches client-portal ContractSigningDialog patterns.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  CheckCircle,
  FileText,
  Shield,
  PenNib,
  Check,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useSignContract } from '@/hooks/useContracts';
import { Button, Card } from '@/components/common';
import type { Contract } from '@/apis/contracts.api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SigningStep = 'review_contract' | 'legal_disclosure' | 'signature_capture' | 'confirmation';

const SIGNING_STEPS: { key: SigningStep; label: string; icon: React.ReactNode }[] = [
  { key: 'review_contract', label: 'Review', icon: <FileText size={20} /> },
  { key: 'legal_disclosure', label: 'Terms', icon: <Shield size={20} /> },
  { key: 'signature_capture', label: 'Sign', icon: <PenNib size={20} /> },
  { key: 'confirmation', label: 'Confirm', icon: <Check size={20} /> },
];

export interface ContractSigningSheetProps {
  visible: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSignComplete: (signedContract: Contract) => void;
  onError: (error: string) => void;
}

export function ContractSigningSheet({
  visible,
  onClose,
  contract,
  onSignComplete,
  onError,
}: ContractSigningSheetProps) {
  const signContract = useSignContract();

  const [currentStep, setCurrentStep] = useState<SigningStep>('review_contract');
  const [typedSignature, setTypedSignature] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [legalDisclosureAccepted, setLegalDisclosureAccepted] = useState(false);
  const [signatureIntentConfirmed, setSignatureIntentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const currentStepIndex = SIGNING_STEPS.findIndex((step) => step.key === currentStep);

  // Reset state when modal opens
  useEffect(() => {
    if (visible && contract) {
      setCurrentStep('review_contract');
      setTypedSignature('');
      setSignerName('');
      setSignerEmail('');
      setLegalDisclosureAccepted(false);
      setSignatureIntentConfirmed(false);
      setIsSubmitting(false);
      setErrors([]);
    }
  }, [visible, contract]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [isSubmitting, onClose]);

  const handleNext = useCallback(() => {
    Haptics.selectionAsync();
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < SIGNING_STEPS.length) {
      setCurrentStep(SIGNING_STEPS[nextStepIndex].key);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(SIGNING_STEPS[prevStepIndex].key);
    }
  }, [currentStepIndex]);

  const handleClearSignature = useCallback(() => {
    setTypedSignature('');
  }, []);

  const handleSubmitSignature = useCallback(async () => {
    if (!contract || !typedSignature.trim()) return;

    setIsSubmitting(true);
    setErrors([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const signedContract = await signContract.mutateAsync({
        contractId: contract.id,
        data: {
          signature_data: `TYPED:${typedSignature}`,
          signer_name: signerName,
          signer_email: signerEmail,
          agreed_to_terms: legalDisclosureAccepted && signatureIntentConfirmed,
        },
      });

      onSignComplete(signedContract);
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to submit signature';
      onError(errorMessage);
      setErrors([errorMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    contract,
    typedSignature,
    signerName,
    signerEmail,
    legalDisclosureAccepted,
    signatureIntentConfirmed,
    signContract,
    onSignComplete,
    onError,
    onClose,
  ]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'review_contract':
        return true;
      case 'legal_disclosure':
        return legalDisclosureAccepted;
      case 'signature_capture': {
        const hasTypedSignature = !!typedSignature.trim();
        const hasName = !!signerName.trim();
        const hasEmail = !!signerEmail.trim();
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail);
        return hasTypedSignature && hasName && hasEmail && isEmailValid;
      }
      case 'confirmation':
        return signatureIntentConfirmed;
      default:
        return false;
    }
  }, [currentStep, legalDisclosureAccepted, typedSignature, signerName, signerEmail, signatureIntentConfirmed]);

  const renderStepContent = () => {
    if (!contract) return null;

    switch (currentStep) {
      case 'review_contract':
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Review the Contract</Text>
            <Text style={styles.stepDescription}>
              Please read through the contract carefully before proceeding to sign.
            </Text>

            <Card style={styles.contractCard}>
              <View style={styles.contractHeader}>
                <FileText size={24} color={theme.colors.primary[500]} />
                <View style={styles.contractInfo}>
                  <Text style={styles.contractName}>{contract.template.name}</Text>
                  <Text style={styles.contractEvent}>{contract.event.title}</Text>
                </View>
              </View>

              {contract.content && (
                <View style={styles.contractContent}>
                  <Text style={styles.contractText}>{contract.content}</Text>
                </View>
              )}
            </Card>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Please read through the entire contract before proceeding to sign.
              </Text>
            </View>
          </ScrollView>
        );

      case 'legal_disclosure':
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Electronic Signature Disclosure</Text>
            <Text style={styles.stepDescription}>
              By proceeding with electronic signature, you understand and agree to the following terms.
            </Text>

            <Card style={styles.disclosureCard}>
              <Text style={styles.disclosureLabel}>Electronic Signature Consent:</Text>
              <View style={styles.disclosureItem}>
                <Text style={styles.disclosureBullet}>•</Text>
                <Text style={styles.disclosureText}>
                  You consent to use electronic signatures instead of paper documents
                </Text>
              </View>
              <View style={styles.disclosureItem}>
                <Text style={styles.disclosureBullet}>•</Text>
                <Text style={styles.disclosureText}>
                  Electronic signatures have the same legal validity as handwritten signatures
                </Text>
              </View>
              <View style={styles.disclosureItem}>
                <Text style={styles.disclosureBullet}>•</Text>
                <Text style={styles.disclosureText}>
                  You have the right to request paper copies of signed documents
                </Text>
              </View>
              <View style={styles.disclosureItem}>
                <Text style={styles.disclosureBullet}>•</Text>
                <Text style={styles.disclosureText}>
                  You can withdraw this consent at any time by contacting us
                </Text>
              </View>
            </Card>

            <Pressable
              style={styles.checkboxRow}
              onPress={() => {
                Haptics.selectionAsync();
                setLegalDisclosureAccepted(!legalDisclosureAccepted);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  legalDisclosureAccepted && styles.checkboxChecked,
                ]}
              >
                {legalDisclosureAccepted && (
                  <Check size={16} color={theme.colors.surface} weight="bold" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read, understand, and agree to the electronic signature disclosure above
              </Text>
            </Pressable>
          </ScrollView>
        );

      case 'signature_capture':
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Sign the Contract</Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                value={signerName}
                onChangeText={setSignerName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.neutral[400]}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                value={signerEmail}
                onChangeText={setSignerEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.signatureSection}>
              <View style={styles.signatureHeader}>
                <Text style={styles.inputLabel}>Type Your Signature *</Text>
                {typedSignature.length > 0 && (
                  <Pressable onPress={handleClearSignature}>
                    <Text style={styles.clearButton}>Clear</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                style={styles.signatureInput}
                value={typedSignature}
                onChangeText={setTypedSignature}
                placeholder="Type your full legal name"
                placeholderTextColor={theme.colors.neutral[400]}
                autoCapitalize="words"
              />
              {typedSignature.length > 0 && (
                <View style={styles.signaturePreviewBox}>
                  <Text style={styles.signaturePreviewText}>{typedSignature}</Text>
                </View>
              )}
              <Text style={styles.signatureHint}>
                By typing your name above, you agree that this constitutes your electronic signature
              </Text>
            </View>
          </ScrollView>
        );

      case 'confirmation':
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Confirm Your Signature</Text>

            <View style={styles.successAlert}>
              <CheckCircle size={24} color={theme.colors.success[600]} weight="fill" />
              <Text style={styles.successAlertText}>
                You are about to electronically sign the contract for{' '}
                <Text style={styles.boldText}>{contract.event.title}</Text>
              </Text>
            </View>

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Signature Details:</Text>
              <Text style={styles.summaryText}>Name: {signerName}</Text>
              <Text style={styles.summaryText}>Email: {signerEmail}</Text>
              <Text style={styles.summaryText}>
                Date: {new Date().toLocaleDateString()}
              </Text>
            </Card>

            {typedSignature && (
              <View style={styles.signaturePreview}>
                <Text style={styles.previewLabel}>Your Signature:</Text>
                <View style={styles.previewContainer}>
                  <Text style={styles.signaturePreviewText}>{typedSignature}</Text>
                </View>
              </View>
            )}

            <Pressable
              style={styles.checkboxRow}
              onPress={() => {
                Haptics.selectionAsync();
                setSignatureIntentConfirmed(!signatureIntentConfirmed);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  signatureIntentConfirmed && styles.checkboxChecked,
                ]}
              >
                {signatureIntentConfirmed && (
                  <Check size={16} color={theme.colors.surface} weight="bold" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I confirm my intent to sign this contract electronically and agree that this
                electronic signature is legally binding
              </Text>
            </Pressable>

            {errors.length > 0 && (
              <View style={styles.errorBox}>
                {errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>
                    {error}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  if (!contract) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.neutral[600]} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Sign Contract
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Progress Steps */}
          <View style={styles.stepsContainer}>
            {SIGNING_STEPS.map((step, index) => (
              <View key={step.key} style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepDot,
                    index < currentStepIndex && styles.stepDotCompleted,
                    index === currentStepIndex && styles.stepDotActive,
                  ]}
                >
                  {index < currentStepIndex ? (
                    <Check size={14} color={theme.colors.surface} weight="bold" />
                  ) : (
                    step.icon
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    index <= currentStepIndex && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Step Content */}
          <View style={styles.contentContainer}>{renderStepContent()}</View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              onPress={handleBack}
              variant="secondary"
              disabled={currentStepIndex === 0 || isSubmitting}
              style={styles.footerButton}
            >
              Back
            </Button>

            {currentStep === 'confirmation' ? (
              <Button
                onPress={handleSubmitSignature}
                variant="primary"
                disabled={!canProceed() || isSubmitting}
                loading={isSubmitting}
                style={styles.footerButtonPrimary}
              >
                {isSubmitting ? 'Signing...' : 'Complete Signature'}
              </Button>
            ) : (
              <Button
                onPress={handleNext}
                variant="primary"
                disabled={!canProceed() || isSubmitting}
                style={styles.footerButtonPrimary}
              >
                Next
              </Button>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary[500],
  },
  stepDotCompleted: {
    backgroundColor: theme.colors.success[500],
  },
  stepLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
  },
  stepLabelActive: {
    color: theme.colors.neutral[700],
    fontFamily: theme.typography.fonts.medium,
  },
  contentContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  stepTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.sm,
  },
  stepDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  contractCard: {
    marginBottom: theme.spacing.md,
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  contractInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  contractName: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  contractEvent: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  contractContent: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  contractText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[700],
  },
  disclosureCard: {
    marginBottom: theme.spacing.lg,
  },
  disclosureLabel: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.md,
  },
  disclosureItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  disclosureBullet: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    marginRight: theme.spacing.sm,
  },
  disclosureText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.neutral[300],
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  signatureSection: {
    marginBottom: theme.spacing.lg,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  clearButton: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  signatureInput: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
  },
  signaturePreviewBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  signaturePreviewText: {
    fontFamily: 'serif',
    fontSize: 28,
    fontStyle: 'italic',
    color: theme.colors.neutral[800],
  },
  signatureHint: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  successAlertText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.success[700],
    lineHeight: 22,
  },
  boldText: {
    fontFamily: theme.typography.fonts.semibold,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryLabel: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    marginBottom: 4,
  },
  signaturePreview: {
    marginBottom: theme.spacing.lg,
  },
  previewLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.sm,
  },
  previewContainer: {
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: theme.colors.error[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error[700],
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  footerButton: {
    flex: 1,
  },
  footerButtonPrimary: {
    flex: 2,
  },
});

export default ContractSigningSheet;
