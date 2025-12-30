/**
 * useFileUpload Hook
 *
 * Provides unified file selection and upload functionality
 * supporting both images (camera/gallery) and documents.
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/apis/documents.api';
import { documentKeys } from '@/hooks/useDocuments';
import type {
  DocumentCategory,
  DocumentItem,
  DocumentUploadData,
} from '@/types/documents.types';

// =============================================================================
// TYPES
// =============================================================================

export interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface FileUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowMultiple?: boolean;
}

export interface FileUploadProgress {
  uploading: boolean;
  progress: number; // 0-1
  currentFile?: string;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// =============================================================================
// HOOK
// =============================================================================

export function useFileUpload(options: FileUploadOptions = {}) {
  const queryClient = useQueryClient();
  const { maxSizeBytes = DEFAULT_MAX_SIZE } = options;

  // State
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress>({
    uploading: false,
    progress: 0,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (data: DocumentUploadData) => documentsApi.uploadDocument(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      queryClient.invalidateQueries({
        queryKey: documentKeys.event(variables.eventId),
      });
    },
  });

  // ==========================================================================
  // PERMISSION HELPERS
  // ==========================================================================

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  const requestMediaLibraryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is needed to select images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  // ==========================================================================
  // FILE SELECTION
  // ==========================================================================

  /**
   * Pick image from camera
   */
  const pickFromCamera = useCallback(async (): Promise<SelectedFile | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const file: SelectedFile = {
      uri: asset.uri,
      name: asset.fileName || `photo_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    };

    // Validate file size
    if (file.size && file.size > maxSizeBytes) {
      Alert.alert(
        'File Too Large',
        `The selected file exceeds the maximum size of ${formatBytes(maxSizeBytes)}.`
      );
      return null;
    }

    setSelectedFiles((prev) => [...prev, file]);
    return file;
  }, [requestCameraPermission, maxSizeBytes]);

  /**
   * Pick image from gallery
   */
  const pickFromGallery = useCallback(
    async (allowMultiple = false): Promise<SelectedFile[]> => {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return [];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: allowMultiple,
        allowsEditing: !allowMultiple,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      const files: SelectedFile[] = [];
      for (const asset of result.assets) {
        // Validate file size
        if (asset.fileSize && asset.fileSize > maxSizeBytes) {
          Alert.alert(
            'File Too Large',
            `${asset.fileName || 'Selected file'} exceeds the maximum size of ${formatBytes(maxSizeBytes)}.`
          );
          continue;
        }

        files.push({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        });
      }

      setSelectedFiles((prev) => [...prev, ...files]);
      return files;
    },
    [requestMediaLibraryPermission, maxSizeBytes]
  );

  /**
   * Pick document
   */
  const pickDocument = useCallback(
    async (allowMultiple = false): Promise<SelectedFile[]> => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES],
          copyToCacheDirectory: true,
          multiple: allowMultiple,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return [];
        }

        const files: SelectedFile[] = [];
        for (const asset of result.assets) {
          // Validate file size
          if (asset.size && asset.size > maxSizeBytes) {
            Alert.alert(
              'File Too Large',
              `${asset.name} exceeds the maximum size of ${formatBytes(maxSizeBytes)}.`
            );
            continue;
          }

          files.push({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
            size: asset.size,
          });
        }

        setSelectedFiles((prev) => [...prev, ...files]);
        return files;
      } catch (error) {
        console.error('Document picker error:', error);
        Alert.alert('Error', 'Failed to select document. Please try again.');
        return [];
      }
    },
    [maxSizeBytes]
  );

  // ==========================================================================
  // UPLOAD
  // ==========================================================================

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (
      file: SelectedFile,
      eventId: number,
      category: DocumentCategory,
      description?: string
    ): Promise<DocumentItem | null> => {
      setUploadProgress({
        uploading: true,
        progress: 0,
        currentFile: file.name,
      });

      try {
        const result = await uploadMutation.mutateAsync({
          eventId,
          name: file.name,
          category,
          description,
          file: {
            uri: file.uri,
            name: file.name,
            type: file.type,
            size: file.size,
          },
        });

        setUploadProgress({ uploading: false, progress: 1 });

        // Remove from selected files
        setSelectedFiles((prev) => prev.filter((f) => f.uri !== file.uri));

        return result;
      } catch (error) {
        setUploadProgress({ uploading: false, progress: 0 });
        console.error('Upload error:', error);
        Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');
        return null;
      }
    },
    [uploadMutation]
  );

  /**
   * Upload all selected files
   */
  const uploadAllFiles = useCallback(
    async (
      eventId: number,
      category: DocumentCategory,
      description?: string
    ): Promise<DocumentItem[]> => {
      const results: DocumentItem[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({
          uploading: true,
          progress: (i + 1) / selectedFiles.length,
          currentFile: file.name,
        });

        const result = await uploadFile(file, eventId, category, description);
        if (result) {
          results.push(result);
        }
      }

      setUploadProgress({ uploading: false, progress: 1 });
      return results;
    },
    [selectedFiles, uploadFile]
  );

  // ==========================================================================
  // FILE MANAGEMENT
  // ==========================================================================

  /**
   * Remove a selected file
   */
  const removeFile = useCallback((uri: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.uri !== uri));
  }, []);

  /**
   * Clear all selected files
   */
  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    selectedFiles,
    uploadProgress,
    isUploading: uploadProgress.uploading,

    // File selection
    pickFromCamera,
    pickFromGallery,
    pickDocument,

    // File management
    removeFile,
    clearFiles,

    // Upload
    uploadFile,
    uploadAllFiles,

    // Mutation state
    uploadError: uploadMutation.error,
    isUploadError: uploadMutation.isError,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default useFileUpload;
