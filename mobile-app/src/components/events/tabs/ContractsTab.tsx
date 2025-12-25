/**
 * ContractsTab Component
 *
 * Displays event contracts with signing status.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  PenNib,
  CheckCircle,
  Clock,
  Warning,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventContracts } from '@/hooks/useContracts';
import { Skeleton, EmptyState, Card, Badge, Button } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import { getContractStatusLabel, getContractStatusColor } from '@/utils/eventHelpers';
import type { Contract } from '@/apis/contracts.api';

export interface ContractsTabProps {
  eventId: number;
  onSignContract?: (contract: Contract) => void;
}

export function ContractsTab({ eventId, onSignContract }: ContractsTabProps) {
  const { data: contracts, isLoading, refetch, isRefetching } = useEventContracts(eventId);

  const handleSign = (contract: Contract) => {
    if (!contract.can_client_sign) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (onSignContract) {
      onSignContract(contract);
    } else {
      Alert.alert(
        'Sign Contract',
        'Contract signing will be available in a future update.',
        [{ text: 'OK' }]
      );
    }
  };

  const getStatusBadgeVariant = (status: Contract['status']) => {
    switch (status) {
      case 'SIGNED':
        return 'success';
      case 'PARTIALLY_SIGNED':
        return 'warning';
      case 'SENT':
        return 'primary';
      case 'EXPIRED':
      case 'VOID':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="40%" height={14} />
            <Skeleton variant="rounded" width="100%" height={40} />
          </View>
        ))}
      </View>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <EmptyState
        icon="document"
        title="No Contracts"
        description="Contracts for this event will appear here when available."
      />
    );
  }

  const renderItem = ({ item: contract }: { item: Contract }) => {
    const progress = contract.signature_progress;
    const progressPercent = progress?.percentage || 0;

    return (
      <Card style={styles.contractCard}>
        {/* Header */}
        <View style={styles.contractHeader}>
          <View style={styles.iconContainer}>
            <FileText size={24} color={theme.colors.primary[500]} weight="bold" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.contractTitle}>{contract.template.name}</Text>
            <Text style={styles.eventTitle}>{contract.event.title}</Text>
          </View>
          <Badge
            label={getContractStatusLabel(contract.status)}
            variant={getStatusBadgeVariant(contract.status)}
            size="small"
          />
        </View>

        {/* Signature Progress */}
        {progress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Signature Progress</Text>
              <Text style={styles.progressValue}>
                {progress.signed_count} of {progress.total_required}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor:
                      progressPercent === 100
                        ? theme.colors.success[500]
                        : theme.colors.primary[500],
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Expiry warning */}
        {contract.expires_at && contract.status !== 'SIGNED' && (
          <View style={styles.expiryWarning}>
            <Warning size={14} color={theme.colors.warning[600]} />
            <Text style={styles.expiryText}>
              Expires: {formatCardDate(contract.expires_at)}
            </Text>
          </View>
        )}

        {/* Actions */}
        {contract.can_client_sign && (
          <Button
            onPress={() => handleSign(contract)}
            variant="primary"
            style={styles.signButton}
          >
            Sign Contract
          </Button>
        )}

        {contract.status === 'SIGNED' && (
          <View style={styles.signedBanner}>
            <CheckCircle size={18} color={theme.colors.success[600]} weight="fill" />
            <Text style={styles.signedText}>Contract fully signed</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <FlatList
      data={contracts}
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
  contractCard: {
    marginBottom: theme.spacing.md,
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  contractTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  eventTitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  progressSection: {
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  progressValue: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.warning[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  expiryText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning[700],
  },
  signButton: {
    marginTop: theme.spacing.sm,
  },
  signedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  signedText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.success[700],
  },
  skeletonItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
});

export default ContractsTab;
