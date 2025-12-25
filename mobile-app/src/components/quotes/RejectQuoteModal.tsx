/**
 * RejectQuoteModal Component
 *
 * Modal for entering rejection reason when declining a quote.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'phosphor-react-native';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';

interface RejectQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function RejectQuoteModal({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectQuoteModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Decline Quote</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.primary.black} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Please let us know why you're declining this quote. This helps us
              improve our offerings.
            </Text>

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Budget constraints, different requirements..."
              placeholderTextColor={theme.colors.neutral.gray}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              variant="secondary"
              onPress={handleClose}
              style={styles.button}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleConfirm}
              style={styles.button}
              loading={isLoading}
            >
              Decline Quote
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  title: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.lg,
  },
  description: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.darkGray,
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.neutral.beige,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 100,
    ...theme.typeScale.bodyMedium,
    color: theme.colors.primary.black,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  button: {
    flex: 1,
  },
});

export default RejectQuoteModal;
