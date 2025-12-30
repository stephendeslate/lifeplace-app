/**
 * Download Data Screen
 *
 * Request data export (Right to Portability).
 * Phase 10: Profile & Settings
 * Reference: DATA_SUBJECT_RIGHTS_API.md Section 2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  DownloadSimple,
  FileText,
  CheckCircle,
  Clock,
  HourglassSimple,
} from 'phosphor-react-native';

import {
  useRequestDataExport,
  usePrivacyRequests,
} from '@/hooks/usePrivacy';
import { PrivacyRequestCard } from '@/components/privacy';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

type ExportFormat = 'json' | 'csv';

const DATA_INCLUDED = [
  'Account information',
  'Booking history',
  'Event details',
  'Payment records',
  'Questionnaire responses',
  'Signed contracts',
  'Communication preferences',
];

export default function DownloadDataScreen() {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const requestExport = useRequestDataExport();
  const { data: requestsData, isLoading: isLoadingRequests } = usePrivacyRequests();

  // Filter export requests
  const exportRequests = requestsData?.requests.filter((r) => r.type === 'EXPORT') ?? [];

  const handleRequestExport = () => {
    requestExport.mutate(selectedFormat);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <DownloadSimple size={40} color={colors.accent.wood} weight="duotone" />
        </View>
        <Text style={styles.headerTitle}>Download Your Data</Text>
        <Text style={styles.headerDescription}>
          Request a copy of all your personal data stored in LifePlace in a
          machine-readable format.
        </Text>
      </View>

      {/* What's Included */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's Included</Text>
        <View style={styles.card}>
          {DATA_INCLUDED.map((item, index) => (
            <View
              key={item}
              style={[
                styles.includedItem,
                index < DATA_INCLUDED.length - 1 && styles.includedItemBorder,
              ]}
            >
              <CheckCircle size={18} color={colors.semantic.success} weight="fill" />
              <Text style={styles.includedText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Format Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Format</Text>
        <View style={styles.formatOptions}>
          <Pressable
            style={[
              styles.formatOption,
              selectedFormat === 'json' && styles.formatOptionSelected,
            ]}
            onPress={() => setSelectedFormat('json')}
          >
            <View style={styles.formatContent}>
              <FileText
                size={24}
                color={selectedFormat === 'json' ? colors.primary.black : colors.neutral.gray}
              />
              <Text
                style={[
                  styles.formatLabel,
                  selectedFormat === 'json' && styles.formatLabelSelected,
                ]}
              >
                JSON
              </Text>
              <Text style={styles.formatDescription}>Machine-readable</Text>
            </View>
            {selectedFormat === 'json' && (
              <View style={styles.formatCheck}>
                <CheckCircle size={20} color={colors.primary.black} weight="fill" />
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.formatOption,
              selectedFormat === 'csv' && styles.formatOptionSelected,
            ]}
            onPress={() => setSelectedFormat('csv')}
          >
            <View style={styles.formatContent}>
              <FileText
                size={24}
                color={selectedFormat === 'csv' ? colors.primary.black : colors.neutral.gray}
              />
              <Text
                style={[
                  styles.formatLabel,
                  selectedFormat === 'csv' && styles.formatLabelSelected,
                ]}
              >
                CSV
              </Text>
              <Text style={styles.formatDescription}>Spreadsheet compatible</Text>
            </View>
            {selectedFormat === 'csv' && (
              <View style={styles.formatCheck}>
                <CheckCircle size={20} color={colors.primary.black} weight="fill" />
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Processing Time Notice */}
      <View style={styles.processingNotice}>
        <Clock size={18} color={colors.neutral.darkGray} />
        <Text style={styles.processingText}>
          Your data will be ready within 15 days as required by Philippines law.
          You'll receive an email when it's ready to download.
        </Text>
      </View>

      {/* Request Button */}
      <Pressable
        style={[
          styles.requestButton,
          requestExport.isPending && styles.buttonDisabled,
        ]}
        onPress={handleRequestExport}
        disabled={requestExport.isPending}
      >
        {requestExport.isPending ? (
          <>
            <ActivityIndicator size="small" color={colors.neutral.white} />
            <Text style={styles.requestButtonText}>Requesting...</Text>
          </>
        ) : (
          <>
            <DownloadSimple size={20} color={colors.neutral.white} />
            <Text style={styles.requestButtonText}>Request Data Download</Text>
          </>
        )}
      </Pressable>

      {/* Success Message */}
      {requestExport.isSuccess && (
        <View style={styles.successMessage}>
          <CheckCircle size={20} color={colors.semantic.success} weight="fill" />
          <Text style={styles.successText}>
            Your export request has been submitted! You'll receive an email when
            your data is ready.
          </Text>
        </View>
      )}

      {/* Previous Requests */}
      {exportRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Requests</Text>
          {isLoadingRequests ? (
            <ActivityIndicator color={colors.accent.wood} style={styles.loader} />
          ) : (
            exportRequests.map((request) => (
              <PrivacyRequestCard key={request.id} request={request} />
            ))
          )}
        </View>
      )}

      {/* DPA Notice */}
      <View style={styles.dpaNotice}>
        <Text style={styles.dpaNoticeText}>
          This feature is provided under your Right to Data Portability as
          guaranteed by the Philippines Data Privacy Act of 2012 (R.A. 10173).
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
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.woodSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  headerDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  includedItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  includedText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formatOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  formatOptionSelected: {
    borderColor: colors.primary.black,
  },
  formatContent: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  formatLabel: {
    ...typeScale.titleSmall,
    color: colors.neutral.gray,
  },
  formatLabelSelected: {
    color: colors.primary.black,
  },
  formatDescription: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  formatCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  processingNotice: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  processingText: {
    flex: 1,
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.black,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  requestButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successMessage: {
    flexDirection: 'row',
    backgroundColor: colors.secondary.forestSubtle,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  successText: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.secondary.forestDark,
  },
  loader: {
    padding: spacing.xl,
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
