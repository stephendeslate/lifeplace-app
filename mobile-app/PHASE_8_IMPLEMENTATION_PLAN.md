# Phase 8: Documents & File Management - Implementation Plan

> **Prerequisite**: Phases 1-7 must be completed
> **Reference**: [DEVELOPMENT_GUIDE.md Section 10.8](DEVELOPMENT_GUIDE.md)
> **Client-Portal Reference**: [frontend/client-portal/src/types/documents.types.ts](../frontend/client-portal/src/types/documents.types.ts)

---

## Overview

Phase 8 implements a comprehensive document management system for the LifePlace mobile app, providing users with a centralized view of all documents across their events, plus the ability to upload files.

### Goals
- Create a standalone Documents screen aggregating all documents across events
- Implement robust file download and sharing functionality
- Add file upload capability for questionnaire responses and event requirements
- Provide search, filtering, and sorting for document discovery
- Ensure secure file handling following security best practices

### Current State Analysis

**Already Implemented:**
- [package.json](package.json) - `expo-file-system` and `expo-sharing` are installed
- [src/utils/documentDownload.ts](src/utils/documentDownload.ts) - Download/sharing utilities (381 lines)
- [src/hooks/useDocumentDownload.ts](src/hooks/useDocumentDownload.ts) - Download hooks for invoices, contracts, quotes
- [src/components/events/tabs/DocumentsTab.tsx](src/components/events/tabs/DocumentsTab.tsx) - Event-specific documents view
- [src/apis/events.api.ts](src/apis/events.api.ts) - `getEventDocuments()` API call
- [src/types/events.types.ts](src/types/events.types.ts) - `EventFile` type definition

**Missing (To Be Implemented):**
- `app/documents/` - Documents screen and layout
- `src/apis/documents.api.ts` - Dedicated documents API layer
- `src/hooks/useDocuments.ts` - Main documents hook with aggregation
- `src/components/documents/` - Document-specific components
- `src/types/documents.types.ts` - Extended document types
- `expo-image-picker` - Image selection from camera/gallery
- `expo-document-picker` - Generic file selection
- `src/hooks/useFileUpload.ts` - File upload hook
- `src/components/common/FileUploader.tsx` - Universal file uploader

---

## 8.1 Type Definitions

### 8.1.1 Create Document Types

**File:** `src/types/documents.types.ts`

Define comprehensive document types matching client-portal architecture:

