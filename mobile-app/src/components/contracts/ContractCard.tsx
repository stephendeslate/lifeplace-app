/**
 * ContractCard Component
 *
 * Card displaying contract summary with signature progress.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  FileText,
  CaretRight,
  Clock,
  Warning,
  CheckCircle,
  Users,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { ContractStatusBadge } from './ContractStatusBadge';
import { formatCardDate, getDaysUntil } from '@/utils/formatting';
import type { Contract } from '@/apis/contracts.api';

interface ContractCardProps {
  contract: Contract;
  onPress: () => void;
  testID?: string;
}

export const ContractCard = React.memo(function ContractCard({ contract, onPress, testID }: ContractCardProps) {
  const daysUntilExpiry = contract.expires_at ? getDaysUntil(contract.expires_at) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isSigned = contract.status === 'SIGNED';
  const canSign = contract.can_client_sign && contract.status === 'SENT';

  const { signed_count, total_required, percentage } = contract.signature_progress;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.iconContainer}>
        <FileText size={24} color={theme.colors.secondary.forest} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.templateName}>{contract.template.name}</Text>
            <ContractStatusBadge status={contract.status} size="small" />
          </View>
          <Text style={styles.eventName} numberOfLines={1}>
            {contract.event.title}
          </Text>
        </View>

        {/* Signature Progress */}
        {!isSigned && total_required > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Users size={14} color={theme.colors.neutral.gray} />
              <Text style={styles.progressText}>
                {signed_count} of {total_required} signature
                {total_required !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {/* Status indicators */}
          {isSigned ? (
            <View style={styles.statusRow}>
              <CheckCircle size={14} color={theme.colors.semantic.success} weight="fill" />
              <Text style={styles.signedText}>
                Signed {contract.signed_at ? formatCardDate(contract.signed_at) : ''}
              </Text>
            </View>
          ) : isExpired ? (
            <View style={styles.statusRow}>
              <Warning size={14} color={theme.colors.semantic.error} weight="fill" />
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          ) : isExpiringSoon ? (
            <View style={styles.statusRow}>
              <Warning size={14} color={theme.colors.semantic.warning} weight="fill" />
              <Text style={styles.expiringText}>
                Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : contract.expires_at ? (
            <View style={styles.statusRow}>
              <Clock size={14} color={theme.colors.neutral.gray} />
              <Text style={styles.dateText}>
                Expires {formatCardDate(contract.expires_at)}
              </Text>
            </View>
          ) : contract.sent_at ? (
            <View style={styles.statusRow}>
              <Clock size={14} color={theme.colors.neutral.gray} />
              <Text style={styles.dateText}>
                Sent {formatCardDate(contract.sent_at)}
              </Text>
            </View>
          ) : null}

          {canSign && (
            <View style={styles.signBadge}>
              <Text style={styles.signBadgeText}>Sign Now</Text>
            </View>
          )}
        </View>
      </View>

      <CaretRight size={20} color={theme.colors.neutral.gray} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.secondary.forestSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  templateName: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
  eventName: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  progressSection: {
    marginBottom: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  progressText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.neutral.warmGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary.forest,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  signedText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.success,
  },
  expiredText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.error,
    fontWeight: '600',
  },
  expiringText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.warning,
    fontWeight: '600',
  },
  signBadge: {
    backgroundColor: theme.colors.accent.woodSubtle,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  signBadgeText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.accent.wood,
    fontWeight: '600',
  },
});

export default ContractCard;
