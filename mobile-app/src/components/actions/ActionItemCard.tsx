/**
 * ActionItemCard Component
 *
 * Displays a single action item (quote, contract, payment, or task)
 * with urgency indicator and relevant details.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  FileText,
  PenNib,
  CreditCard,
  CheckSquare,
  Clock,
  Warning,
  CaretRight,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type {
  AnyActionItem,
  ActionType,
  UrgencyLevel,
} from '@/types/action-center.types';
import {
  isQuoteAction,
  isContractAction,
  isPaymentAction,
  isTaskAction,
  ACTION_TYPE_CONFIGS,
  URGENCY_CONFIGS,
} from '@/types/action-center.types';

interface ActionItemCardProps {
  action: AnyActionItem;
  onPress: () => void;
  testID?: string;
}

export function ActionItemCard({ action, onPress, testID }: ActionItemCardProps) {
  const typeConfig = ACTION_TYPE_CONFIGS[action.type];
  const urgencyConfig = URGENCY_CONFIGS[action.urgency];

  const renderIcon = () => {
    const iconProps = {
      size: 24,
      color: typeConfig.color,
      weight: 'regular' as const,
    };

    switch (action.type) {
      case 'QUOTE':
        return <FileText {...iconProps} />;
      case 'CONTRACT':
        return <PenNib {...iconProps} />;
      case 'PAYMENT':
        return <CreditCard {...iconProps} />;
      case 'TASK':
        return <CheckSquare {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const renderBadgeVariant = (urgency: UrgencyLevel): 'error' | 'warning' | 'info' | 'success' => {
    switch (urgency) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
    }
  };

  const renderMetadata = () => {
    if (isQuoteAction(action)) {
      return (
        <View style={styles.metadataRow}>
          <Text style={styles.amount}>
            {formatCurrency(action.totalAmount, action.currency)}
          </Text>
          {action.validUntil && (
            <View style={styles.dueDateContainer}>
              <Clock size={14} color={urgencyConfig.color} />
              <Text style={[styles.dueDate, { color: urgencyConfig.color }]}>
                {action.isExpired ? 'Expired' : `Expires ${formatCardDate(action.validUntil)}`}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (isPaymentAction(action)) {
      return (
        <View style={styles.metadataRow}>
          <Text style={styles.amount}>
            {formatCurrency(action.amountDue, action.currency)}
          </Text>
          {action.isOverdue && (
            <View style={styles.dueDateContainer}>
              <Warning size={14} color={theme.colors.semantic.error} weight="fill" />
              <Text style={[styles.dueDate, { color: theme.colors.semantic.error }]}>
                {action.daysPastDue} days overdue
              </Text>
            </View>
          )}
          {!action.isOverdue && action.dueDate && (
            <View style={styles.dueDateContainer}>
              <Clock size={14} color={theme.colors.neutral.gray} />
              <Text style={styles.dueDate}>
                Due {formatCardDate(action.dueDate)}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (isContractAction(action)) {
      return (
        <View style={styles.metadataRow}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${action.signatureProgress.percentage}%`,
                    backgroundColor: typeConfig.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {action.signatureProgress.signed_count}/{action.signatureProgress.total_required} signed
            </Text>
          </View>
          {action.expiresAt && (
            <View style={styles.dueDateContainer}>
              <Clock size={14} color={urgencyConfig.color} />
              <Text style={[styles.dueDate, { color: urgencyConfig.color }]}>
                {action.isExpired ? 'Expired' : `Expires ${formatCardDate(action.expiresAt)}`}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (isTaskAction(action)) {
      return (
        <View style={styles.metadataRow}>
          <Badge
            label={action.priority}
            variant={renderBadgeVariant(action.urgency)}
            size="small"
          />
          {action.dueDate && (
            <View style={styles.dueDateContainer}>
              <Clock size={14} color={theme.colors.neutral.gray} />
              <Text style={styles.dueDate}>
                Due {formatCardDate(action.dueDate)}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      {/* Left urgency indicator */}
      <View
        style={[
          styles.urgencyIndicator,
          { backgroundColor: urgencyConfig.color },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: typeConfig.backgroundColor },
            ]}
          >
            {renderIcon()}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {action.title}
            </Text>
            <Text style={styles.eventName} numberOfLines={1}>
              {action.eventName}
            </Text>
          </View>
          <Badge
            label={urgencyConfig.label}
            variant={renderBadgeVariant(action.urgency)}
            size="small"
          />
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {action.description}
        </Text>

        {/* Metadata row */}
        {renderMetadata()}
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <CaretRight size={20} color={theme.colors.neutral.gray} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  urgencyIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
  eventName: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  description: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.darkGray,
    marginBottom: theme.spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  amount: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDate: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: theme.colors.neutral.warmGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingRight: theme.spacing.md,
  },
});

export default ActionItemCard;
