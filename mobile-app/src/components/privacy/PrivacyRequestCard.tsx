/**
 * Privacy Request Card Component
 *
 * Card for displaying privacy request status.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  HourglassSimple,
  XCircle,
  DownloadSimple,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows, colorScales } from '@/theme';
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from '@/types/privacy.types';

interface PrivacyRequestCardProps {
  request: PrivacyRequest;
}

const REQUEST_TYPE_LABELS: Record<PrivacyRequestType, string> = {
  ACCESS: 'Data Access',
  EXPORT: 'Data Export',
  DELETION: 'Account Deletion',
  CORRECTION: 'Data Correction',
  OBJECTION: 'Processing Objection',
};

const STATUS_CONFIG: Record<PrivacyRequestStatus, {
  label: string;
  icon: typeof Clock;
  color: string;
  bgColor: string;
}> = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: colors.semantic.warning,
    bgColor: colorScales.warning[50],
  },
  PROCESSING: {
    label: 'Processing',
    icon: HourglassSimple,
    color: colors.semantic.info,
    bgColor: colors.tertiary.tealSubtle,
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    color: colors.semantic.success,
    bgColor: colors.secondary.forestSubtle,
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    color: colors.semantic.error,
    bgColor: colorScales.error[50],
  },
};

export function PrivacyRequestCard({ request }: PrivacyRequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status];
  const StatusIcon = statusConfig.icon;

  const handleDownload = () => {
    if (request.download_url) {
      Linking.openURL(request.download_url);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.typeLabel}>
          {REQUEST_TYPE_LABELS[request.type]}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <StatusIcon size={14} color={statusConfig.color} weight="fill" />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Submitted:</Text>
          <Text style={styles.detailValue}>{formatDate(request.submitted_at)}</Text>
        </View>

        {request.completed_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Completed:</Text>
            <Text style={styles.detailValue}>{formatDate(request.completed_at)}</Text>
          </View>
        )}

        {request.estimated_completion && request.status !== 'COMPLETED' && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Est. completion:</Text>
            <Text style={styles.detailValue}>{formatDate(request.estimated_completion)}</Text>
          </View>
        )}
      </View>

      {request.download_url && request.status === 'COMPLETED' && (
        <Pressable style={styles.downloadButton} onPress={handleDownload}>
          <DownloadSimple size={18} color={colors.neutral.white} />
          <Text style={styles.downloadButtonText}>Download</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeLabel: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  statusText: {
    ...typeScale.labelSmall,
    fontWeight: '600',
  },
  details: {
    gap: spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  detailValue: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary.forest,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  downloadButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
  },
});
