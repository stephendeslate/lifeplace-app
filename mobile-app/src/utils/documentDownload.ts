/**
 * Document Download Utilities
 *
 * Utilities for downloading, storing, and sharing documents
 * using expo-file-system and expo-sharing.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import api from '@/utils/api';
import { logger } from './logger';

const downloadLogger = logger.create('DocumentDownload');

// =============================================================================
// TYPES
// =============================================================================

export type DocumentType = 'invoice' | 'contract' | 'quote' | 'receipt';

export interface DownloadOptions {
  filename?: string;
  mimeType?: string;
  showShareSheet?: boolean;
  onProgress?: (progress: number) => void;
}

export interface DownloadResult {
  success: boolean;
  localUri?: string;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DOCUMENT_DIR = FileSystem.documentDirectory + 'downloads/';
const CACHE_DIR = FileSystem.cacheDirectory + 'temp_downloads/';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Ensure download directories exist
 */
async function ensureDirectories(): Promise<void> {
  const docInfo = await FileSystem.getInfoAsync(DOCUMENT_DIR);
  if (!docInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOCUMENT_DIR, { intermediates: true });
  }

  const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!cacheInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'pdf';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Generate unique filename
 */
function generateFilename(type: DocumentType, id: number | string, extension = 'pdf'): string {
  const timestamp = Date.now();
  return `${type}_${id}_${timestamp}.${extension}`;
}

/**
 * Clean up old cached files (older than 24 hours)
 */
async function cleanupCache(): Promise<void> {
  try {
    const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!cacheInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = CACHE_DIR + file;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists && fileInfo.modificationTime) {
        const age = now - fileInfo.modificationTime * 1000;
        if (age > maxAge) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
    }
  } catch (error) {
    downloadLogger.warn('Cache cleanup failed:', error);
  }
}

// =============================================================================
// DOWNLOAD FUNCTIONS
// =============================================================================

/**
 * Download a document from API endpoint
 */
export async function downloadDocument(
  url: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const {
    filename = `document_${Date.now()}.pdf`,
    showShareSheet = true,
    onProgress,
  } = options;

  try {
    await ensureDirectories();

    // Use cache directory for temporary downloads
    const localUri = CACHE_DIR + filename;

    // Create download resumable for progress tracking
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localUri,
      {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      },
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(progress);
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (!result?.uri) {
      return { success: false, error: 'Download failed' };
    }

    if (showShareSheet) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: getMimeType(filename),
          dialogTitle: `Share ${filename}`,
          UTI: 'com.adobe.pdf', // iOS only
        });
      } else {
        Alert.alert(
          'Sharing Not Available',
          'Unable to share documents on this device.'
        );
      }
    }

    return { success: true, localUri: result.uri };
  } catch (error) {
    downloadLogger.error('Download error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Download invoice PDF
 */
export async function downloadInvoice(
  invoiceId: number,
  invoiceNumber: string,
  options: Omit<DownloadOptions, 'filename'> = {}
): Promise<DownloadResult> {
  const filename = `invoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const baseUrl = api.defaults.baseURL || '';
  const url = `${baseUrl}/payments/invoices/${invoiceId}/download/`;

  return downloadDocument(url, { ...options, filename });
}

/**
 * Download contract PDF
 */
export async function downloadContract(
  contractId: number,
  templateName: string,
  options: Omit<DownloadOptions, 'filename'> = {}
): Promise<DownloadResult> {
  const safeName = templateName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `contract_${safeName}_${contractId}.pdf`;
  const baseUrl = api.defaults.baseURL || '';
  const url = `${baseUrl}/contracts/${contractId}/download/`;

  return downloadDocument(url, { ...options, filename });
}

/**
 * Download quote PDF
 */
export async function downloadQuote(
  quoteId: number,
  quoteNumber: string,
  options: Omit<DownloadOptions, 'filename'> = {}
): Promise<DownloadResult> {
  const filename = `quote_${quoteNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const baseUrl = api.defaults.baseURL || '';
  const url = `${baseUrl}/quotes/${quoteId}/download/`;

  return downloadDocument(url, { ...options, filename });
}

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Save document to persistent storage
 */
export async function saveDocumentLocally(
  sourceUri: string,
  type: DocumentType,
  id: number | string
): Promise<DownloadResult> {
  try {
    await ensureDirectories();

    const filename = generateFilename(type, id);
    const destUri = DOCUMENT_DIR + filename;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri,
    });

    return { success: true, localUri: destUri };
  } catch (error) {
    downloadLogger.error('Save error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save document',
    };
  }
}

/**
 * List saved documents
 */
export async function listSavedDocuments(): Promise<string[]> {
  try {
    await ensureDirectories();
    return await FileSystem.readDirectoryAsync(DOCUMENT_DIR);
  } catch (error) {
    downloadLogger.error('List documents error:', error);
    return [];
  }
}

/**
 * Delete a saved document
 */
export async function deleteSavedDocument(filename: string): Promise<boolean> {
  try {
    const filePath = DOCUMENT_DIR + filename;
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    return true;
  } catch (error) {
    downloadLogger.error('Delete error:', error);
    return false;
  }
}

/**
 * Get document file info
 */
export async function getDocumentInfo(
  filename: string
): Promise<FileSystem.FileInfo | null> {
  try {
    const filePath = DOCUMENT_DIR + filename;
    const info = await FileSystem.getInfoAsync(filePath);
    return info.exists ? info : null;
  } catch (error) {
    downloadLogger.error('Get info error:', error);
    return null;
  }
}

// =============================================================================
// SHARING FUNCTIONS
// =============================================================================

/**
 * Share a local document
 */
export async function shareDocument(
  localUri: string,
  options: { mimeType?: string; dialogTitle?: string } = {}
): Promise<boolean> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Error', 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(localUri, {
      mimeType: options.mimeType || 'application/pdf',
      dialogTitle: options.dialogTitle || 'Share Document',
      UTI: 'com.adobe.pdf',
    });

    return true;
  } catch (error) {
    downloadLogger.error('Share error:', error);
    Alert.alert('Error', 'Failed to share document.');
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get auth token for API requests
 */
async function getAuthToken(): Promise<string> {
  // This should be imported from your auth context/store
  // For now, we'll get it from the API instance
  const authHeader = api.defaults.headers.common['Authorization'];
  if (typeof authHeader === 'string') {
    return authHeader.replace('Bearer ', '');
  }
  return '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * Check if sharing is available
 */
export async function isSharingAvailable(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

/**
 * Clean up temporary files
 */
export async function cleanupTemporaryFiles(): Promise<void> {
  await cleanupCache();
}

// Initialize cleanup on module load
cleanupCache().catch((err) => downloadLogger.warn('Initial cleanup failed:', err));