```typescript
/**
 * Document Types
 *
 * Type definitions for the document management system.
 * Mirrors frontend/client-portal/src/types/documents.types.ts
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type DocumentType = 'CONTRACT' | 'UPLOAD' | 'RECEIPT' | 'PHOTO' | 'OTHER';

export type DocumentCategory =
  | 'CONTRACT'
  | 'QUOTE'
  | 'PAYMENT'
  | 'REQUIREMENTS'
  | 'PHOTO'
  | 'OTHER';

export type DocumentSortOption = 'date' | 'name' | 'type' | 'size';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Unified document item interface
 */
export interface DocumentItem {
  id: string;
  type: DocumentType;
  name: string;
  description?: string;
  eventId: number;
  eventName: string;
  category: DocumentCategory;
  fileType: string;        // MIME type or file extension
  fileSize: number;        // Size in bytes
  downloadUrl: string;
  previewUrl?: string;     // For images/PDFs that support preview
  createdAt: string;
  uploadedBy?: string;
  // Contract-specific fields (only when type === 'CONTRACT')
  contractId?: string;
  contractStatus?: string;
  signedAt?: string | null;
  templateName?: string;
}

/**
 * Filter options for documents
 */
export interface DocumentFilters {
  eventId?: number;
  types?: DocumentType[];
  categories?: DocumentCategory[];
  search?: string;
}

/**
 * Event option for filter dropdown
 */
export interface DocumentEventOption {
  id: number;
  name: string;
  documentCount: number;
}

/**
 * Upload form data
 */
export interface DocumentUploadData {
  eventId: number;
  name: string;
  category: DocumentCategory;
  description?: string;
  file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  };
}

/**
 * Upload result
 */
export interface DocumentUploadResult {
  success: boolean;
  document?: DocumentItem;
  error?: string;
}

/**
 * Download progress
 */
export interface DocumentDownloadProgress {
  totalBytes: number;
  bytesWritten: number;
  progress: number; // 0-1
}

// =============================================================================
// CONFIG OBJECTS
// =============================================================================

/**
 * Document type configuration for UI rendering
 */
export const DOCUMENT_TYPE_CONFIGS: Record<
  DocumentType,
  {
    label: string;
    pluralLabel: string;
    color: string;
    iconName: string;
  }
> = {
  CONTRACT: {
    label: 'Contract',
    pluralLabel: 'Contracts',
    color: '#1976d2',
    iconName: 'FileText',
  },
  UPLOAD: {
    label: 'Upload',
    pluralLabel: 'Uploads',
    color: '#2e7d32',
    iconName: 'UploadSimple',
  },
  RECEIPT: {
    label: 'Receipt',
    pluralLabel: 'Receipts',
    color: '#ed6c02',
    iconName: 'Receipt',
  },
  PHOTO: {
    label: 'Photo',
    pluralLabel: 'Photos',
    color: '#9c27b0',
    iconName: 'Image',
  },
  OTHER: {
    label: 'Other',
    pluralLabel: 'Other',
    color: '#757575',
    iconName: 'File',
  },
};

/**
 * Category to type mapping
 */
export const CATEGORY_TO_TYPE: Record<DocumentCategory, DocumentType> = {
  CONTRACT: 'CONTRACT',
  QUOTE: 'OTHER',
  PAYMENT: 'RECEIPT',
  REQUIREMENTS: 'UPLOAD',
  PHOTO: 'PHOTO',
  OTHER: 'OTHER',
};

/**
 * File extension to icon name mapping
 */
export const FILE_EXTENSION_ICONS: Record<string, string> = {
  pdf: 'FilePdf',
  doc: 'FileDoc',
  docx: 'FileDoc',
  xls: 'FileXls',
  xlsx: 'FileXls',
  jpg: 'FileImage',
  jpeg: 'FileImage',
  png: 'FileImage',
  gif: 'FileImage',
  txt: 'FileText',
  rtf: 'FileText',
  default: 'File',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format file size for display
 */
export const formatDocumentSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Type guard for contract documents
 */
export const isContractDocument = (doc: DocumentItem): boolean => {
  return doc.type === 'CONTRACT' && doc.contractId !== undefined;
};

/**
 * Get MIME type from extension
 */
export const getMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};
```

**Verification:** Type-check with `npx tsc --noEmit`.

---

## 8.2 API Layer

### 8.2.1 Create Documents API

**File:** `src/apis/documents.api.ts`

