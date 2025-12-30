/**
 * BreadcrumbNavigation Component
 *
 * Horizontal breadcrumb navigation for complex multi-step flows.
 * Shows the user's current location within a flow with clickable
 * navigation to completed steps.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { CaretRight, House, Check } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';

export interface BreadcrumbItem {
  id: string | number;
  label: string;
  isCompleted?: boolean;
  isDisabled?: boolean;
}

export interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  currentIndex: number;
  onItemPress?: (index: number) => void;
  allowBackNavigation?: boolean;
  showHome?: boolean;
  homeLabel?: string;
  onHomePress?: () => void;
  style?: StyleProp<ViewStyle>;
  maxVisibleItems?: number;
}

export function BreadcrumbNavigation({
  items,
  currentIndex,
  onItemPress,
  allowBackNavigation = true,
  showHome = false,
  homeLabel = 'Home',
  onHomePress,
  style,
  maxVisibleItems = 4,
}: BreadcrumbNavigationProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to show current item
  useEffect(() => {
    if (scrollViewRef.current && currentIndex > 0) {
      // Estimate position based on average item width
      const estimatedPosition = currentIndex * 100;
      scrollViewRef.current.scrollTo({
        x: Math.max(0, estimatedPosition - 100),
        animated: true,
      });
    }
  }, [currentIndex]);

  const handleItemPress = (index: number) => {
    if (!allowBackNavigation) return;

    const item = items[index];
    // Can only navigate to completed steps or current step
    if (item.isCompleted || index === currentIndex) {
      onItemPress?.(index);
    }
  };

  const isItemClickable = (index: number) => {
    if (!allowBackNavigation) return false;
    const item = items[index];
    return item.isCompleted && index !== currentIndex;
  };

  // Determine which items to show based on maxVisibleItems
  const getVisibleItems = () => {
    if (items.length <= maxVisibleItems) {
      return { items: items.map((item, index) => ({ ...item, originalIndex: index })), showEllipsis: false, ellipsisPosition: undefined };
    }

    // Show first item, ellipsis, and items around current
    const halfVisible = Math.floor((maxVisibleItems - 2) / 2);
    const startIndex = Math.max(1, currentIndex - halfVisible);
    const endIndex = Math.min(items.length - 1, startIndex + maxVisibleItems - 2);
    const adjustedStart = Math.max(1, endIndex - (maxVisibleItems - 2));

    const visibleItems: (BreadcrumbItem & { originalIndex: number })[] = [];

    // Always show first item
    visibleItems.push({ ...items[0], originalIndex: 0 });

    // Show items around current
    for (let i = adjustedStart; i <= endIndex; i++) {
      visibleItems.push({ ...items[i], originalIndex: i });
    }

    return {
      items: visibleItems,
      showEllipsis: adjustedStart > 1,
      ellipsisPosition: 1,
    };
  };

  const { items: visibleItems, showEllipsis, ellipsisPosition } = getVisibleItems();

  const renderSeparator = () => (
    <View style={styles.separator}>
      <CaretRight size={12} color={colors.neutral.gray} weight="bold" />
    </View>
  );

  const renderEllipsis = () => (
    <View style={styles.ellipsisContainer}>
      <Text style={styles.ellipsis}>...</Text>
      {renderSeparator()}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Home button */}
        {showHome && (
          <>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={onHomePress}
              activeOpacity={0.7}
            >
              <House size={16} color={colors.tertiary.teal} weight="fill" />
              <Text style={styles.homeText}>{homeLabel}</Text>
            </TouchableOpacity>
            {renderSeparator()}
          </>
        )}

        {/* Breadcrumb items */}
        {visibleItems.map((item, displayIndex) => {
          const isFirst = displayIndex === 0;
          const isCurrent = item.originalIndex === currentIndex;
          const clickable = isItemClickable(item.originalIndex);

          return (
            <React.Fragment key={item.id}>
              {/* Show ellipsis after first item if needed */}
              {showEllipsis && displayIndex === ellipsisPosition && renderEllipsis()}

              {/* Separator (except for first item) */}
              {displayIndex > 0 && !showEllipsis && renderSeparator()}
              {showEllipsis && ellipsisPosition !== undefined && displayIndex > ellipsisPosition && renderSeparator()}

              {/* Breadcrumb item */}
              <TouchableOpacity
                style={[
                  styles.item,
                  isCurrent && styles.itemCurrent,
                  clickable && styles.itemClickable,
                ]}
                onPress={() => handleItemPress(item.originalIndex)}
                disabled={!clickable}
                activeOpacity={clickable ? 0.7 : 1}
              >
                {item.isCompleted && !isCurrent && (
                  <Check
                    size={12}
                    color={colors.secondary.forest}
                    weight="bold"
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.itemText,
                    isCurrent && styles.itemTextCurrent,
                    item.isCompleted && !isCurrent && styles.itemTextCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: layout.borderRadius.sm,
  },
  homeText: {
    ...typeScale.labelSmall,
    color: colors.tertiary.teal,
  },
  separator: {
    paddingHorizontal: spacing.xs,
  },
  ellipsisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ellipsis: {
    ...typeScale.labelMedium,
    color: colors.neutral.gray,
    paddingHorizontal: spacing.xxs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: layout.borderRadius.sm,
    maxWidth: 140,
  },
  itemCurrent: {
    backgroundColor: colors.primary.black,
  },
  itemClickable: {
    backgroundColor: colors.neutral.sand,
  },
  checkIcon: {
    marginRight: spacing.xxs,
  },
  itemText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  itemTextCurrent: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  itemTextCompleted: {
    color: colors.secondary.forest,
  },
});

export default BreadcrumbNavigation;
