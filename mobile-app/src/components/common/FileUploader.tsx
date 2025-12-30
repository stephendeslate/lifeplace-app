/**
 * FileUploader Component
 *
 * A unified file upload component supporting camera, gallery, and documents.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Image as ImageIcon,
  FileArrowUp,
  X,
  CloudArrowUp,
  Plus,
  File,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useFileUpload, type SelectedFile } from '@/hooks/useFileUpload';
import type { DocumentCategory } from '@/types/documents.types';

// =============================================================================
// TYPES
// =============================================================================

export interface FileUploaderProps {
  eventId: number;
  category?: DocumentCategory;
  description?: string;
  maxFiles?: number;
  onUploadComplete?: (files: { uri: string; name: string }[]) => void;
  onFilesSelected?: (files: SelectedFile[]) => void;
  showUploadButton?: boolean;
  allowCamera?: boolean;
  allowGallery?: boolean;
  allowDocuments?: boolean;
  compact?: boolean;
  placeholder?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FileUploader({
  eventId,
  category = 'OTHER',
  description,
  maxFiles = 5,
  onUploadComplete,
  onFilesSelected,
  showUploadButton = true,
  allowCamera = true,
  allowGallery = true,
  allowDocuments = true,
  compact = false,
  placeholder = 'Add files',
}: FileUploaderProps) {
  const [showPicker, setShowPicker] = useState(false);

  const {
    selectedFiles,
    uploadProgress,
    isUploading,
    pickFromCamera,
    pickFromGallery,
    pickDocument,
    removeFile,
    uploadAllFiles,
  } = useFileUpload();

  // Notify parent when files change
  useEffect(() => {
    onFilesSelected?.(selectedFiles);
  }, [selectedFiles, onFilesSelected]);

  const handlePickCamera = async () => {
    setShowPicker(false);
    await pickFromCamera();
  };

  const handlePickGallery = async () => {
    setShowPicker(false);
    await pickFromGallery(selectedFiles.length < maxFiles - 1);
  };

  const handlePickDocument = async () => {
    setShowPicker(false);
    await pickDocument(selectedFiles.length < maxFiles - 1);
  };

  const handleUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const results = await uploadAllFiles(eventId, category, description);
    if (results.length > 0) {
      onUploadComplete?.(
        results.map((r) => ({ uri: r.downloadUrl, name: r.name }))
      );
    }
  };

  const handleRemoveFile = (uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFile(uri);
  };

  const canAddMore = selectedFiles.length < maxFiles;

  const renderFilePreview = ({ item }: { item: SelectedFile }) => {
    const isImage = item.type.startsWith('image/');

    return (
      <View style={styles.filePreview}>
        {isImage ? (
          <Image source={{ uri: item.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.fileIconContainer}>
            <File size={24} color={theme.colors.neutral[500]} />
          </View>
        )}
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFile(item.uri)}
        >
          <X size={16} color={theme.colors.neutral.white} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <FlatList
          data={selectedFiles}
          renderItem={renderFilePreview}
          keyExtractor={(item) => item.uri}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fileList}
        />
      )}

      {/* Add Button */}
      {canAddMore && (
        <TouchableOpacity
          style={[styles.addButton, compact && styles.addButtonCompact]}
          onPress={() => setShowPicker(true)}
        >
          <Plus size={20} color={theme.colors.accent.wood} />
          <Text style={styles.addButtonText}>{placeholder}</Text>
        </TouchableOpacity>
      )}

      {/* Upload Button */}
      {showUploadButton && selectedFiles.length > 0 && (
        <TouchableOpacity
          style={[
            styles.uploadButton,
            isUploading && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.neutral.white} />
              <Text style={styles.uploadButtonText}>
                Uploading... {Math.round(uploadProgress.progress * 100)}%
              </Text>
            </>
          ) : (
            <>
              <CloudArrowUp
                size={20}
                color={theme.colors.neutral.white}
                weight="bold"
              />
              <Text style={styles.uploadButtonText}>
                Upload {selectedFiles.length} file
                {selectedFiles.length > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add File</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X size={24} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            </View>

            {allowCamera && (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handlePickCamera}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: theme.colors.error[50] },
                  ]}
                >
                  <Camera size={24} color={theme.colors.error[500]} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionDescription}>Use your camera</Text>
                </View>
              </TouchableOpacity>
            )}

            {allowGallery && (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handlePickGallery}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: theme.colors.accent.woodSubtle },
                  ]}
                >
                  <ImageIcon size={24} color={theme.colors.accent.wood} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Choose from Gallery</Text>
                  <Text style={styles.optionDescription}>
                    Select existing photos
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {allowDocuments && (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handlePickDocument}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: theme.colors.info[50] },
                  ]}
                >
                  <FileArrowUp size={24} color={theme.colors.info[500]} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Browse Files</Text>
                  <Text style={styles.optionDescription}>
                    PDF, DOC, XLS, TXT
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  fileList: {
    gap: theme.spacing.sm,
  },
  filePreview: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.sand,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 70,
  },
  fileIconContainer: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral.warmGray,
  },
  fileName: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary[500],
    padding: theme.spacing.xxs,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent.wood,
    backgroundColor: theme.colors.accent.woodSubtle,
  },
  addButtonCompact: {
    padding: theme.spacing.sm,
  },
  addButtonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.accent.wood,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.accent.wood,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 20, // Extra for bottom safe area
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary[500],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[500],
  },
  optionDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
});

export default FileUploader;
