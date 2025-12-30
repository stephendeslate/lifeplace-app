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
import { theme } from '@/theme';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FILE_ICONS: Record<string, React.ComponentType<any>> = {
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
  pdf: theme.colors.error[500],
  doc: theme.colors.info[500],
  docx: theme.colors.info[500],
  xls: theme.colors.success[500],
  xlsx: theme.colors.success[500],
  jpg: theme.colors.warning[500],
  jpeg: theme.colors.warning[500],
  png: theme.colors.warning[500],
  gif: theme.colors.warning[500],
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
  const iconColor = FILE_COLORS[extension] || theme.colors.neutral[500];

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
        <IconComponent
          size={compact ? 20 : 24}
          color={iconColor}
          weight="bold"
        />
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
          <ActivityIndicator size="small" color={theme.colors.accent.wood} />
        ) : (
          <>
            {onPreview && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePreview}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Eye size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
            {onShare && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <ShareNetwork size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
            {onDownload && (
              <TouchableOpacity
                style={[styles.actionButton, styles.downloadButton]}
                onPress={handleDownload}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <DownloadSimple size={20} color={theme.colors.accent.wood} />
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  containerCompact: {
    padding: theme.spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[500],
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  separator: {
    marginHorizontal: theme.spacing.xs,
    color: theme.colors.neutral[400],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  downloadButton: {
    backgroundColor: theme.colors.accent.woodSubtle,
  },
});

export default DocumentCard;