```typescript
/**
 * Documents API
 *
 * API layer for document management. Aggregates documents from
 * multiple sources (events, contracts, uploads) into a unified interface.
 */

import api from '@/utils/api';
import type {
  DocumentItem,
  DocumentFilters,
  DocumentEventOption,
  DocumentUploadData,
  DocumentCategory,
} from '@/types/documents.types';
import type { EventFile } from '@/types/events.types';
import { CATEGORY_TO_TYPE } from '@/types/documents.types';

// =============================================================================
// API FUNCTIONS
// =============================================================================

export const documentsApi = {
  /**
   * Get all documents across all events for the current user
   * This aggregates documents from multiple event endpoints
   */
  getAllDocuments: async (): Promise<DocumentItem[]> => {
    // Fetch all events first
    const eventsResponse = await api.get<{ results?: { id: number; name: string }[] } | { id: number; name: string }[]>(
      '/client/events/'
    );

    const events = Array.isArray(eventsResponse.data)
      ? eventsResponse.data
      : eventsResponse.data.results || [];

    // Fetch documents for each event in parallel
    const documentPromises = events.map(async (event) => {
      try {
        const response = await api.get<EventFile[]>(
          `/client/events/${event.id}/documents/`
        );
        return response.data.map((doc) =>
          mapEventFileToDocumentItem(doc, event.id, event.name)
        );
      } catch {
        // If documents endpoint fails for an event, return empty array
        return [];
      }
    });

    const documentArrays = await Promise.all(documentPromises);
    return documentArrays.flat();
  },

  /**
   * Get documents for a specific event
   */
  getEventDocuments: async (eventId: number): Promise<DocumentItem[]> => {
    const eventResponse = await api.get<{ id: number; name: string }>(
      `/client/events/${eventId}/`
    );
    const response = await api.get<EventFile[]>(
      `/client/events/${eventId}/documents/`
    );
    return response.data.map((doc) =>
      mapEventFileToDocumentItem(doc, eventId, eventResponse.data.name)
    );
  },

  /**
   * Get list of events with document counts for filtering
   */
  getDocumentEvents: async (): Promise<DocumentEventOption[]> => {
    const eventsResponse = await api.get<{ results?: { id: number; name: string }[] } | { id: number; name: string }[]>(
      '/client/events/'
    );

    const events = Array.isArray(eventsResponse.data)
      ? eventsResponse.data
      : eventsResponse.data.results || [];

    // Get document counts for each event
    const eventOptions = await Promise.all(
      events.map(async (event) => {
        try {
          const response = await api.get<EventFile[]>(
            `/client/events/${event.id}/documents/`
          );
          return {
            id: event.id,
            name: event.name,
            documentCount: response.data.length,
          };
        } catch {
          return {
            id: event.id,
            name: event.name,
            documentCount: 0,
          };
        }
      })
    );

    // Only return events that have documents
    return eventOptions.filter((e) => e.documentCount > 0);
  },

  /**
   * Upload a document to an event
   */
  uploadDocument: async (data: DocumentUploadData): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('file', {
      uri: data.file.uri,
      name: data.file.name,
      type: data.file.type,
    } as unknown as Blob);

    const response = await api.post<EventFile>(
      `/client/events/${data.eventId}/upload_file/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // Get event name for the response
    const eventResponse = await api.get<{ name: string }>(
      `/client/events/${data.eventId}/`
    );

    return mapEventFileToDocumentItem(
      response.data,
      data.eventId,
      eventResponse.data.name
    );
  },

  /**
   * Get document download URL
   * Returns a pre-signed URL or blob endpoint for secure download
   */
  getDocumentDownloadUrl: (eventId: number, fileId: number): string => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/client/events/${eventId}/documents/${fileId}/download/`;
  },

  /**
   * Download document as blob (for sharing)
   */
  downloadDocumentBlob: async (eventId: number, fileId: number): Promise<Blob> => {
    const response = await api.get<Blob>(
      `/client/events/${eventId}/documents/${fileId}/download/`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map EventFile from backend to DocumentItem
 */
function mapEventFileToDocumentItem(
  file: EventFile,
  eventId: number,
  eventName: string
): DocumentItem {
  const category = (file.category || 'OTHER') as DocumentCategory;
  const type = CATEGORY_TO_TYPE[category] || 'OTHER';

  return {
    id: file.id.toString(),
    type,
    name: file.name,
    description: file.description,
    eventId,
    eventName,
    category,
    fileType: file.file_type || getExtensionFromName(file.name),
    fileSize: file.size || 0,
    downloadUrl: file.download_url,
    previewUrl: file.preview_url,
    createdAt: file.created_at,
    uploadedBy: file.uploaded_by,
  };
}

/**
 * Extract extension from filename
 */
function getExtensionFromName(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export default documentsApi;
```

**Verification:** Import and test `getAllDocuments()` returns correctly typed data.

---

## 8.3 Hooks Layer

### 8.3.1 Create Main Documents Hook

**File:** `src/hooks/useDocuments.ts`

