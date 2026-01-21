// frontend/client-portal/src/types/documents.types.ts

import type { ContractStatus } from './contracts.types';

// Document types for categorization
export type DocumentType = 'CONTRACT' | 'UPLOAD' | 'RECEIPT' | 'PHOTO' | 'OTHER';

// File categories matching backend EventFile categories
export type DocumentCategory =
  | 'CONTRACT'
  | 'QUOTE'
  | 'PAYMENT'
  | 'REQUIREMENTS'
  | 'PHOTO'
  | 'OTHER';

// Unified document item interface
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
  createdAt: string;
  uploadedBy?: string;
  // Contract-specific fields (only for type === 'CONTRACT')
  contractId?: string;
  contractStatus?: ContractStatus;
  signedAt?: string | null;
  templateName?: string;
}

// Filter options for documents
export interface DocumentFilters {
  eventId?: number;
  types?: DocumentType[];
  categories?: DocumentCategory[];
  search?: string;
}

// Sort options for documents
export type DocumentSortOption = 'date' | 'name' | 'type' | 'size';

// Event option for filter dropdown
export interface DocumentEventOption {
  id: number;
  name: string;
  documentCount: number;
}

// Upload form data
export interface DocumentUploadData {
  eventId: number;
  name: string;
  category: DocumentCategory;
  description?: string;
  file: File;
}

// Document type configuration for UI
export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, {
  label: string;
  pluralLabel: string;
  color: string;
  icon: string;
}> = {
  CONTRACT: {
    label: 'Contract',
    pluralLabel: 'Contracts',
    color: '#1976d2',
    icon: 'description',
  },
  UPLOAD: {
    label: 'Upload',
    pluralLabel: 'Uploads',
    color: '#2e7d32',
    icon: 'upload_file',
  },
  RECEIPT: {
    label: 'Receipt',
    pluralLabel: 'Receipts',
    color: '#ed6c02',
    icon: 'receipt',
  },
  PHOTO: {
    label: 'Photo',
    pluralLabel: 'Photos',
    color: '#9c27b0',
    icon: 'photo',
  },
  OTHER: {
    label: 'Other',
    pluralLabel: 'Other',
    color: '#757575',
    icon: 'insert_drive_file',
  },
};

// Document category to type mapping
export const CATEGORY_TO_TYPE: Record<DocumentCategory, DocumentType> = {
  CONTRACT: 'CONTRACT',
  QUOTE: 'OTHER',
  PAYMENT: 'RECEIPT',
  REQUIREMENTS: 'UPLOAD',
  PHOTO: 'PHOTO',
  OTHER: 'OTHER',
};

// File extension to icon mapping
export const FILE_EXTENSION_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  doc: 'description',
  docx: 'description',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  txt: 'article',
  rtf: 'article',
  default: 'insert_drive_file',
};

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Helper to get file extension
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

// Type guard for contract documents
export const isContractDocument = (doc: DocumentItem): boolean => {
  return doc.type === 'CONTRACT' && doc.contractId !== undefined;
};
