/**
 * Rewards Screen
 *
 * Full rewards page showing VIP status, benefits, and progress.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretLeft, Star } from 'phosphor-react-native';
import { theme } from '@/theme';
import { useVIPStatus } from '@/hooks/useVIP';
import { VIPStatusCard, VIPBenefitCard } from '@/components/vip';
import { Skeleton } from '@/components/common/Skeleton';
import type { VIPBenefit } from '@/types/vip.types';

export default function RewardsScreen() {
  const router = useRouter();
  const { data: vipStatus, isLoading, isRefetching, refetch } = useVIPStatus();

  // Separate benefits by application mode
  const automaticBenefits: VIPBenefit[] = [];
  const redeemableBenefits: VIPBenefit[] = [];

  if (vipStatus?.benefits) {
    vipStatus.benefits.forEach((benefit) => {
      if (benefit.application_mode === 'AUTOMATIC') {
        automaticBenefits.push(benefit);
      } else {
        redeemableBenefits.push(benefit);
      }
    });
  }

  const hasBenefits = automaticBenefits.length > 0 || redeemableBenefits.length > 0;

  // Render loading skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.primary.black} />
          </TouchableOpacity>
          <Text style={styles.title}>LifePlace Rewards</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Skeleton width="100%" height={280} borderRadius={16} style={styles.cardSkeleton} />
          <Skeleton width={120} height={24} style={styles.sectionSkeleton} />
          <Skeleton width="100%" height={80} borderRadius={12} style={styles.benefitSkeleton} />
          <Skeleton width="100%" height={80} borderRadius={12} style={styles.benefitSkeleton} />
          <Skeleton width="100%" height={80} borderRadius={12} style={styles.benefitSkeleton} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={24} color={theme.colors.primary.black} />
        </TouchableOpacity>
        <Text style={styles.title}>LifePlace Rewards</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* VIP Status Card */}
        {vipStatus && (
          <VIPStatusCard status={vipStatus} style={styles.statusCard} />
        )}

        {/* Benefits Section */}
        {hasBenefits && (
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>Your Benefits</Text>

            {/* Automatic Benefits */}
            {automaticBenefits.length > 0 && (
              <View style={styles.benefitGroup}>
                <Text style={styles.benefitGroupTitle}>Automatic Benefits</Text>
                <Text style={styles.benefitGroupDescription}>
                  These benefits are automatically applied to your bookings.
                </Text>
                <View style={styles.benefitsList}>
                  {automaticBenefits.map((benefit) => (
                    <VIPBenefitCard key={benefit.id} benefit={benefit} />
                  ))}
                </View>
              </View>
            )}

            {/* Redeemable Benefits */}
            {redeemableBenefits.length > 0 && (
              <View style={styles.benefitGroup}>
                <Text style={styles.benefitGroupTitle}>Redeemable Benefits</Text>
                <Text style={styles.benefitGroupDescription}>
                  Redeem these benefits when booking your next event.
                </Text>
                <View style={styles.benefitsList}>
                  {redeemableBenefits.map((benefit) => (
                    <VIPBenefitCard key={benefit.id} benefit={benefit} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Empty Benefits State */}
        {!hasBenefits && vipStatus && (
          <View style={styles.emptyBenefits}>
            <View style={styles.emptyIconContainer}>
              <Star size={48} color={theme.colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>No Benefits Yet</Text>
            <Text style={styles.emptyDescription}>
              Complete bookings to unlock exclusive benefits and rewards.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  title: {
    ...theme.typeScale.headlineLarge,
    color: theme.colors.primary.black,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xxxl,
  },
  statusCard: {
    marginTop: theme.spacing.md,
  },
  benefitsSection: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typeScale.headlineMedium,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.md,
  },
  benefitGroup: {
    marginBottom: theme.spacing.xl,
  },
  benefitGroupTitle: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.xxs,
  },
  benefitGroupDescription: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.md,
  },
  benefitsList: {
    gap: theme.spacing.md,
  },
  emptyBenefits: {
    marginTop: theme.spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typeScale.headlineSmall,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    maxWidth: 280,
  },
  // Skeleton styles
  cardSkeleton: {
    marginTop: theme.spacing.md,
  },
  sectionSkeleton: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  benefitSkeleton: {
    marginBottom: theme.spacing.md,
  },
});
