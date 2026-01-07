/**
 * DocumentsTab Component
 *
 * Displays event documents with download, preview, and upload capabilities.
 * Matches client-portal document management patterns.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  Linking,
  Alert,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  File,
  FilePdf,
  FileImage,
  FileDoc,
  FileXls,
  DownloadSimple,
  Eye,
  Plus,
  X,
  Upload,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventDocuments } from '@/hooks/useEvents';
import { Skeleton, EmptyState, Card, PDFViewerModal, FileUploader } from '@/components/common';
import { formatCardDate, formatFileSize } from '@/utils/formatting';
import type { EventFile } from '@/types/events.types';

export interface DocumentsTabProps {
  eventId: number;
}

const fileTypeIcons: Record<string, React.ComponentType<any>> = {
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

const fileTypeColors: Record<string, string> = {
  pdf: theme.colors.error[500],
  doc: theme.colors.primary[500],
  docx: theme.colors.primary[500],
  xls: theme.colors.success[500],
  xlsx: theme.colors.success[500],
  jpg: theme.colors.warning[500],
  jpeg: theme.colors.warning[500],
  png: theme.colors.warning[500],
  gif: theme.colors.warning[500],
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
const PDF_EXTENSIONS = ['pdf'];

export function DocumentsTab({ eventId }: DocumentsTabProps) {
  const { data: documents, isLoading, refetch, isRefetching } = useEventDocuments(eventId);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);

  // PDF viewer state
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedPdfDoc, setSelectedPdfDoc] = useState<EventFile | null>(null);

  // Image viewer state
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageDoc, setSelectedImageDoc] = useState<EventFile | null>(null);

  const isImageFile = (fileType: string): boolean => {
    return IMAGE_EXTENSIONS.includes(fileType.toLowerCase());
  };

  const isPdfFile = (fileType: string): boolean => {
    return PDF_EXTENSIONS.includes(fileType.toLowerCase());
  };

  const handleDownload = async (doc: EventFile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const supported = await Linking.canOpenURL(doc.download_url);
      if (supported) {
        await Linking.openURL(doc.download_url);
      } else {
        Alert.alert('Error', 'Unable to open this document.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download the document. Please try again.');
    }
  };

  const handlePreview = (doc: EventFile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const extension = doc.file_type.toLowerCase();

    if (isPdfFile(extension)) {
      setSelectedPdfDoc(doc);
      setPdfViewerVisible(true);
    } else if (isImageFile(extension)) {
      setSelectedImageDoc(doc);
      setImageViewerVisible(true);
    } else {
      // For non-previewable files, just download
      handleDownload(doc);
    }
  };

  const handleClosePdfViewer = () => {
    setPdfViewerVisible(false);
    setSelectedPdfDoc(null);
  };

  const handleCloseImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageDoc(null);
  };

  const handlePdfDownload = async () => {
    if (selectedPdfDoc) {
      await handleDownload(selectedPdfDoc);
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    refetch();
    Alert.alert('Success', 'Document uploaded successfully.');
  };

  const canPreview = (fileType: string): boolean => {
    const ext = fileType.toLowerCase();
    return isImageFile(ext) || isPdfFile(ext);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="rounded" width={48} height={48} />
            <View style={styles.skeletonContent}>
              <Skeleton variant="text" width="70%" height={16} />
              <Skeleton variant="text" width="40%" height={12} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon="document"
          title="No Documents"
          description="Documents shared for this event will appear here. Upload documents using the button below."
        />
        {/* Upload FAB for empty state */}
        <Pressable
          style={styles.fabButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowUploadModal(true);
          }}
        >
          <Plus size={24} color={theme.colors.surface} weight="bold" />
        </Pressable>

        {/* Upload Modal */}
        <UploadModal
          visible={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          eventId={eventId}
          onUploadComplete={handleUploadComplete}
        />
      </View>
    );
  }

  const renderItem = ({ item: doc }: { item: EventFile }) => {
    const extension = doc.file_type.toLowerCase();
    const IconComponent = fileTypeIcons[extension] || File;
    const iconColor = fileTypeColors[extension] || theme.colors.neutral[500];
    const previewable = canPreview(extension);

    return (
      <Card style={styles.documentItem}>
        <View style={styles.documentContent}>
          {/* File icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
            <IconComponent size={24} color={iconColor} weight="bold" />
          </View>

          {/* File info */}
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {doc.name}
            </Text>
            <View style={styles.fileMeta}>
              <Text style={styles.fileSize}>
                {formatFileSize(doc.size)}
              </Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.fileDate}>
                {formatCardDate(doc.created_at)}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            {previewable && (
              <Pressable
                style={styles.actionButton}
                onPress={() => handlePreview(doc)}
              >
                <Eye size={20} color={theme.colors.primary[500]} />
              </Pressable>
            )}
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDownload(doc)}
            >
              <DownloadSimple size={20} color={theme.colors.primary[500]} />
            </Pressable>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      />

      {/* Upload FAB */}
      <Pressable
        style={styles.fabButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowUploadModal(true);
        }}
      >
        <Plus size={24} color={theme.colors.surface} weight="bold" />
      </Pressable>

      {/* PDF Viewer Modal */}
      {selectedPdfDoc && (
        <PDFViewerModal
          visible={pdfViewerVisible}
          onClose={handleClosePdfViewer}
          title={selectedPdfDoc.name}
          pdfUrl={selectedPdfDoc.download_url}
          onDownload={handlePdfDownload}
        />
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={imageViewerVisible}
        onClose={handleCloseImageViewer}
        imageUrl={selectedImageDoc?.download_url || ''}
        title={selectedImageDoc?.name || ''}
        onDownload={() => selectedImageDoc && handleDownload(selectedImageDoc)}
      />

      {/* Upload Modal */}
      <UploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        eventId={eventId}
        onUploadComplete={handleUploadComplete}
      />
    </View>
  );
}