```typescript
/**
 * useDocuments Hook
 *
 * React Query hooks for document management with filtering,
 * sorting, and aggregation across all events.
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/apis/documents.api';
import type {
  DocumentItem,
  DocumentFilters,
  DocumentSortOption,
  DocumentEventOption,
  DocumentUploadData,
} from '@/types/documents.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) =>
    [...documentKeys.lists(), filters] as const,
  events: () => [...documentKeys.all, 'events'] as const,
  event: (eventId: number) =>
    [...documentKeys.all, 'event', eventId] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch all documents across all events
 */
export function useAllDocuments() {
  return useQuery({
    queryKey: documentKeys.lists(),
    queryFn: () => documentsApi.getAllDocuments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch documents for a specific event
 */
export function useEventDocuments(eventId: number) {
  return useQuery({
    queryKey: documentKeys.event(eventId),
    queryFn: () => documentsApi.getEventDocuments(eventId),
    enabled: !!eventId,
  });
}

/**
 * Fetch events with document counts
 */
export function useDocumentEvents() {
  return useQuery({
    queryKey: documentKeys.events(),
    queryFn: () => documentsApi.getDocumentEvents(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DocumentUploadData) => documentsApi.uploadDocument(data),
    onSuccess: (_, variables) => {
      // Invalidate all document queries
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      // Also invalidate the specific event's documents
      queryClient.invalidateQueries({
        queryKey: documentKeys.event(variables.eventId),
      });
    },
  });
}

/**
 * Main documents hook with filtering, sorting, and search
 */
export function useDocuments(initialFilters?: DocumentFilters) {
  const queryClient = useQueryClient();

  // State for filters and sorting
  const [filters, setFilters] = useState<DocumentFilters>(
    initialFilters || {}
  );
  const [sortBy, setSortBy] = useState<DocumentSortOption>('date');
  const [sortAscending, setSortAscending] = useState(false);

  // Fetch all documents
  const {
    data: allDocuments,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAllDocuments();

  // Fetch events for filter dropdown
  const { data: eventOptions } = useDocumentEvents();

  // Filtered and sorted documents
  const documents = useMemo(() => {
    if (!allDocuments) return [];

    let filtered = [...allDocuments];

    // Apply event filter
    if (filters.eventId) {
      filtered = filtered.filter((doc) => doc.eventId === filters.eventId);
    }

    // Apply type filter
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter((doc) => filters.types!.includes(doc.type));
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((doc) =>
        filters.categories!.includes(doc.category)
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchLower) ||
          doc.eventName.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'date':
        default:
          comparison =
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }

      return sortAscending ? comparison : -comparison;
    });

    return filtered;
  }, [allDocuments, filters, sortBy, sortAscending]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<DocumentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortAscending((prev) => !prev);
  }, []);

  // Refresh documents
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Statistics
  const stats = useMemo(() => {
    if (!allDocuments) {
      return {
        total: 0,
        byType: {} as Record<string, number>,
        byEvent: {} as Record<number, number>,
      };
    }

    const byType: Record<string, number> = {};
    const byEvent: Record<number, number> = {};

    allDocuments.forEach((doc) => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      byEvent[doc.eventId] = (byEvent[doc.eventId] || 0) + 1;
    });

    return {
      total: allDocuments.length,
      byType,
      byEvent,
    };
  }, [allDocuments]);

  return {
    // Data
    documents,
    allDocuments,
    eventOptions,
    stats,

    // State
    filters,
    sortBy,
    sortAscending,

    // Status
    isLoading,
    isError,
    error,
    isRefetching,

    // Actions
    setFilters,
    updateFilters,
    clearFilters,
    setSortBy,
    toggleSortDirection,
    setSortAscending,
    refresh,
  };
}

export default useDocuments;
```

**Verification:** Test hook returns filtered/sorted data correctly.

---

## 8.4 Install File Picker Dependencies

### 8.4.1 Install expo-image-picker

```bash
cd mobile-app
npx expo install expo-image-picker
```

