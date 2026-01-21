/**
 * useDocumentDownload Hook
 *
 * React hook for downloading and sharing documents.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  downloadInvoice,
  downloadContract,
  downloadQuote,
  shareDocument,
  isSharingAvailable,
  type DownloadResult,
} from '@/utils/documentDownload';

// =============================================================================
// TYPES
// =============================================================================

export interface UseDocumentDownloadReturn {
  isDownloading: boolean;
  downloadProgress: number;
  downloadInvoicePDF: (invoiceId: number, invoiceNumber: string) => Promise<DownloadResult>;
  downloadContractPDF: (contractId: number, templateName: string) => Promise<DownloadResult>;
  downloadQuotePDF: (quoteId: number, quoteNumber: string) => Promise<DownloadResult>;
  shareLocalDocument: (localUri: string) => Promise<boolean>;
  canShare: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export function useDocumentDownload(): UseDocumentDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [canShare, setCanShare] = useState(true);

  // Check sharing availability on mount
  useState(() => {
    isSharingAvailable().then(setCanShare);
  });

  // Handle download progress
  const handleProgress = useCallback((progress: number) => {
    setDownloadProgress(progress);
  }, []);

  // Download invoice PDF
  const downloadInvoicePDF = useCallback(
    async (invoiceId: number, invoiceNumber: string): Promise<DownloadResult> => {
      setIsDownloading(true);
      setDownloadProgress(0);

      try {
        const result = await downloadInvoice(invoiceId, invoiceNumber, {
          onProgress: handleProgress,
          showShareSheet: true,
        });

        if (!result.success) {
          Alert.alert('Download Failed', result.error || 'Unable to download invoice.');
        }

        return result;
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    },
    [handleProgress]
  );

  // Download contract PDF
  const downloadContractPDF = useCallback(
    async (contractId: number, templateName: string): Promise<DownloadResult> => {
      setIsDownloading(true);
      setDownloadProgress(0);

      try {
        const result = await downloadContract(contractId, templateName, {
          onProgress: handleProgress,
          showShareSheet: true,
        });

        if (!result.success) {
          Alert.alert('Download Failed', result.error || 'Unable to download contract.');
        }

        return result;
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    },
    [handleProgress]
  );

  // Download quote PDF
  const downloadQuotePDF = useCallback(
    async (quoteId: number, quoteNumber: string): Promise<DownloadResult> => {
      setIsDownloading(true);
      setDownloadProgress(0);

      try {
        const result = await downloadQuote(quoteId, quoteNumber, {
          onProgress: handleProgress,
          showShareSheet: true,
        });

        if (!result.success) {
          Alert.alert('Download Failed', result.error || 'Unable to download quote.');
        }

        return result;
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    },
    [handleProgress]
  );

  // Share local document
  const shareLocalDocument = useCallback(async (localUri: string): Promise<boolean> => {
    return shareDocument(localUri);
  }, []);

  return {
    isDownloading,
    downloadProgress,
    downloadInvoicePDF,
    downloadContractPDF,
    downloadQuotePDF,
    shareLocalDocument,
    canShare,
  };
}

export default useDocumentDownload;
