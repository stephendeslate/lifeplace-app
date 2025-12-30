/**
 * FileUploadField - File Upload Field
 *
 * File/image upload with preview and multiple file support.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { UploadSimple, File, X, Warning, Image as ImageIcon, FileDoc, FilePdf } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface FileUploadFieldProps {
  field: QuestionnaireField;
  value: FileInfo[] | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

interface FileInfo {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export function FileUploadField({ field, value, onChange, error }: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const {
    label,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const maxFiles = validation_rules?.max_files ?? 5;
  const allowedTypes = validation_rules?.allowed_file_types ?? ['image/*', 'application/pdf'];
  const maxSize = validation_rules?.max_file_size ?? 10 * 1024 * 1024; // 10MB default

  const files = value || [];

  const handlePickImage = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: maxFiles > 1,
      selectionLimit: maxFiles - files.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newFiles: FileInfo[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      }));

      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      onChange({
        field_id: field.id,
        field_type: field.field_type,
        value: updatedFiles,
      });
    }
  };

  const handlePickDocument = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await DocumentPicker.getDocumentAsync({
      type: allowedTypes,
      multiple: maxFiles > 1,
    });

    if (!result.canceled) {
      const newFiles: FileInfo[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      }));

      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      onChange({
        field_id: field.id,
        field_type: field.field_type,
        value: updatedFiles,
      });
    }
  };

  const handleRemoveFile = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedFiles = files.filter((_, i) => i !== index);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: updatedFiles.length > 0 ? updatedFiles : undefined,
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon size={24} color={colors.tertiary.teal} />;
    }
    if (type === 'application/pdf') {
      return <FilePdf size={24} color={colors.semantic.error} />;
    }
    return <FileDoc size={24} color={colors.accent.wood} />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Upload Area */}
      {files.length < maxFiles && (
        <View style={styles.uploadArea}>
          <TouchableOpacity
            style={[styles.uploadButton, error && styles.uploadButtonError]}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary.black} />
            ) : (
              <>
                <UploadSimple size={32} color={colors.neutral.darkGray} />
                <Text style={styles.uploadText}>Tap to upload</Text>
                <Text style={styles.uploadHint}>
                  {files.length}/{maxFiles} files
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.uploadOptions}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handlePickImage}
            >
              <ImageIcon size={20} color={colors.tertiary.teal} />
              <Text style={styles.optionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handlePickDocument}
            >
              <File size={20} color={colors.accent.wood} />
              <Text style={styles.optionText}>Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* File List */}
      {files.length > 0 && (
        <View style={styles.fileList}>
          {files.map((file, index) => (
            <View key={`${file.uri}-${index}`} style={styles.fileItem}>
              {file.type.startsWith('image/') ? (
                <Image
                  source={{ uri: file.uri }}
                  style={styles.fileThumbnail}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.fileIconContainer}>
                  {getFileIcon(file.type)}
                </View>
              )}
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                {file.size && (
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFile(index)}
              >
                <X size={18} color={colors.neutral.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

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
  uploadArea: {
    marginBottom: spacing.sm,
  },
  uploadButton: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.xs,
  },
  uploadButtonError: {
    borderColor: colors.semantic.error,
  },
  uploadText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  uploadHint: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  optionText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  fileList: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.xs,
  },
  fileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.sm,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.sm,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  fileSize: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
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

export default FileUploadField;