**Required `app.json` additions:**

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "LifePlace needs access to your photos to upload event images.",
          "cameraPermission": "LifePlace needs access to your camera to take event photos."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "LifePlace needs access to your photos to upload event images.",
        "NSCameraUsageDescription": "LifePlace needs access to your camera to take event photos."
      }
    }
  }
}
```

### 8.4.2 Install expo-document-picker

```bash
npx expo install expo-document-picker
```

**Required `app.json` additions:**

```json
{
  "expo": {
    "plugins": [
      "expo-document-picker"
    ]
  }
}
```

**Verification:** Run `npm ls expo-image-picker expo-document-picker` to confirm installation.

---

## 8.5 File Upload Hook

### 8.5.1 Create useFileUpload Hook

**File:** `src/hooks/useFileUpload.ts`

```typescript
/**
 * useFileUpload Hook
 *
 * Provides unified file selection and upload functionality
 * supporting both images (camera/gallery) and documents.
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
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
        setSelectedFiles((prev) =>
          prev.filter((f) => f.uri !== file.uri)
        );

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
          progress: i / selectedFiles.length,
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
```

**Verification:** Test file selection from camera, gallery, and document picker.

---

## 8.6 Components

### 8.6.1 Create DocumentCard Component

**File:** `src/components/documents/DocumentCard.tsx`

```typescript
/**
 * DocumentCard Component
 *
 * A card displaying document information with download/share actions.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  File,
  FilePdf,
  FileDoc,
  FileXls,
  FileImage,
  DownloadSimple,
  ShareNetwork,
  Eye,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, borderRadius } from '@/theme';
import type { DocumentItem } from '@/types/documents.types';
import { formatDocumentSize, getFileExtension } from '@/types/documents.types';
import { formatCardDate } from '@/utils/formatting';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentCardProps {
  document: DocumentItem;
  onDownload?: (document: DocumentItem) => void;
  onShare?: (document: DocumentItem) => void;
  onPreview?: (document: DocumentItem) => void;
  onPress?: (document: DocumentItem) => void;
  isDownloading?: boolean;
  showEventName?: boolean;
  compact?: boolean;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const FILE_ICONS: Record<string, React.ComponentType<{ size: number; color: string; weight?: string }>> = {
  pdf: FilePdf,
  doc: FileDoc,
  docx: FileDoc,
  xls: FileXls,
  xlsx: FileXls,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  gif: FileImage,
};

const FILE_COLORS: Record<string, string> = {
  pdf: colors.semantic.error,
  doc: colors.accent.lavender,
  docx: colors.accent.lavender,
  xls: colors.semantic.success,
  xlsx: colors.semantic.success,
  jpg: colors.semantic.warning,
  jpeg: colors.semantic.warning,
  png: colors.semantic.warning,
  gif: colors.semantic.warning,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function DocumentCard({
  document,
  onDownload,
  onShare,
  onPreview,
  onPress,
  isDownloading = false,
  showEventName = true,
  compact = false,
}: DocumentCardProps) {
  const extension = getFileExtension(document.name);
  const IconComponent = FILE_ICONS[extension] || File;
  const iconColor = FILE_COLORS[extension] || colors.neutral.gray;

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDownload?.(document);
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare?.(document);
  };

  const handlePreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPreview?.(document);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(document);
  };

  const content = (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <IconComponent size={compact ? 20 : 24} color={iconColor} weight="bold" />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {document.name}
        </Text>
        <View style={styles.meta}>
          {showEventName && (
            <>
              <Text style={styles.metaText} numberOfLines={1}>
                {document.eventName}
              </Text>
              <Text style={styles.separator}>•</Text>
            </>
          )}
          <Text style={styles.metaText}>
            {formatDocumentSize(document.fileSize)}
          </Text>
          {!compact && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.metaText}>
                {formatCardDate(document.createdAt)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.accent.lavender} />
        ) : (
          <>
            {onPreview && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePreview}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Eye size={20} color={colors.primary.charcoal} />
              </TouchableOpacity>
            )}
            {onShare && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <ShareNetwork size={20} color={colors.primary.charcoal} />
              </TouchableOpacity>
            )}
            {onDownload && (
              <TouchableOpacity
                style={[styles.actionButton, styles.downloadButton]}
                onPress={handleDownload}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <DownloadSimple size={20} color={colors.accent.lavender} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  containerCompact: {
    padding: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typeScale.bodyMedium,
    fontWeight: '600',
    color: colors.primary.charcoal,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  separator: {
    marginHorizontal: spacing.xs,
    color: colors.neutral.warmGray,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  downloadButton: {
    backgroundColor: colors.accent.lavenderSubtle,
  },
});

export default DocumentCard;
```

### 8.6.2 Create FileUploader Component

**File:** `src/components/common/FileUploader.tsx`

```typescript
/**
 * FileUploader Component
 *
 * A unified file upload component supporting camera, gallery, and documents.
 */

