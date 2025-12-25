/**
 * Quote Detail Screen
 *
 * Displays quote details with line items, pricing breakdown,
 * and accept/reject actions.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  FileText,
  CaretDown,
  CaretUp,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useQuote, useAcceptQuote, useRejectQuote } from '@/hooks/useQuotes';
import { QuoteStatusBadge, QuoteLineItem, RejectQuoteModal } from '@/components/quotes';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { Card } from '@/components/common/Card';
import { formatCurrency, formatCardDate, getDaysUntil } from '@/utils/formatting';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const quoteId = parseInt(id || '0', 10);
  const { data: quote, isLoading, refetch, isFetching } = useQuote(quoteId);
  const acceptMutation = useAcceptQuote();
  const rejectMutation = useRejectQuote();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Calculate days until expiry
  const daysUntilExpiry = quote?.valid_until ? getDaysUntil(quote.valid_until) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const canRespond = quote?.status === 'SENT' && !isExpired;

  // Handle accept quote
  const handleAccept = useCallback(() => {
    Alert.alert(
      'Accept Quote',
      'Are you sure you want to accept this quote? This will create an invoice and contract for your event.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            acceptMutation.mutate(quoteId, {
              onSuccess: () => {
                Alert.alert(
                  'Quote Accepted',
                  'Great! Your invoice and contract have been created. Check your Action Center for next steps.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              },
            });
          },
        },
      ]
    );
  }, [quoteId, acceptMutation, router]);

  // Handle reject quote
  const handleReject = useCallback(
    (reason: string) => {
      rejectMutation.mutate(
        { quoteId, reason },
        {
          onSuccess: () => {
            setShowRejectModal(false);
            Alert.alert('Quote Declined', 'The quote has been declined.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        }
      );
    },
    [quoteId, rejectMutation, router]
  );

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
        <View style={styles.content}>
          <Skeleton width="100%" height={200} borderRadius={16} />
          <Skeleton width="100%" height={300} borderRadius={16} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Warning size={64} color={theme.colors.neutral.gray} weight="light" />
        <Text style={styles.errorTitle}>Quote Not Found</Text>
        <Text style={styles.errorDescription}>
          This quote may have been removed or is no longer available.
        </Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

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
            <Text style={styles.headerTitle}>Quote #{quote.quote_number}</Text>
            <QuoteStatusBadge status={quote.status} size="small" />
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: canRespond ? 100 : insets.bottom + 20 },
          ]}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
        >
          {/* Event Info Card */}
          <Card style={styles.card}>
            <View style={styles.eventInfo}>
              <FileText size={24} color={theme.colors.accent.wood} />
              <View style={styles.eventDetails}>
                <Text style={styles.eventName}>{quote.event_details.name}</Text>
                <Text style={styles.eventLabel}>Event</Text>
              </View>
            </View>

            {/* Expiry Warning */}
            {isExpiringSoon && (
              <View style={styles.expiryWarning}>
                <Warning size={18} color={theme.colors.semantic.warning} weight="fill" />
                <Text style={styles.expiryWarningText}>
                  Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {isExpired && (
              <View style={[styles.expiryWarning, styles.expiryError]}>
                <XCircle size={18} color={theme.colors.semantic.error} weight="fill" />
                <Text style={[styles.expiryWarningText, styles.expiryErrorText]}>
                  This quote has expired
                </Text>
              </View>
            )}

            {quote.valid_until && !isExpired && (
              <View style={styles.validUntil}>
                <Clock size={16} color={theme.colors.neutral.gray} />
                <Text style={styles.validUntilText}>
                  Valid until {formatCardDate(quote.valid_until)}
                </Text>
              </View>
            )}
          </Card>

          {/* Line Items */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Quote Details</Text>
            {quote.line_items.map((item) => (
              <QuoteLineItem
                key={item.id}
                item={item}
                currency={quote.currency}
              />
            ))}

            {/* Totals */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(quote.total_amount, quote.currency)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Terms & Conditions */}
          {quote.terms_and_conditions && (
            <Card style={styles.card}>
              <TouchableOpacity
                style={styles.termsHeader}
                onPress={() => setShowTerms(!showTerms)}
              >
                <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                {showTerms ? (
                  <CaretUp size={20} color={theme.colors.neutral.gray} />
                ) : (
                  <CaretDown size={20} color={theme.colors.neutral.gray} />
                )}
              </TouchableOpacity>
              {showTerms && (
                <Text style={styles.termsContent}>{quote.terms_and_conditions}</Text>
              )}
            </Card>
          )}

          {/* Notes */}
          {quote.notes && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesContent}>{quote.notes}</Text>
            </Card>
          )}

          {/* Status Message for accepted/rejected */}
          {quote.status === 'ACCEPTED' && (
            <Card style={[styles.card, styles.successCard]}>
              <View style={styles.statusMessage}>
                <CheckCircle size={24} color={theme.colors.semantic.success} weight="fill" />
                <View style={styles.statusText}>
                  <Text style={styles.statusTitle}>Quote Accepted</Text>
                  <Text style={styles.statusDescription}>
                    Check your Action Center for your invoice and contract.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {quote.status === 'REJECTED' && (
            <Card style={[styles.card, styles.errorCard]}>
              <View style={styles.statusMessage}>
                <XCircle size={24} color={theme.colors.semantic.error} weight="fill" />
                <View style={styles.statusText}>
                  <Text style={styles.statusTitle}>Quote Declined</Text>
                  <Text style={styles.statusDescription}>
                    Contact us if you'd like to discuss a new quote.
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {canRespond && (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
            <Button
              variant="secondary"
              onPress={() => setShowRejectModal(true)}
              style={styles.actionButton}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              Decline
            </Button>
            <Button
              variant="cta"
              onPress={handleAccept}
              style={styles.actionButton}
              loading={acceptMutation.isPending}
              disabled={rejectMutation.isPending}
            >
              Accept Quote
            </Button>
          </View>
        )}

        {/* Reject Modal */}
        <RejectQuoteModal
          visible={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          isLoading={rejectMutation.isPending}
        />
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
    backgroundColor: theme.colors.neutral.cream,
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
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.md,
  },
  content: {
    padding: theme.layout.screenPaddingHorizontal,
  },
  card: {
    padding: theme.spacing.lg,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  eventDetails: {
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
  validUntil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  validUntilText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  sectionTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.sm,
  },
  totalsContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary.black,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  totalAmount: {
    ...theme.typeScale.headlineSmall,
    color: theme.colors.primary.black,
  },
  termsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termsContent: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.darkGray,
    lineHeight: 20,
  },
  notesContent: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.darkGray,
  },
  successCard: {
    backgroundColor: theme.colors.success[50],
  },
  errorCard: {
    backgroundColor: theme.colors.error[50],
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
  statusDescription: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.darkGray,
    marginTop: 2,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.neutral.white,
    ...theme.shadows.lg,
  },
  actionButton: {
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
