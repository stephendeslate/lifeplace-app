/**
 * QuotesTab Component
 *
 * Displays event quotes with accept/reject actions.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Warning,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventQuotes, useAcceptQuote, useRejectQuote } from '@/hooks/useQuotes';
import { Skeleton, EmptyState, Card, Badge, Button } from '@/components/common';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { Quote } from '@/apis/quotes.api';

export interface QuotesTabProps {
  eventId: number;
}

export function QuotesTab({ eventId }: QuotesTabProps) {
  const { data: quotes, isLoading, refetch, isRefetching } = useEventQuotes(eventId);
  const acceptQuote = useAcceptQuote();
  const rejectQuote = useRejectQuote();

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleAccept = (quote: Quote) => {
    if (quote.status !== 'SENT') return;

    Alert.alert(
      'Accept Quote',
      `Are you sure you want to accept this quote for ${formatCurrency(quote.total_amount, quote.currency)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            acceptQuote.mutate(quote.id);
          },
        },
      ]
    );
  };

  const handleRejectPress = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedQuoteId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    rejectQuote.mutate({ quoteId: selectedQuoteId, reason: rejectReason });
    setRejectModalVisible(false);
    setSelectedQuoteId(null);
    setRejectReason('');
  };

  const getStatusConfig = (status: Quote['status']) => {
    switch (status) {
      case 'ACCEPTED':
        return { variant: 'success' as const, label: 'Accepted', icon: CheckCircle };
      case 'REJECTED':
        return { variant: 'error' as const, label: 'Rejected', icon: XCircle };
      case 'EXPIRED':
        return { variant: 'error' as const, label: 'Expired', icon: Warning };
      case 'SENT':
        return { variant: 'primary' as const, label: 'Pending Response', icon: Clock };
      default:
        return { variant: 'default' as const, label: 'Draft', icon: FileText };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="rounded" width="100%" height={44} />
          </View>
        ))}
      </View>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <EmptyState
        icon="document"
        title="No Quotes"
        description="Quotes for this event will appear here."
      />
    );
  }

  const renderItem = ({ item: quote }: { item: Quote }) => {
    const statusConfig = getStatusConfig(quote.status);
    const StatusIcon = statusConfig.icon;
    const isPending = quote.status === 'SENT';

    return (
      <Card style={styles.quoteCard}>
        {/* Header */}
        <View style={styles.quoteHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
            <Text style={styles.quoteDate}>
              Created: {formatCardDate(quote.created_at)}
            </Text>
          </View>
          <Badge
            label={statusConfig.label}
            variant={statusConfig.variant}
            size="small"
          />
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Quote Total</Text>
          <Text style={styles.amount}>
            {formatCurrency(quote.total_amount, quote.currency)}
          </Text>
        </View>

        {/* Valid until */}
        {quote.valid_until && isPending && (
          <View style={styles.validUntil}>
            <Clock size={14} color={theme.colors.warning[600]} />
            <Text style={styles.validUntilText}>
              Valid until: {formatCardDate(quote.valid_until)}
            </Text>
          </View>
        )}

        {/* Line items summary */}
        {quote.line_items && quote.line_items.length > 0 && (
          <View style={styles.lineItems}>
            <Text style={styles.lineItemsTitle}>
              {quote.line_items.length} item{quote.line_items.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Actions */}
        {isPending && (
          <View style={styles.actions}>
            <Button
              onPress={() => handleRejectPress(quote.id)}
              variant="secondary"
              style={styles.actionButton}
              loading={rejectQuote.isPending && selectedQuoteId === quote.id}
            >
              Decline
            </Button>
            <Button
              onPress={() => handleAccept(quote)}
              variant="primary"
              style={styles.actionButton}
              loading={acceptQuote.isPending}
            >
              Accept
            </Button>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <FlatList
        data={quotes}
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

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRejectModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Decline Quote</Text>
            <Text style={styles.modalDescription}>
              Please provide a reason for declining this quote.
            </Text>
            <TextInput
              style={styles.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason for declining..."
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <Button
                onPress={() => setRejectModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                onPress={handleRejectConfirm}
                variant="primary"
                style={styles.modalButton}
                loading={rejectQuote.isPending}
              >
                Decline
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  quoteCard: {
    marginBottom: theme.spacing.md,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  quoteNumber: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
  },
  quoteDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  amountSection: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  amountLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    marginBottom: 4,
  },
  amount: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.xxl,
    color: theme.colors.primary[700],
  },
  validUntil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  validUntilText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning[700],
  },
  lineItems: {
    marginBottom: theme.spacing.md,
  },
  lineItemsTitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  skeletonItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.sm,
  },
  modalDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.md,
  },
  reasonInput: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default QuotesTab;
