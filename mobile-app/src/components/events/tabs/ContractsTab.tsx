/**
 * ContractsTab Component
 *
 * Displays event contracts with signing status, view details, and PDF viewing.
 * Matches client-portal EventContracts patterns.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Alert,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  CheckCircle,
  Warning,
  Eye,
  DownloadSimple,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventContracts } from '@/hooks/useContracts';
import { contractsApi } from '@/apis/contracts.api';
import { Skeleton, EmptyState, Card, Badge, Button, PDFViewerModal } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import { getContractStatusLabel } from '@/utils/eventHelpers';
import { useAuthStore } from '@/stores/authStore';
import api from '@/utils/api';
import type { Contract } from '@/apis/contracts.api';

export interface ContractsTabProps {
  eventId: number;
  onSignContract?: (contract: Contract) => void;
}

export function ContractsTab({ eventId, onSignContract }: ContractsTabProps) {
  const router = useRouter();
  const { data: contracts, isLoading, refetch, isRefetching } = useEventContracts(eventId);
  const { accessToken } = useAuthStore();

  // PDF viewer state
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Get auth headers for PDF download
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  };

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

  const handleViewDetails = (contract: Contract) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/contracts/${contract.id}`);
  };

  const handleViewPdf = (contract: Contract) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContract(contract);
    setPdfViewerVisible(true);
  };

  const handleClosePdf = () => {
    setPdfViewerVisible(false);
    setSelectedContract(null);
  };

  const handleDownloadPdf = async () => {
    if (!selectedContract) return;
    // For contracts, we'll open in external browser for download
    try {
      const pdfUrl = getContractPdfUrl(selectedContract.id);
      await Linking.openURL(pdfUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to download the contract.');
    }
  };

  const getContractPdfUrl = (contractId: number): string => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/contracts/client/contracts/${contractId}/download_pdf/`;
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
    const isSigned = contract.status === 'SIGNED';

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

        {/* Signed Banner */}
        {isSigned && (
          <View style={styles.signedBanner}>
            <CheckCircle size={18} color={theme.colors.success[600]} weight="fill" />
            <Text style={styles.signedText}>Contract fully signed</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* View Details / View PDF Row */}
          <View style={styles.viewActionsRow}>
            <Pressable
              onPress={() => handleViewDetails(contract)}
              style={[styles.viewButton, !isSigned && styles.viewButtonFull]}
            >
              <Eye size={18} color={theme.colors.primary[500]} />
              <Text style={styles.viewButtonText}>View Details</Text>
            </Pressable>
            {/* Only show View PDF for signed contracts */}
            {isSigned && (
              <Pressable
                onPress={() => handleViewPdf(contract)}
                style={styles.viewButton}
              >
                <DownloadSimple size={18} color={theme.colors.primary[500]} />
                <Text style={styles.viewButtonText}>View PDF</Text>
              </Pressable>
            )}
          </View>

          {/* Sign Button */}
          {contract.can_client_sign && (
            <Button
              onPress={() => handleSign(contract)}
              variant="primary"
              style={styles.signButton}
            >
              Sign Contract
            </Button>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
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

      {/* PDF Viewer Modal */}
      {selectedContract && (
        <PDFViewerModal
          visible={pdfViewerVisible}
          onClose={handleClosePdf}
          title={`Contract: ${selectedContract.template.name}`}
          pdfUrl={getContractPdfUrl(selectedContract.id)}
          onDownload={handleDownloadPdf}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  signedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  signedText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.success[700],
  },
  actionsContainer: {
    gap: theme.spacing.sm,
  },
  viewActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  viewButtonFull: {
    flex: undefined,
    width: '100%',
  },
  viewButtonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  signButton: {
    width: '100%',
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
