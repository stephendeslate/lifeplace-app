/**
 * Privacy Dashboard Screen
 *
 * Central hub for privacy controls and DPA compliance features.
 * Phase 10: Profile & Settings
 * Reference: CONSENT_MANAGEMENT_UI.md Section 4.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  EnvelopeSimple,
  ChatText,
  BellRinging,
  ChartBar,
  CaretRight,
  Eye,
  DownloadSimple,
  Trash,
  FileText,
  ClockCounterClockwise,
} from 'phosphor-react-native';

import { useConsents, useConsentManagement } from '@/hooks/usePrivacy';
import { ConsentToggle, WithdrawalDialog } from '@/components/privacy';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { ConsentType, ConsentStatus } from '@/types/privacy.types';

// External URLs
const PRIVACY_POLICY_URL = 'https://lifeplace.com/privacy';
const TERMS_URL = 'https://lifeplace.com/terms';

// Consent type display configuration
const CONSENT_CONFIG: Record<
  ConsentType,
  { label: string; description: string; icon: typeof EnvelopeSimple }
> = {
  MARKETING_EMAIL: {
    label: 'Marketing Email',
    description: 'Receive promotional emails and newsletters',
    icon: EnvelopeSimple,
  },
  MARKETING_SMS: {
    label: 'Marketing SMS',
    description: 'Receive promotional text messages',
    icon: ChatText,
  },
  MARKETING_PUSH: {
    label: 'Marketing Push',
    description: 'Receive promotional push notifications',
    icon: BellRinging,
  },
  ANALYTICS: {
    label: 'Usage Analytics',
    description: 'Help us improve by sharing usage data',
    icon: ChartBar,
  },
  THIRD_PARTY_SHARING: {
    label: 'Third-Party Sharing',
    description: 'Share data with our partners',
    icon: ChartBar,
  },
  SENSITIVE_DATA: {
    label: 'Sensitive Data Processing',
    description: 'Process sensitive personal information',
    icon: ChartBar,
  },
  PRIVACY_POLICY: {
    label: 'Privacy Policy',
    description: 'Acceptance of privacy policy',
    icon: FileText,
  },
  TERMS_OF_SERVICE: {
    label: 'Terms of Service',
    description: 'Acceptance of terms of service',
    icon: FileText,
  },
};

// Only show these consent types in the dashboard
const VISIBLE_CONSENT_TYPES: ConsentType[] = [
  'MARKETING_EMAIL',
  'MARKETING_SMS',
  'MARKETING_PUSH',
  'ANALYTICS',
];

export default function PrivacyDashboardScreen() {
  const router = useRouter();
  const { data: consentsData, isLoading, refetch } = useConsents();
  const { toggleConsent, isUpdating } = useConsentManagement();

  const [withdrawalDialogVisible, setWithdrawalDialogVisible] = useState(false);
  const [selectedConsentType, setSelectedConsentType] = useState<ConsentType | null>(null);

  // Handle withdrawal confirmation
  const handleWithdrawPress = (type: ConsentType) => {
    setSelectedConsentType(type);
    setWithdrawalDialogVisible(true);
  };

  const handleConfirmWithdraw = () => {
    if (selectedConsentType) {
      toggleConsent(selectedConsentType, true);
    }
    setWithdrawalDialogVisible(false);
    setSelectedConsentType(null);
  };

  const handleCancelWithdraw = () => {
    setWithdrawalDialogVisible(false);
    setSelectedConsentType(null);
  };

  // Get consent status for a specific type
  const getConsentStatus = (type: ConsentType): ConsentStatus | undefined => {
    return consentsData?.consents.find((c) => c.consent_type === type);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Description */}
      <Text style={styles.headerDescription}>
        Manage your privacy preferences and data rights under the Philippines
        Data Privacy Act.
      </Text>

      {/* Consents Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Consents</Text>
        <View style={styles.card}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent.wood} />
            </View>
          ) : (
            VISIBLE_CONSENT_TYPES.map((type, index) => {
              const config = CONSENT_CONFIG[type];
              const status = getConsentStatus(type);

              return (
                <ConsentToggle
                  key={type}
                  type={type}
                  label={config.label}
                  description={config.description}
                  isGranted={status?.status === 'granted'}
                  lastUpdated={status?.granted_at || null}
                  canWithdraw={status?.can_withdraw ?? true}
                  isLoading={isUpdating}
                  onToggle={toggleConsent}
                  onWithdrawPress={handleWithdrawPress}
                />
              );
            })
          )}
        </View>

        {/* Consent History Link */}
        <Pressable
          style={styles.linkButton}
          onPress={() => router.push('/settings/consent-history' as Href)}
        >
          <ClockCounterClockwise size={20} color={colors.accent.wood} />
          <Text style={styles.linkButtonText}>View Consent History</Text>
          <CaretRight size={16} color={colors.neutral.gray} />
        </Pressable>
      </View>

      {/* Your Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Data</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.actionItem}
            onPress={() => router.push('/settings/my-data' as Href)}
          >
            <View style={styles.actionIconContainer}>
              <Eye size={22} color={colors.primary.black} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>View My Data</Text>
              <Text style={styles.actionDescription}>
                See all personal data we have about you
              </Text>
            </View>
            <CaretRight size={18} color={colors.neutral.gray} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.actionItem}
            onPress={() => router.push('/settings/download-data' as Href)}
          >
            <View style={styles.actionIconContainer}>
              <DownloadSimple size={22} color={colors.primary.black} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Download My Data</Text>
              <Text style={styles.actionDescription}>
                Get a copy of your data (JSON or CSV)
              </Text>
            </View>
            <CaretRight size={18} color={colors.neutral.gray} />
          </Pressable>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.actionItem}
            onPress={() => router.push('/settings/delete-account' as Href)}
          >
            <View style={[styles.actionIconContainer, styles.dangerIconContainer]}>
              <Trash size={22} color={colors.semantic.error} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionLabel, styles.dangerText]}>
                Delete My Account
              </Text>
              <Text style={styles.actionDescription}>
                Permanently remove your account and data
              </Text>
            </View>
            <CaretRight size={18} color={colors.neutral.gray} />
          </Pressable>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.actionItem}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <View style={styles.actionIconContainer}>
              <FileText size={22} color={colors.primary.black} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Privacy Policy</Text>
              <Text style={styles.actionDescription}>
                How we collect and use your data
              </Text>
            </View>
            <CaretRight size={18} color={colors.neutral.gray} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.actionItem}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            <View style={styles.actionIconContainer}>
              <FileText size={22} color={colors.primary.black} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Terms of Service</Text>
              <Text style={styles.actionDescription}>
                Terms and conditions of use
              </Text>
            </View>
            <CaretRight size={18} color={colors.neutral.gray} />
          </Pressable>
        </View>
      </View>

      {/* DPA Notice */}
      <View style={styles.dpaNotice}>
        <Text style={styles.dpaNoticeText}>
          Your rights are protected under the Philippines Data Privacy Act of
          2012 (R.A. 10173).
        </Text>
      </View>

      {/* Withdrawal Dialog */}
      <WithdrawalDialog
        visible={withdrawalDialogVisible}
        consentType={selectedConsentType || 'MARKETING_EMAIL'}
        consentLabel={
          selectedConsentType ? CONSENT_CONFIG[selectedConsentType].label : ''
        }
        onConfirm={handleConfirmWithdraw}
        onCancel={handleCancelWithdraw}
        isLoading={isUpdating}
      />
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
  headerDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.lg,
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
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  linkButtonText: {
    ...typeScale.bodyMedium,
    color: colors.accent.wood,
    flex: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dangerIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    fontWeight: '500',
  },
  dangerText: {
    color: colors.semantic.error,
  },
  actionDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.sand,
    marginHorizontal: spacing.md,
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
