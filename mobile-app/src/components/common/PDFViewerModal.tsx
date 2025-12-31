/**
 * PDFViewerModal Component
 *
 * A reusable modal for viewing PDF documents in-app.
 * Supports authenticated PDF viewing by downloading to local cache first.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import {
  X,
  DownloadSimple,
  ShareNetwork,
  ArrowSquareOut,
} from 'phosphor-react-native';
import { theme } from '@/theme';

export interface PDFViewerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  pdfUrl: string;
  /** If true, uses Google Docs viewer (only for public URLs) */
  useGoogleDocsViewer?: boolean;
  /** Optional callback when download button is pressed */
  onDownload?: () => void;
  /** Show loading state */
  isLoading?: boolean;
  /** Function to get authentication headers for downloading */
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

export function PDFViewerModal({
  visible,
  onClose,
  title,
  pdfUrl,
  useGoogleDocsViewer = false,
  onDownload,
  isLoading = false,
  getAuthHeaders,
}: PDFViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(false);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Download PDF with authentication when modal opens
  useEffect(() => {
    if (!visible || !pdfUrl) {
      setLocalFileUri(null);
      setDownloadError(null);
      return;
    }

    // If using Google Docs viewer (for public URLs), skip local download
    if (useGoogleDocsViewer) {
      return;
    }

    const downloadPdf = async () => {
      setDownloadingPdf(true);
      setDownloadError(null);
      setWebViewError(false);

      try {
        const cacheDir = FileSystem.cacheDirectory + 'pdf_viewer/';
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        }

        const filename = `pdf_${Date.now()}.pdf`;
        const localUri = cacheDir + filename;

        const headers = getAuthHeaders ? await getAuthHeaders() : {};

        const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri, {
          headers,
        });

        if (downloadResult.status === 200) {
          setLocalFileUri(downloadResult.uri);
        } else {
          setDownloadError(`Failed to load PDF (Status: ${downloadResult.status})`);
        }
      } catch (error) {
        console.error('PDF download error:', error);
        setDownloadError('Failed to load PDF. Please try again.');
      } finally {
        setDownloadingPdf(false);
      }
    };

    downloadPdf();

    // Cleanup: delete cached file when modal closes
    return () => {
      if (localFileUri) {
        FileSystem.deleteAsync(localFileUri, { idempotent: true }).catch(() => {});
      }
    };
  }, [visible, pdfUrl, useGoogleDocsViewer, getAuthHeaders]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Clean up cached file
    if (localFileUri) {
      FileSystem.deleteAsync(localFileUri, { idempotent: true }).catch(() => {});
      setLocalFileUri(null);
    }
    onClose();
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        url: pdfUrl,
        title: title,
        message: `${title}: ${pdfUrl}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share this document.');
    }
  };

  const handleOpenExternal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Error', 'Unable to open this document externally.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the document.');
    }
  };

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onDownload) {
      onDownload();
    } else {
      // Fallback to opening externally for download
      handleOpenExternal();
    }
  };

  // Build the viewer URL
  const getViewerUrl = () => {
    // Use local file if downloaded (for authenticated PDFs)
    if (localFileUri) {
      return localFileUri;
    }
    // Use Google Docs viewer for public URLs if enabled
    if (useGoogleDocsViewer && pdfUrl) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
    }
    return pdfUrl;
  };

  const viewerUrl = getViewerUrl();
  const showLoadingState = isLoading || downloadingPdf;
  const showError = webViewError || !!downloadError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.neutral[600]} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleShare} style={styles.actionButton}>
              <ShareNetwork size={20} color={theme.colors.neutral[600]} />
            </Pressable>
            <Pressable onPress={handleOpenExternal} style={styles.actionButton}>
              <ArrowSquareOut size={20} color={theme.colors.neutral[600]} />
            </Pressable>
            <Pressable onPress={handleDownload} style={styles.actionButton}>
              <DownloadSimple size={20} color={theme.colors.primary[500]} />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {showLoadingState ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text style={styles.loadingText}>
                {downloadingPdf ? 'Downloading PDF...' : 'Loading document...'}
              </Text>
            </View>
          ) : showError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Unable to load document</Text>
              <Text style={styles.errorText}>
                {downloadError || "The document couldn't be displayed. Try opening it externally."}
              </Text>
              <Pressable onPress={handleOpenExternal} style={styles.retryButton}>
                <ArrowSquareOut size={18} color={theme.colors.surface} />
                <Text style={styles.retryButtonText}>Open Externally</Text>
              </Pressable>
            </View>
          ) : viewerUrl ? (
            <>
              {webViewLoading && (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
              )}
              <WebView
                source={{ uri: viewerUrl }}
                style={styles.webView}
                onLoadStart={() => setWebViewLoading(true)}
                onLoadEnd={() => setWebViewLoading(false)}
                onError={() => {
                  setWebViewLoading(false);
                  setWebViewError(true);
                }}
                onHttpError={() => {
                  setWebViewLoading(false);
                  setWebViewError(true);
                }}
                startInLoadingState={true}
                scalesPageToFit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
              />
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text style={styles.loadingText}>Preparing document...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    marginHorizontal: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
  },
  errorText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  retryButtonText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.surface,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  webView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default PDFViewerModal;
