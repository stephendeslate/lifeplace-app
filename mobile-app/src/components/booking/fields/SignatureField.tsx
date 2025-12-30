/**
 * SignatureField - Signature Capture Field
 *
 * Touch-based signature capture with clear and redo options.
 */

import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Signature, Eraser, Warning, Check } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface SignatureFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function SignatureField({ field, value, onChange, error }: SignatureFieldProps) {
  const [isSigned, setIsSigned] = useState(!!value);

  const {
    label,
    help_text,
    is_required,
  } = field;

  const handleCapture = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production, this would open a signature capture modal
    // For now, simulate signature capture
    Alert.alert(
      'Signature Capture',
      'A signature capture canvas would appear here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            const mockSignature = `data:image/png;base64,signature_${Date.now()}`;
            setIsSigned(true);
            onChange({
              field_id: field.id,
              field_type: field.field_type,
              value: mockSignature,
            });
          },
        },
      ]
    );
  };

  const handleClear = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSigned(false);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: undefined,
    });
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Signature Area */}
      <View style={[styles.signatureContainer, error && styles.signatureContainerError]}>
        {isSigned ? (
          <View style={styles.signedContent}>
            <View style={styles.signedBadge}>
              <Check size={16} color={colors.secondary.forest} weight="bold" />
              <Text style={styles.signedText}>Signature captured</Text>
            </View>
            <View style={styles.signaturePlaceholder}>
              <Signature size={48} color={colors.neutral.gray} />
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
            onPress={handleCapture}
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
  signaturePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default SignatureField;
