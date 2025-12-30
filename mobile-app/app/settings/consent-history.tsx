/**
 * Consent History Screen
 *
 * Audit trail of all consent changes.
 * Phase 10: Profile & Settings
 * Reference: CONSENT_MANAGEMENT_UI.md Section 4.3
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { format, isThisMonth, isThisYear, parseISO } from 'date-fns';
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  DeviceMobile,
  Globe,
  Desktop,
} from 'phosphor-react-native';

import { useConsentHistory } from '@/hooks/usePrivacy';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { ConsentRecord, ConsentType, ConsentAction } from '@/types/privacy.types';

// Consent type labels
const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  MARKETING_EMAIL: 'Marketing Email',
  MARKETING_SMS: 'Marketing SMS',
  MARKETING_PUSH: 'Marketing Push',
  ANALYTICS: 'Usage Analytics',
  THIRD_PARTY_SHARING: 'Third-Party Sharing',
  SENSITIVE_DATA: 'Sensitive Data',
  PRIVACY_POLICY: 'Privacy Policy',
  TERMS_OF_SERVICE: 'Terms of Service',
};

// Action config
const ACTION_CONFIG: Record<ConsentAction, { label: string; color: string; icon: typeof CheckCircle }> = {
  GRANT: {
    label: 'Granted',
    color: colors.semantic.success,
    icon: CheckCircle,
  },
  WITHDRAW: {
    label: 'Withdrawn',
    color: colors.semantic.error,
    icon: XCircle,
  },
  UPDATE: {
    label: 'Updated',
    color: colors.semantic.info,
    icon: ArrowRight,
  },
};

// Device type icons
const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'ios':
    case 'android':
      return DeviceMobile;
    case 'web':
      return Globe;
    default:
      return Desktop;
  }
};

interface ConsentHistoryItemProps {
  record: ConsentRecord;
}

function ConsentHistoryItem({ record }: ConsentHistoryItemProps) {
  const actionConfig = ACTION_CONFIG[record.action];
  const ActionIcon = actionConfig.icon;
  const DeviceIcon = getDeviceIcon(record.device_type);

  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return {
        date: format(date, 'MMM d, yyyy'),
        time: format(date, 'h:mm a'),
      };
    } catch {
      return { date: 'Unknown', time: '' };
    }
  };

  const { date, time } = formatDateTime(record.created_at);

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{date}</Text>
        <Text style={styles.historyTime}>{time}</Text>
      </View>

      <View style={styles.historyContent}>
        <View style={styles.historyMain}>
          <Text style={styles.consentType}>
            {CONSENT_TYPE_LABELS[record.consent_type]}
          </Text>

          <View style={[styles.actionBadge, { backgroundColor: `${actionConfig.color}20` }]}>
            <ActionIcon size={14} color={actionConfig.color} weight="bold" />
            <Text style={[styles.actionText, { color: actionConfig.color }]}>
              {actionConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.historyMeta}>
          <DeviceIcon size={14} color={colors.neutral.gray} />
          <Text style={styles.metaText}>
            {record.source === 'REGISTRATION'
              ? 'Registration'
              : record.source === 'PRIVACY_DASHBOARD'
              ? 'Privacy Dashboard'
              : record.source === 'SETTINGS'
              ? 'Settings'
              : record.source}
          </Text>
          {record.device_type && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {record.device_type === 'ios'
                  ? 'iOS'
                  : record.device_type === 'android'
                  ? 'Android'
                  : record.device_type === 'web'
                  ? 'Web'
                  : record.device_type}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ConsentHistoryScreen() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useConsentHistory();

  const allRecords = data?.pages.flatMap((page) => page.results) ?? [];

  // Group records by month
  const groupedRecords = React.useMemo(() => {
    const groups: { title: string; data: ConsentRecord[] }[] = [];
    let currentMonth: string | null = null;

    allRecords.forEach((record) => {
      const date = parseISO(record.created_at);
      let monthKey: string;

      if (isThisMonth(date)) {
        monthKey = 'This Month';
      } else if (isThisYear(date)) {
        monthKey = format(date, 'MMMM');
      } else {
        monthKey = format(date, 'MMMM yyyy');
      }

      if (monthKey !== currentMonth) {
        currentMonth = monthKey;
        groups.push({ title: monthKey, data: [] });
      }

      groups[groups.length - 1].data.push(record);
    });

    return groups;
  }, [allRecords]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.wood} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (allRecords.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptyText}>
          Your consent changes will appear here as you manage your privacy
          preferences.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={groupedRecords}
      keyExtractor={(item) => item.title}
      renderItem={({ item: group }) => (
        <View style={styles.monthGroup}>
          <Text style={styles.monthTitle}>{group.title}</Text>
          {group.data.map((record) => (
            <ConsentHistoryItem key={record.id} record={record} />
          ))}
        </View>
      )}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.accent.wood} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  listContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.cream,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral.cream,
  },
  emptyTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
    textAlign: 'center',
  },
  monthGroup: {
    marginBottom: spacing.lg,
  },
  monthTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  historyItem: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  historyDate: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  historyTime: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  historyContent: {},
  historyMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  consentType: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    fontWeight: '500',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  actionText: {
    ...typeScale.labelSmall,
    fontWeight: '600',
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  metaDot: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
