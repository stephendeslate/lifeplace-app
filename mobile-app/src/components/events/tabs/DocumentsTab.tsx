/**
 * DocumentsTab Component
 *
 * Displays event documents that the client can download.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  File,
  FilePdf,
  FileImage,
  FileDoc,
  FileXls,
  DownloadSimple,
  Eye,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventDocuments } from '@/hooks/useEvents';
import { Skeleton, EmptyState, Card } from '@/components/common';
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

export function DocumentsTab({ eventId }: DocumentsTabProps) {
  const { data: documents, isLoading, refetch, isRefetching } = useEventDocuments(eventId);

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
      <EmptyState
        icon="document"
        title="No Documents"
        description="Documents shared for this event will appear here."
      />
    );
  }

  const renderItem = ({ item: doc }: { item: EventFile }) => {
    const extension = doc.file_type.toLowerCase();
    const IconComponent = fileTypeIcons[extension] || File;
    const iconColor = fileTypeColors[extension] || theme.colors.neutral[500];

    return (
      <Card style={styles.documentItem} onPress={() => handleDownload(doc)}>
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

          {/* Download button */}
          <Pressable
            style={styles.downloadButton}
            onPress={() => handleDownload(doc)}
          >
            <DownloadSimple size={20} color={theme.colors.primary[500]} />
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  listContainer: {
    padding: theme.spacing.md,
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
  downloadButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
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