// =============================================================================
// UPLOAD MODAL COMPONENT
// =============================================================================

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: number;
  onUploadComplete: () => void;
}

function UploadModal({ visible, onClose, eventId, onUploadComplete }: UploadModalProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={uploadStyles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={uploadStyles.header}>
          <Text style={uploadStyles.headerTitle}>Upload Document</Text>
          <Pressable onPress={handleClose} style={uploadStyles.closeButton}>
            <X size={24} color={theme.colors.neutral[600]} />
          </Pressable>
        </View>

        {/* Content */}
        <View style={uploadStyles.content}>
          <View style={uploadStyles.uploadSection}>
            <Upload size={48} color={theme.colors.primary[300]} weight="light" />
            <Text style={uploadStyles.uploadTitle}>Add Documents</Text>
            <Text style={uploadStyles.uploadDescription}>
              Upload photos, PDFs, or other documents for this event.
            </Text>
          </View>

          <FileUploader
            eventId={eventId}
            category="OTHER"
            description="Uploaded via mobile app"
            maxFiles={5}
            onUploadComplete={onUploadComplete}
            showUploadButton={true}
            allowCamera={true}
            allowGallery={true}
            allowDocuments={true}
            placeholder="Select files to upload"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const uploadStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  uploadSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  uploadTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
    marginTop: theme.spacing.md,
  },
  uploadDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});

// =============================================================================
// IMAGE VIEWER MODAL COMPONENT
// =============================================================================

interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  onDownload: () => void;
}

function ImageViewerModal({
  visible,
  onClose,
  imageUrl,
  title,
  onDownload,
}: ImageViewerModalProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDownload();
  };

  if (!imageUrl) return null;

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={imageStyles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={imageStyles.header}>
          <Pressable onPress={handleClose} style={imageStyles.closeButton}>
            <X size={24} color={theme.colors.neutral[600]} />
          </Pressable>
          <Text style={imageStyles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={handleDownload} style={imageStyles.downloadButton}>
            <DownloadSimple size={24} color={theme.colors.primary[500]} />
          </Pressable>
        </View>

        {/* Image */}
        <View style={imageStyles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: screenWidth,
              height: screenHeight - 120,
            }}
            resizeMode="contain"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const imageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[900],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[900],
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[800],
    borderRadius: theme.borderRadius.full,
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[100],
    marginHorizontal: theme.spacing.sm,
    textAlign: 'center',
  },
  downloadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[800],
    borderRadius: theme.borderRadius.full,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  listContainer: {
    padding: theme.spacing.md,
    paddingBottom: 80, // Space for FAB
  },
  documentItem: {
    marginBottom: theme.spacing.sm,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  separator: {
    marginHorizontal: theme.spacing.xs,
    color: theme.colors.neutral[400],
  },
  fileDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
  },
  fabButton: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, // Reduced for minimal aesthetic (FAB needs some elevation)
    shadowRadius: 8,
    elevation: 6,
  },
  skeletonItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  skeletonContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});

export default DocumentsTab;
