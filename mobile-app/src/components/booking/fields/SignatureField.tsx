/**
 * SignatureField - Signature Capture Field
 *
 * Touch-based signature capture with clear and redo options.
 * Uses a WebView-based HTML5 Canvas for cross-platform signature capture.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Signature, Eraser, Warning, Check, X } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';
import { SignatureCanvas } from '@/components/contracts/SignatureCanvas';

interface SignatureFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function SignatureField({ field, value, onChange, error }: SignatureFieldProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [signatureData, setSignatureData] = useState<string | undefined>(value);

  const {
    label,
    help_text,
    is_required,
  } = field;

  const isSigned = !!signatureData;

  const handleOpenModal = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleSignatureCapture = useCallback((data: string) => {
    setSignatureData(data);
    setIsModalVisible(false);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: data,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [field.id, field.field_type, onChange]);

  const handleClear = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSignatureData(undefined);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: undefined,
    });
  }, [field.id, field.field_type, onChange]);

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Signature Area */}
      <View style={[styles.signatureContainer, error && styles.signatureContainerError]}>
        {isSigned && signatureData ? (
          <View style={styles.signedContent}>
            <View style={styles.signedBadge}>
              <Check size={16} color={colors.secondary.forest} weight="bold" />
              <Text style={styles.signedText}>Signature captured</Text>
            </View>
            <View style={styles.signaturePreview}>
              <Image
                source={{ uri: signatureData }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
            >
              <Eraser size={18} color={colors.semantic.error} />
              <Text style={styles.clearButtonText}>Clear & Re-sign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleOpenModal}
          >
            <Signature size={32} color={colors.neutral.darkGray} />
            <Text style={styles.captureText}>Tap to sign</Text>
            <Text style={styles.captureHint}>
              Draw your signature with your finger
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Help text */}
      {help_text && !error && (
        <Text style={styles.helpText}>{help_text}</Text>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorRow}>
          <Warning size={14} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Signature Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sign Here</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <X size={24} color={colors.neutral.darkGray} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <SignatureCanvas
              onSignatureCapture={handleSignatureCapture}
              onClear={() => {}}
              height={250}
              penColor={colors.primary.black}
              backgroundColor={colors.neutral.white}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  required: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
    marginLeft: spacing.xxs,
  },
  signatureContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    overflow: 'hidden',
    ...shadows.xs,
  },
  signatureContainerError: {
    borderColor: colors.semantic.error,
  },
  captureButton: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  captureText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  captureHint: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  signedContent: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xs,
  },
  signedText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  signaturePreview: {
    width: '100%',
    height: 100,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.sm,
    overflow: 'hidden',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  clearButtonText: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
  },
  helpText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  modalTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.full,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
});

export default SignatureField;