import React, { useState } from 'react';
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
  Trash,
  CloudArrowUp,
  Plus,
  File,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, borderRadius } from '@/theme';
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
    clearFiles,
    uploadAllFiles,
  } = useFileUpload();

  // Notify parent when files change
  React.useEffect(() => {
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
      onUploadComplete?.(results.map((r) => ({ uri: r.downloadUrl, name: r.name })));
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
            <File size={24} color={colors.neutral.gray} />
          </View>
        )}
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFile(item.uri)}
        >
          <X size={16} color={colors.neutral.white} />
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
          <Plus size={20} color={colors.accent.lavender} />
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
              <ActivityIndicator size="small" color={colors.neutral.white} />
              <Text style={styles.uploadButtonText}>
                Uploading... {Math.round(uploadProgress.progress * 100)}%
              </Text>
            </>
          ) : (
            <>
              <CloudArrowUp size={20} color={colors.neutral.white} weight="bold" />
              <Text style={styles.uploadButtonText}>
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
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
                <X size={24} color={colors.primary.charcoal} />
              </TouchableOpacity>
            </View>

            {allowCamera && (
              <TouchableOpacity style={styles.optionButton} onPress={handlePickCamera}>
                <View style={[styles.optionIcon, { backgroundColor: colors.accent.blush + '20' }]}>
                  <Camera size={24} color={colors.accent.blush} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionDescription}>Use your camera</Text>
                </View>
              </TouchableOpacity>
            )}

            {allowGallery && (
              <TouchableOpacity style={styles.optionButton} onPress={handlePickGallery}>
                <View style={[styles.optionIcon, { backgroundColor: colors.accent.lavender + '20' }]}>
                  <ImageIcon size={24} color={colors.accent.lavender} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Choose from Gallery</Text>
                  <Text style={styles.optionDescription}>Select existing photos</Text>
                </View>
              </TouchableOpacity>
            )}

            {allowDocuments && (
              <TouchableOpacity style={styles.optionButton} onPress={handlePickDocument}>
                <View style={[styles.optionIcon, { backgroundColor: colors.semantic.info + '20' }]}>
                  <FileArrowUp size={24} color={colors.semantic.info} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Browse Files</Text>
                  <Text style={styles.optionDescription}>PDF, DOC, XLS, TXT</Text>
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
    gap: spacing.md,
  },
  fileList: {
    gap: spacing.sm,
  },
  filePreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.sand,
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
    backgroundColor: colors.neutral.warmGray,
  },
  fileName: {
    ...typeScale.labelSmall,
    color: colors.primary.charcoal,
    padding: spacing.xs,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.accent.lavender,
    backgroundColor: colors.accent.lavenderSubtle,
  },
  addButtonCompact: {
    padding: spacing.sm,
  },
  addButtonText: {
    ...typeScale.labelMedium,
    color: colors.accent.lavender,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent.lavender,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20, // Extra for bottom safe area
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typeScale.titleLarge,
    color: colors.primary.charcoal,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.cream,
    marginBottom: spacing.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...typeScale.bodyMedium,
    fontWeight: '600',
    color: colors.primary.charcoal,
  },
  optionDescription: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
});

export default FileUploader;
```

### 8.6.3 Create Documents Screen Components Index

**File:** `src/components/documents/index.ts`

```typescript
export { DocumentCard, type DocumentCardProps } from './DocumentCard';
```

---

## 8.7 Documents Screen

### 8.7.1 Create Documents Layout

**File:** `app/documents/_layout.tsx`

```typescript
/**
 * Documents Layout
 *
 * Stack navigator for the documents section.
 */

