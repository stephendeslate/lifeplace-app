/**
 * Document Types
 *
 * Type definitions for the document management system.
 * Provides types for document listing, filtering, and uploading.
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
  fileType: string; // MIME type or file extension
  fileSize: number; // Size in bytes
  downloadUrl: string;
  previewUrl?: string; // For images/PDFs that support preview
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
    color: '#008080', // teal
    iconName: 'FileText',
  },
  UPLOAD: {
    label: 'Upload',
    pluralLabel: 'Uploads',
    color: '#228B22', // forest green
    iconName: 'UploadSimple',
  },
  RECEIPT: {
    label: 'Receipt',
    pluralLabel: 'Receipts',
    color: '#E5A84B', // warning amber
    iconName: 'Receipt',
  },
  PHOTO: {
    label: 'Photo',
    pluralLabel: 'Photos',
    color: '#8B4513', // wood brown
    iconName: 'Image',
  },
  OTHER: {
    label: 'Other',
    pluralLabel: 'Other',
    color: '#9B9590', // neutral gray
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
