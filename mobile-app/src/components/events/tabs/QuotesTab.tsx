/**
 * QuotesTab Component
 *
 * Displays event quotes with accept/reject actions, expandable line items,
 * quote options, PDF viewing, and expiry warnings.
 * Matches client-portal EventQuotes patterns.
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
  CaretDown,
  CaretUp,
  ChatText,
  Check,
} from 'phosphor-react-native';
import { differenceInDays, isBefore } from 'date-fns';
import { theme } from '@/theme';
import { useEventQuotes, useAcceptQuote, useRejectQuote } from '@/hooks/useQuotes';
import { Skeleton, EmptyState, Card, Badge, Button } from '@/components/common';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { Quote, QuoteLineItem, QuoteOption } from '@/apis/quotes.api';

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
  const [expandedQuotes, setExpandedQuotes] = useState<Set<number>>(new Set());


  const toggleExpanded = (quoteId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedQuotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

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

  const getExpiryInfo = (quote: Quote) => {
    if (!quote.valid_until) return null;
    const expiryDate = new Date(quote.valid_until);
    const now = new Date();
    const daysUntil = differenceInDays(expiryDate, now);
    const isExpired = isBefore(expiryDate, now);

    if (isExpired) {
      return { text: 'Expired', variant: 'error' as const };
    }
    if (daysUntil === 0) {
      return { text: 'Expires today', variant: 'warning' as const };
    }
    if (daysUntil === 1) {
      return { text: 'Expires tomorrow', variant: 'warning' as const };
    }
    if (daysUntil <= 3) {
      return { text: `Expires in ${daysUntil} days`, variant: 'warning' as const };
    }
    return null;
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

  const renderLineItem = (item: QuoteLineItem, currency: string) => {
    const isDiscount = parseFloat(item.total_price) < 0;

    return (
      <View key={item.id} style={styles.lineItem}>
        <View style={styles.lineItemHeader}>
          <Text style={styles.lineItemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={[styles.lineItemTotal, isDiscount && styles.discountText]}>
            {isDiscount ? '-' : ''}{formatCurrency(Math.abs(parseFloat(item.total_price)), currency)}
          </Text>
        </View>
        <View style={styles.lineItemDetails}>
          <Text style={styles.lineItemDetail}>
            Qty: {item.quantity} × {formatCurrency(item.unit_price, currency)}
          </Text>
          {item.tax_rate && parseFloat(item.tax_rate) > 0 && (
            <Text style={styles.lineItemDetail}>
              Tax: {parseFloat(item.tax_rate)}%
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderQuoteOption = (option: QuoteOption, currency: string) => (
    <View key={option.id} style={styles.optionItem}>
      <View style={styles.optionHeader}>
        <View style={styles.optionNameRow}>
          {option.is_selected && (
            <View style={styles.selectedBadge}>
              <Check size={10} color={theme.colors.success[600]} weight="bold" />
            </View>
          )}
          <Text style={[styles.optionName, option.is_selected && styles.selectedOptionName]}>
            {option.name}
          </Text>
        </View>
        <Text style={styles.optionPrice}>
          {formatCurrency(option.total_price, currency)}
        </Text>
      </View>
      {option.description && (
        <Text style={styles.optionDescription}>{option.description}</Text>
      )}
    </View>
  );

  const renderItem = ({ item: quote }: { item: Quote }) => {
    const statusConfig = getStatusConfig(quote.status);
    const isPending = quote.status === 'SENT';
    const isRejected = quote.status === 'REJECTED';
    const isExpanded = expandedQuotes.has(quote.id);
    const expiryInfo = isPending ? getExpiryInfo(quote) : null;
    const hasLineItems = quote.line_items && quote.line_items.length > 0;
    const hasOptions = quote.options && quote.options.length > 0;

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
          <View style={styles.headerBadges}>
            <Badge
              label={statusConfig.label}
              variant={statusConfig.variant}
              size="small"
            />
            {expiryInfo && (
              <View style={[
                styles.expiryChip,
                expiryInfo.variant === 'error' && styles.expiryChipError,
              ]}>
                <Text style={[
                  styles.expiryChipText,
                  expiryInfo.variant === 'error' && styles.expiryChipTextError,
                ]}>
                  {expiryInfo.text}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Quote Total</Text>
          <Text style={styles.amount}>
            {formatCurrency(quote.total_amount, quote.currency)}
          </Text>
        </View>

        {/* Valid until */}
        {quote.valid_until && isPending && !expiryInfo && (
          <View style={styles.validUntil}>
            <Clock size={14} color={theme.colors.neutral[500]} />
            <Text style={styles.validUntilText}>
              Valid until: {formatCardDate(quote.valid_until)}
            </Text>
          </View>
        )}

        {/* Client Message */}
        {quote.client_message && (
          <View style={styles.clientMessage}>
            <ChatText size={16} color={theme.colors.primary[500]} />
            <Text style={styles.clientMessageText}>{quote.client_message}</Text>
          </View>
        )}

        {/* Rejection Reason */}
        {isRejected && quote.rejection_reason && (
          <View style={styles.rejectionReason}>
            <XCircle size={16} color={theme.colors.error[500]} />
            <View style={styles.rejectionContent}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{quote.rejection_reason}</Text>
            </View>
          </View>
        )}

        {/* Expandable Line Items */}
        {hasLineItems && (
          <View style={styles.lineItemsSection}>
            <Pressable
              onPress={() => toggleExpanded(quote.id)}
              style={styles.lineItemsToggle}
            >
              <Text style={styles.lineItemsTitle}>
                {quote.line_items.length} item{quote.line_items.length !== 1 ? 's' : ''}
              </Text>
              {isExpanded ? (
                <CaretUp size={18} color={theme.colors.neutral[500]} />
              ) : (
                <CaretDown size={18} color={theme.colors.neutral[500]} />
              )}
            </Pressable>

            {isExpanded && (
              <View style={styles.lineItemsList}>
                {quote.line_items.map((item) =>
                  renderLineItem(item, quote.currency)
                )}
              </View>
            )}
          </View>
        )}

        {/* Quote Options */}
        {hasOptions && isExpanded && (
          <View style={styles.optionsSection}>
            <Text style={styles.optionsSectionTitle}>Options</Text>
            {quote.options?.map((option) => renderQuoteOption(option, quote.currency))}
          </View>
        )}

        {/* Action Buttons */}
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
              maxLength={1000}
            />
            <Text style={styles.charCount}>{rejectReason.length}/1000</Text>
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
  headerBadges: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
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
  expiryChip: {
    backgroundColor: theme.colors.warning[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.warning[500],
  },
  expiryChipError: {
    backgroundColor: theme.colors.error[100],
    borderColor: theme.colors.error[100],
  },
  expiryChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning[700],
  },
  expiryChipTextError: {
    color: theme.colors.error[700],
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
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  clientMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  clientMessageText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[700],
    lineHeight: 20,
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error[100],
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error[700],
    marginBottom: 2,
  },
  rejectionText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error[600],
    lineHeight: 20,
  },
  lineItemsSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  lineItemsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemsTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  lineItemsList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  lineItem: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  lineItemDescription: {
    flex: 1,
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
    marginRight: theme.spacing.sm,
  },
  lineItemTotal: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  discountText: {
    color: theme.colors.success[600],
  },
  lineItemDetails: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  lineItemDetail: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
  },
  optionsSection: {
    marginBottom: theme.spacing.md,
  },
  optionsSectionTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.sm,
  },
  optionItem: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  selectedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.success[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionName: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  selectedOptionName: {
    color: theme.colors.success[700],
  },
  optionPrice: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  optionDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginTop: 4,
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
  },
  charCount: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
    textAlign: 'right',
    marginTop: theme.spacing.xs,
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
