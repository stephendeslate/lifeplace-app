/**
 * Contract Detail Screen
 *
 * Displays contract content with WebView, signature requirements,
 * and signing flow with digital signature capture.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  CaretLeft,
  FileText,
  Clock,
  Warning,
  CheckCircle,
  DownloadSimple,
  PenNib,
  X,
  Check,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useContract, useSignContract, canSignContract } from '@/hooks/useContracts';
import {
  ContractStatusBadge,
  SignatureItem,
  SignatureCanvas,
} from '@/components/contracts';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { formatCardDate, getDaysUntil } from '@/utils/formatting';

type ViewMode = 'preview' | 'signatures' | 'sign';

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const contractId = parseInt(id || '0', 10);
  const { data: contract, isLoading, refetch, isFetching } = useContract(contractId);
  const signMutation = useSignContract();

  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Derived values
  const canSign = contract ? canSignContract(contract) : false;
  const daysUntilExpiry = contract?.expires_at ? getDaysUntil(contract.expires_at) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isSigned = contract?.status === 'SIGNED';

  // Handle signature capture
  const handleSignatureCapture = useCallback((data: string) => {
    setSignatureData(data);
  }, []);

  // Handle sign contract
  const handleSign = useCallback(() => {
    if (!contract || !signatureData || !signerName.trim()) {
      Alert.alert('Error', 'Please provide your name and signature.');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions.');
      return;
    }

    signMutation.mutate(
      {
        contractId: contract.id,
        data: {
          signature_data: signatureData,
          signer_name: signerName.trim(),
          agreed_to_terms: agreedToTerms,
        },
      },
      {
        onSuccess: () => {
          setShowSignModal(false);
          setSignatureData(null);
          setSignerName('');
          setAgreedToTerms(false);
          Alert.alert(
            'Contract Signed',
            'Thank you! Your signature has been recorded.',
            [{ text: 'OK' }]
          );
        },
      }
    );
  }, [contract, signatureData, signerName, agreedToTerms, signMutation]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      Alert.alert(
        'Download Contract',
        'Contract PDF will be downloaded to your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: () => {
              Alert.alert('Success', 'Contract downloaded successfully.');
            },
          },
        ]
      );
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // Get client signature requirement
  const clientSignature = contract?.signatures.find((s) => s.is_client_signature);
  const needsClientSignature = clientSignature && !clientSignature.is_signed;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.primary.black} />
          </TouchableOpacity>
          <Skeleton width={150} height={24} />
        </View>
        <View style={styles.skeletonContent}>
          <Skeleton width="100%" height={100} borderRadius={16} />
          <Skeleton width="100%" height={400} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Warning size={64} color={theme.colors.neutral.gray} weight="light" />
        <Text style={styles.errorTitle}>Contract Not Found</Text>
        <Text style={styles.errorDescription}>
          This contract may have been removed or is no longer available.
        </Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  // Contract HTML for WebView
  const contractHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 16px;
          color: #1a1a1a;
          line-height: 1.6;
          font-size: 14px;
        }
        h1, h2, h3 { color: #1a1a1a; margin-top: 24px; }
        h1 { font-size: 24px; }
        h2 { font-size: 20px; }
        h3 { font-size: 16px; }
        p { margin: 12px 0; }
        ul, ol { margin: 12px 0; padding-left: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #e0e0e0; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .signature-block { margin-top: 32px; padding: 16px; border: 1px dashed #ccc; }
      </style>
    </head>
    <body>
      ${contract.content}
    </body>
    </html>
  `;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.primary.black} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{contract.template.name}</Text>
            <ContractStatusBadge status={contract.status} size="small" />
          </View>
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.downloadButton}
            disabled={isDownloading}
          >
            <DownloadSimple size={20} color={theme.colors.primary.black} />
          </TouchableOpacity>
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'preview' && styles.tabActive]}
            onPress={() => setViewMode('preview')}
          >
            <FileText
              size={18}
              color={viewMode === 'preview' ? theme.colors.primary.black : theme.colors.neutral.gray}
            />
            <Text style={[styles.tabLabel, viewMode === 'preview' && styles.tabLabelActive]}>
              Contract
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'signatures' && styles.tabActive]}
            onPress={() => setViewMode('signatures')}
          >
            <PenNib
              size={18}
              color={viewMode === 'signatures' ? theme.colors.primary.black : theme.colors.neutral.gray}
            />
            <Text style={[styles.tabLabel, viewMode === 'signatures' && styles.tabLabelActive]}>
              Signatures
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: canSign ? 100 : insets.bottom + 20 },
          ]}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
        >
          {viewMode === 'preview' ? (
            <>
              {/* Event Info */}
              <Card style={styles.card}>
                <View style={styles.eventRow}>
                  <FileText size={24} color={theme.colors.accent.wood} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{contract.event.title}</Text>
                    <Text style={styles.eventLabel}>Event</Text>
                  </View>
                </View>

                {/* Expiry Warning */}
                {isExpiringSoon && (
                  <View style={styles.expiryWarning}>
                    <Warning size={16} color={theme.colors.semantic.warning} weight="fill" />
                    <Text style={styles.expiryWarningText}>
                      Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {isExpired && (
                  <View style={[styles.expiryWarning, styles.expiryError]}>
                    <Warning size={16} color={theme.colors.semantic.error} weight="fill" />
                    <Text style={[styles.expiryWarningText, styles.expiryErrorText]}>
                      This contract has expired
                    </Text>
                  </View>
                )}

                {isSigned && (
                  <View style={[styles.expiryWarning, styles.signedBanner]}>
                    <CheckCircle size={16} color={theme.colors.semantic.success} weight="fill" />
                    <Text style={styles.signedBannerText}>
                      Signed on {contract.signed_at ? formatCardDate(contract.signed_at) : ''}
                    </Text>
                  </View>
                )}
              </Card>

              {/* Contract Content WebView */}
              <Card style={[styles.card, styles.contractCard]}>
                <WebView
                  source={{ html: contractHTML }}
                  style={styles.contractWebView}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                />
              </Card>
            </>
          ) : (
            <>
              {/* Signature Progress */}
              <Card style={styles.card}>
                <View style={styles.progressHeader}>
                  <Text style={styles.sectionTitle}>Signature Progress</Text>
                  <Text style={styles.progressCount}>
                    {contract.signature_progress.signed_count} of{' '}
                    {contract.signature_progress.total_required}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${contract.signature_progress.percentage}%` },
                    ]}
                  />
                </View>
              </Card>

              {/* Signature Requirements */}
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Required Signatures</Text>
                {contract.signatures.map((signature) => (
                  <SignatureItem
                    key={signature.id}
                    signature={signature}
                    isCurrentUser={signature.is_client_signature}
                  />
                ))}
              </Card>

              {/* Dates */}
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                <View style={styles.timelineItem}>
                  <Clock size={16} color={theme.colors.neutral.gray} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Sent</Text>
                    <Text style={styles.timelineValue}>
                      {contract.sent_at ? formatCardDate(contract.sent_at) : 'Not yet sent'}
                    </Text>
                  </View>
                </View>
                {contract.expires_at && (
                  <View style={styles.timelineItem}>
                    <Warning
                      size={16}
                      color={isExpired ? theme.colors.semantic.error : theme.colors.neutral.gray}
                    />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>
                        {isExpired ? 'Expired' : 'Expires'}
                      </Text>
                      <Text
                        style={[
                          styles.timelineValue,
                          isExpired && styles.timelineValueError,
                        ]}
                      >
                        {formatCardDate(contract.expires_at)}
                      </Text>
                    </View>
                  </View>
                )}
                {contract.signed_at && (
                  <View style={styles.timelineItem}>
                    <CheckCircle size={16} color={theme.colors.semantic.success} weight="fill" />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Signed</Text>
                      <Text style={[styles.timelineValue, styles.timelineValueSuccess]}>
                        {formatCardDate(contract.signed_at)}
                      </Text>
                    </View>
                  </View>
                )}
              </Card>
            </>
          )}
        </ScrollView>

        {/* Sign Button */}
        {canSign && needsClientSignature && (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
            <Button
              variant="cta"
              onPress={() => setShowSignModal(true)}
              style={styles.signButton}
            >
              Sign Contract
            </Button>
          </View>
        )}

        {/* Sign Modal */}
        <Modal
          visible={showSignModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSignModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top + theme.spacing.md }]}>
              <TouchableOpacity onPress={() => setShowSignModal(false)}>
                <X size={24} color={theme.colors.primary.black} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sign Contract</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalDescription}>
                Please review the contract carefully before signing. Your signature
                indicates your agreement to the terms and conditions.
              </Text>

              {/* Signer Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Legal Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={signerName}
                  onChangeText={setSignerName}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.colors.neutral.gray}
                  autoCapitalize="words"
                />
              </View>

              {/* Signature Canvas */}
              <SignatureCanvas
                onSignatureCapture={handleSignatureCapture}
                onClear={() => setSignatureData(null)}
                height={180}
              />

              {/* Terms Agreement */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Check size={14} color={theme.colors.neutral.white} />}
                </View>
                <Text style={styles.termsText}>
                  I have read and agree to the terms and conditions of this contract.
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + theme.spacing.md }]}>
              <Button
                variant="secondary"
                onPress={() => setShowSignModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                variant="cta"
                onPress={handleSign}
                loading={signMutation.isPending}
                disabled={!signerName.trim() || !signatureData || !agreedToTerms}
                style={styles.modalButton}
              >
                Submit Signature
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.black,
  },
  tabLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  tabLabelActive: {
    color: theme.colors.neutral.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  skeletonContent: {
    padding: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  eventLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.warning[50],
    borderRadius: theme.borderRadius.sm,
  },
  expiryWarningText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.semantic.warning,
  },
  expiryError: {
    backgroundColor: theme.colors.error[50],
  },
  expiryErrorText: {
    color: theme.colors.semantic.error,
  },
  signedBanner: {
    backgroundColor: theme.colors.success[50],
  },
  signedBannerText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.semantic.success,
  },
  contractCard: {
    padding: 0,
    overflow: 'hidden',
  },
  contractWebView: {
    height: 450,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCount: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.secondary.forest,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.neutral.warmGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary.forest,
    borderRadius: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.neutral.gray,
  },
  timelineValue: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    fontWeight: '500',
  },
  timelineValueError: {
    color: theme.colors.semantic.error,
  },
  timelineValueSuccess: {
    color: theme.colors.semantic.success,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.neutral.white,
    ...theme.shadows.lg,
  },
  signButton: {
    width: '100%',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
    backgroundColor: theme.colors.neutral.white,
  },
  modalTitle: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  modalDescription: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.darkGray,
    lineHeight: 22,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  inputLabel: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    fontWeight: '500',
  },
  textInput: {
    height: 48,
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    ...theme.typeScale.bodyMedium,
    color: theme.colors.primary.black,
    borderWidth: 1,
    borderColor: theme.colors.neutral.warmGray,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.secondary.forest,
    borderColor: theme.colors.secondary.forest,
  },
  termsText: {
    flex: 1,
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.darkGray,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
    backgroundColor: theme.colors.neutral.white,
  },
  modalButton: {
    flex: 1,
  },
  errorTitle: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  errorDescription: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
