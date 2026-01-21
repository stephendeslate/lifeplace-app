/**
 * My Data Screen
 *
 * View all personal data (Right to Access).
 * Phase 10: Profile & Settings
 * Reference: DATA_SUBJECT_RIGHTS_API.md Section 1
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { format } from 'date-fns';
import {
  User,
  Envelope,
  Phone,
  Buildings,
  CalendarBlank,
  Clock,
  CalendarCheck,
  CreditCard,
  FileText,
  Bell,
  DeviceMobile,
  ShieldCheck,
  ArrowsOutSimple,
} from 'phosphor-react-native';

import { useDataAccess } from '@/hooks/usePrivacy';
import { DataCategoryCard, DataItemRow } from '@/components/privacy';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

export default function MyDataScreen() {
  const { data, isLoading, error, refetch, isFetching } = useDataAccess();

  // Fetch data on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    try {
      const num = parseFloat(amount);
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: currency,
      }).format(num);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  if (isLoading || isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.wood} />
        <Text style={styles.loadingText}>Loading your data...</Text>
        <Text style={styles.loadingSubtext}>
          This may take a moment
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Data</Text>
        <Text style={styles.errorText}>
          There was a problem loading your personal data. Please try again.
        </Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const { personal_data, processing_purposes, data_retention, third_party_sharing } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Generated At Notice */}
      <View style={styles.generatedNotice}>
        <Clock size={16} color={colors.neutral.darkGray} />
        <Text style={styles.generatedText}>
          Generated on {formatDateTime(data.generated_at)}
        </Text>
      </View>

      {/* Account Information */}
      <DataCategoryCard
        title="Account Information"
        icon={<User size={20} color={colors.accent.wood} />}
        defaultExpanded
      >
        <DataItemRow label="Email" value={personal_data.account.email} />
        <DataItemRow label="First Name" value={personal_data.account.first_name || 'Not provided'} />
        <DataItemRow label="Last Name" value={personal_data.account.last_name || 'Not provided'} />
        <DataItemRow label="Joined" value={formatDate(personal_data.account.date_joined)} />
        <DataItemRow label="Last Login" value={formatDateTime(personal_data.account.last_login)} />
      </DataCategoryCard>

      {/* Profile Information */}
      {personal_data.profile && (
        <DataCategoryCard
          title="Profile"
          icon={<Buildings size={20} color={colors.accent.wood} />}
        >
          <DataItemRow label="Phone" value={personal_data.profile.phone || 'Not provided'} />
          <DataItemRow label="Company" value={personal_data.profile.company || 'Not provided'} />
          <DataItemRow label="Timezone" value={personal_data.profile.timezone || 'Not set'} />
        </DataCategoryCard>
      )}

      {/* Events */}
      {personal_data.events && personal_data.events.length > 0 && (
        <DataCategoryCard
          title="Events"
          icon={<CalendarCheck size={20} color={colors.accent.wood} />}
          count={personal_data.events.length}
        >
          {personal_data.events.map((event, index) => (
            <View key={event.id} style={[styles.eventItem, index > 0 && styles.eventItemBorder]}>
              <Text style={styles.eventName}>{event.name}</Text>
              <View style={styles.eventDetails}>
                <Text style={styles.eventDetailText}>Status: {event.status}</Text>
                <Text style={styles.eventDetailText}>Date: {formatDate(event.start_date)}</Text>
                {event.venue && <Text style={styles.eventDetailText}>Venue: {event.venue}</Text>}
              </View>
            </View>
          ))}
        </DataCategoryCard>
      )}

      {/* Payments */}
      {personal_data.payments && personal_data.payments.length > 0 && (
        <DataCategoryCard
          title="Payments"
          icon={<CreditCard size={20} color={colors.accent.wood} />}
          count={personal_data.payments.length}
        >
          {personal_data.payments.map((payment, index) => (
            <View key={payment.id} style={[styles.paymentItem, index > 0 && styles.paymentItemBorder]}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(payment.amount, payment.currency)}
                </Text>
                <Text style={[
                  styles.paymentStatus,
                  payment.status === 'COMPLETED' && styles.statusCompleted,
                  payment.status === 'PENDING' && styles.statusPending,
                ]}>
                  {payment.status}
                </Text>
              </View>
              {payment.paid_at && (
                <Text style={styles.paymentDate}>Paid: {formatDateTime(payment.paid_at)}</Text>
              )}
            </View>
          ))}
        </DataCategoryCard>
      )}

      {/* Contracts */}
      {personal_data.contracts && personal_data.contracts.length > 0 && (
        <DataCategoryCard
          title="Contracts"
          icon={<FileText size={20} color={colors.accent.wood} />}
          count={personal_data.contracts.length}
        >
          {personal_data.contracts.map((contract, index) => (
            <View key={contract.id} style={[styles.contractItem, index > 0 && styles.contractItemBorder]}>
              <Text style={styles.contractLabel}>Contract #{contract.id}</Text>
              <Text style={styles.contractDetail}>Status: {contract.status}</Text>
              {contract.signed_at && (
                <Text style={styles.contractDetail}>Signed: {formatDateTime(contract.signed_at)}</Text>
              )}
            </View>
          ))}
        </DataCategoryCard>
      )}

      {/* Notification Preferences */}
      {personal_data.notification_preferences && (
        <DataCategoryCard
          title="Notification Preferences"
          icon={<Bell size={20} color={colors.accent.wood} />}
        >
          {Object.entries(personal_data.notification_preferences).map(([key, value]) => (
            <DataItemRow
              key={key}
              label={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              value={value ? 'Enabled' : 'Disabled'}
            />
          ))}
        </DataCategoryCard>
      )}

      {/* Devices */}
      {personal_data.devices && personal_data.devices.length > 0 && (
        <DataCategoryCard
          title="Registered Devices"
          icon={<DeviceMobile size={20} color={colors.accent.wood} />}
          count={personal_data.devices.length}
        >
          {personal_data.devices.map((device, index) => (
            <View key={index} style={[styles.deviceItem, index > 0 && styles.deviceItemBorder]}>
              <Text style={styles.deviceName}>{device.device_name || 'Unknown Device'}</Text>
              <Text style={styles.deviceDetail}>Type: {device.device_type}</Text>
              <Text style={styles.deviceDetail}>Registered: {formatDate(device.registered_at)}</Text>
              <Text style={styles.deviceDetail}>Last Used: {formatDateTime(device.last_used)}</Text>
            </View>
          ))}
        </DataCategoryCard>
      )}

      {/* Processing Purposes */}
      {processing_purposes && Object.keys(processing_purposes).length > 0 && (
        <DataCategoryCard
          title="Why We Process Your Data"
          icon={<ShieldCheck size={20} color={colors.accent.wood} />}
        >
          {Object.entries(processing_purposes).map(([category, purpose]) => (
            <View key={category} style={styles.purposeItem}>
              <Text style={styles.purposeCategory}>
                {category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
              <Text style={styles.purposeText}>{purpose as string}</Text>
            </View>
          ))}
        </DataCategoryCard>
      )}

      {/* Data Retention */}
      {data_retention && Object.keys(data_retention).length > 0 && (
        <DataCategoryCard
          title="Data Retention"
          icon={<Clock size={20} color={colors.accent.wood} />}
        >
          {Object.entries(data_retention).map(([category, period]) => (
            <DataItemRow
              key={category}
              label={category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              value={period as string}
            />
          ))}
        </DataCategoryCard>
      )}

      {/* Third-Party Sharing */}
      {third_party_sharing && third_party_sharing.length > 0 && (
        <DataCategoryCard
          title="Third-Party Sharing"
          icon={<ArrowsOutSimple size={20} color={colors.accent.wood} />}
          count={third_party_sharing.length}
        >
          {third_party_sharing.map((sharing, index) => (
            <View key={index} style={[styles.sharingItem, index > 0 && styles.sharingItemBorder]}>
              <Text style={styles.sharingRecipient}>{sharing.recipient}</Text>
              <Text style={styles.sharingPurpose}>{sharing.purpose}</Text>
              <Text style={styles.sharingData}>
                Data shared: {sharing.data_shared.join(', ')}
              </Text>
            </View>
          ))}
        </DataCategoryCard>
      )}

      {/* DPA Notice */}
      <View style={styles.dpaNotice}>
        <Text style={styles.dpaNoticeText}>
          This data report is provided under your Right to Access as guaranteed by
          the Philippines Data Privacy Act of 2012 (R.A. 10173).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.cream,
  },
  loadingText: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    marginTop: spacing.md,
  },
  loadingSubtext: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral.cream,
  },
  errorTitle: {
    ...typeScale.titleMedium,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  retryButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.cream,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
  },
  generatedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  generatedText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  eventItem: {
    paddingVertical: spacing.sm,
  },
  eventItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.sand,
    marginTop: spacing.sm,
  },
  eventName: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
    marginBottom: spacing.xxs,
  },
  eventDetails: {
    gap: spacing.xxs,
  },
  eventDetailText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  paymentItem: {
    paddingVertical: spacing.sm,
  },
  paymentItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.sand,
    marginTop: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  paymentStatus: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  statusCompleted: {
    color: colors.semantic.success,
  },
  statusPending: {
    color: colors.semantic.warning,
  },
  paymentDate: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  contractItem: {
    paddingVertical: spacing.sm,
  },
  contractItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.sand,
    marginTop: spacing.sm,
  },
  contractLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
  },
  contractDetail: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  deviceItem: {
    paddingVertical: spacing.sm,
  },
  deviceItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.sand,
    marginTop: spacing.sm,
  },
  deviceName: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
  },
  deviceDetail: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  purposeItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  purposeCategory: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  purposeText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  sharingItem: {
    paddingVertical: spacing.sm,
  },
  sharingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.sand,
    marginTop: spacing.sm,
  },
  sharingRecipient: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
  },
  sharingPurpose: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  sharingData: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  dpaNotice: {
    backgroundColor: colors.tertiary.tealSubtle,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  dpaNoticeText: {
    ...typeScale.bodySmall,
    color: colors.tertiary.tealDark,
    textAlign: 'center',
  },
});
