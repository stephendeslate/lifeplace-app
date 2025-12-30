/**
 * Data Category Card Component
 *
 * Collapsible card for displaying a category of personal data.
 * Used in the data access screen.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { CaretDown } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';

interface DataCategoryCardProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function DataCategoryCard({
  title,
  icon,
  count,
  children,
  defaultExpanded = false,
}: DataCategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 180 : 0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    rotation.value = withTiming(isExpanded ? 0 : 180, { duration: 200 });
  };

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
          {count !== undefined && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </View>
        <Animated.View style={arrowStyle}>
          <CaretDown size={20} color={colors.neutral.darkGray} />
        </Animated.View>
      </Pressable>

      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

/**
 * Data item row for displaying key-value pairs
 */
interface DataItemRowProps {
  label: string;
  value: string | React.ReactNode;
}

export function DataItemRow({ label, value }: DataItemRowProps) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={styles.dataValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  title: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  countBadge: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginLeft: spacing.sm,
  },
  countText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  content: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.sand,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  dataLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    flex: 1,
  },
  dataValue: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 2,
    textAlign: 'right',
  },
});