import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function DocumentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.neutral.cream },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
```

### 8.7.2 Create Documents Screen

**File:** `app/documents/index.tsx`

```typescript
/**
 * Documents Screen
 *
 * Aggregated view of all documents across events with search,
 * filtering, and sorting capabilities.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  MagnifyingGlass,
  Funnel,
  SortAscending,
  SortDescending,
  FileText,
  X,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, borderRadius } from '@/theme';
import { useDocuments } from '@/hooks/useDocuments';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { DocumentCard } from '@/components/documents';
import { EmptyState, Skeleton, FilterChips } from '@/components/common';
import type { DocumentItem, DocumentType, DocumentSortOption } from '@/types/documents.types';
import { DOCUMENT_TYPE_CONFIGS } from '@/types/documents.types';

// =============================================================================
// FILTER OPTIONS
// =============================================================================

const TYPE_FILTERS: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CONTRACT', label: 'Contracts' },
  { value: 'RECEIPT', label: 'Receipts' },
  { value: 'UPLOAD', label: 'Uploads' },
  { value: 'PHOTO', label: 'Photos' },
  { value: 'OTHER', label: 'Other' },
];

const SORT_OPTIONS: { value: DocumentSortOption; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'size', label: 'Size' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function DocumentsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const {
    documents,
    isLoading,
    isRefetching,
    refresh,
    filters,
    updateFilters,
    sortBy,
    setSortBy,
    sortAscending,
    toggleSortDirection,
    stats,
  } = useDocuments();

  const {
    isDownloading,
    downloadInvoicePDF,
    downloadContractPDF,
    shareLocalDocument,
  } = useDocumentDownload();

  // Apply search filter
  const filteredDocuments = useMemo(() => {
    let result = documents;

    // Apply type filter
    if (selectedType !== 'all') {
      result = result.filter((doc) => doc.type === selectedType);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.eventName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [documents, selectedType, searchQuery]);

  // Handlers
  const handleTypeChange = (type: DocumentType | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(type);
    if (type === 'all') {
      updateFilters({ types: undefined });
    } else {
      updateFilters({ types: [type] });
    }
  };

  const handleSortChange = (option: DocumentSortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(option);
    setShowSortMenu(false);
  };

  const handleDownload = useCallback(async (doc: DocumentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (doc.type === 'CONTRACT' && doc.contractId) {
        await downloadContractPDF(
          parseInt(doc.contractId),
          doc.templateName || doc.name
        );
      } else {
        // For other document types, use generic download
        Alert.alert(
          'Download',
          'Document will be downloaded and shared.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Download Failed', 'Unable to download document.');
    }
  }, [downloadContractPDF]);

  const handleShare = useCallback(async (doc: DocumentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Share functionality would use the downloadUrl
    Alert.alert('Share', `Share ${doc.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: () => console.log('Share:', doc.downloadUrl) },
    ]);
  }, []);

  const handlePreview = useCallback((doc: DocumentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to preview screen or open in-app viewer
    if (doc.type === 'CONTRACT' && doc.contractId) {
      router.push(`/contracts/${doc.contractId}`);
    }
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: DocumentItem }) => (
      <DocumentCard
        document={item}
        onDownload={handleDownload}
        onShare={handleShare}
        onPreview={item.type === 'CONTRACT' ? handlePreview : undefined}
        isDownloading={isDownloading}
        showEventName
      />
    ),
    [handleDownload, handleShare, handlePreview, isDownloading]
  );

  const renderEmpty = () => (
    <EmptyState
      icon="document"
      title="No Documents"
      description={
        searchQuery || selectedType !== 'all'
          ? 'No documents match your filters. Try adjusting your search.'
          : 'Documents from your events will appear here.'
      }
    />
  );

  const renderHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <MagnifyingGlass size={20} color={colors.neutral.gray} />
          <TextInput
            style={styles.searchText}
            placeholder="Search documents..."
            placeholderTextColor={colors.neutral.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.neutral.gray} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => toggleSortDirection()}
        >
          {sortAscending ? (
            <SortAscending size={24} color={colors.primary.charcoal} />
          ) : (
            <SortDescending size={24} color={colors.primary.charcoal} />
          )}
        </TouchableOpacity>
      </View>

      {/* Type Filters */}
      <FlatList
        horizontal
        data={TYPE_FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleTypeChange(item.value)}
            style={[
              styles.filterChip,
              selectedType === item.value && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === item.value && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Sort Options */}
      <View style={styles.sortOptions}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => handleSortChange(option.value)}
            style={[
              styles.sortOption,
              sortBy === option.value && styles.sortOptionActive,
            ]}
          >
            <Text
              style={[
                styles.sortOptionText,
                sortBy === option.value && styles.sortOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
      </Text>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Documents</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={72} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>
          {stats.total} total across {Object.keys(stats.byEvent).length} events
        </Text>
      </View>

      {/* Document List */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            colors={[colors.accent.lavender]}
            tintColor={colors.accent.lavender}
          />
        }
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: layout.statusBarHeight + spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...typeScale.headlineLarge,
    color: colors.primary.charcoal,
  },
  subtitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchText: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.charcoal,
  },
  sortButton: {
    padding: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
  },
  filterList: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary.charcoal,
  },
  filterChipText: {
    ...typeScale.labelMedium,
    color: colors.primary.charcoal,
  },
  filterChipTextActive: {
    color: colors.neutral.white,
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  sortLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  sortOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  sortOptionActive: {
    backgroundColor: colors.accent.lavenderSubtle,
  },
  sortOptionText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  sortOptionTextActive: {
    color: colors.accent.lavender,
    fontWeight: '600',
  },
  resultsCount: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: layout.bottomNavHeight + spacing.xl,
  },
  separator: {
    height: spacing.sm,
  },
  loadingContainer: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing.md,
  },
});
```

---

## 8.8 Integration Updates

### 8.8.1 Update App Navigation

Add documents route to the app navigation. Update `app/_layout.tsx` to include the documents stack.

### 8.8.2 Update app.json Plugins

**File:** `app.json` (add to plugins array)

```json
{
  "expo": {
    "plugins": [
      "expo-document-picker",
      [
        "expo-image-picker",
        {
          "photosPermission": "LifePlace needs access to your photos to upload event images.",
          "cameraPermission": "LifePlace needs access to your camera to take event photos."
        }
      ]
    ]
  }
}
```

### 8.8.3 Update Package.json Scripts (Optional)

Add a test script for the documents module:

```json
{
  "scripts": {
    "test:documents": "jest --testPathPattern=documents"
  }
}
```

---

## 8.9 Testing Checklist

### Unit Tests
- [ ] `useDocuments` hook returns filtered/sorted data correctly
- [ ] `useFileUpload` hook handles file selection properly
- [ ] `documentsApi` aggregates documents from multiple events
- [ ] Type guards work correctly for contract documents

### Integration Tests
- [ ] Documents screen loads and displays documents
- [ ] Search filters documents correctly
- [ ] Type filters work as expected
- [ ] Sort options change document order
- [ ] Pull-to-refresh fetches new data

### E2E Tests
- [ ] Camera permission flow works
- [ ] Gallery selection works
- [ ] Document picker opens and selects files
- [ ] File upload completes successfully
- [ ] Downloaded files open in share sheet

### Manual Testing
- [ ] Test on iOS simulator
- [ ] Test on physical iPhone
- [ ] Test with various file types (PDF, images, docs)
- [ ] Test with large files (near size limit)
- [ ] Test offline behavior

---

## 8.10 Security Considerations

Following [MOBILE_SECURITY.md](../docs/security/MOBILE_SECURITY.md):

1. **File Validation**
   - Validate file types before upload
   - Enforce file size limits (10MB default)
   - Sanitize file names

2. **Secure Download**
   - Use authenticated API requests
   - Download to cache directory, not persistent storage
   - Clean up temporary files after sharing

3. **Permission Handling**
   - Request only necessary permissions
   - Handle permission denial gracefully
   - Explain why permissions are needed

4. **Data Handling**
   - Don't store sensitive documents permanently
   - Clear cache periodically
   - Use secure file system APIs

---

## 8.11 Implementation Order

1. **Types & API** (8.1, 8.2)
   - Create type definitions
   - Create documents API layer

2. **Hooks** (8.3)
   - Create useDocuments hook

3. **Dependencies** (8.4)
   - Install expo-image-picker
   - Install expo-document-picker
   - Update app.json

4. **Upload Hook** (8.5)
   - Create useFileUpload hook

5. **Components** (8.6)
   - Create DocumentCard
   - Create FileUploader

6. **Screen** (8.7)
   - Create documents layout
   - Create documents screen

7. **Integration** (8.8)
   - Update navigation
   - Update app.json

8. **Testing** (8.9, 8.10)
   - Run all tests
   - Security review

---

## 8.12 Files to Create/Modify

### New Files
| File | Description |
|------|-------------|
| `src/types/documents.types.ts` | Document type definitions |
| `src/apis/documents.api.ts` | Documents API layer |
| `src/hooks/useDocuments.ts` | Main documents hook |
| `src/hooks/useFileUpload.ts` | File upload hook |
| `src/components/documents/DocumentCard.tsx` | Document card component |
| `src/components/documents/index.ts` | Component exports |
| `src/components/common/FileUploader.tsx` | Universal file uploader |
| `app/documents/_layout.tsx` | Documents stack layout |
| `app/documents/index.tsx` | Documents screen |

### Modified Files
| File | Changes |
|------|---------|
| `app.json` | Add expo-image-picker and expo-document-picker plugins |
| `package.json` | Dependencies added via expo install |
| `app/_layout.tsx` | Add documents route (if not using expo-router auto-routing) |

---

## 8.13 Verification Checklist

- [ ] All dependencies installed successfully
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Documents screen displays aggregated documents
- [ ] Search, filter, and sort work correctly
- [ ] File upload from camera works
- [ ] File upload from gallery works
- [ ] Document picker selects files correctly
- [ ] Downloads trigger share sheet
- [ ] Pull-to-refresh updates data
- [ ] Empty states display correctly
- [ ] Loading skeletons show during fetch
- [ ] Error handling shows appropriate messages
