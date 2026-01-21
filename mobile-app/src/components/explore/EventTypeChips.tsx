/**
 * EventTypeChips Component
 *
 * Horizontal scrollable chips for event type filtering.
 * Similar to CategoryChips but with icons for each event type.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Cake,
  Tent,
  Users,
  BookOpen,
  CalendarBlank,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import type { EventType } from '@/types/explore.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface EventTypeChipsProps {
  eventTypes: EventType[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  allLabel?: string;
  showIcons?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Get icon for event type based on name
 */
function getEventTypeIcon(eventTypeName: string, isSelected: boolean) {
  const color = isSelected ? theme.colors.surface : theme.colors.neutral[600];
  const size = 14;

  switch (eventTypeName) {
    case 'Wedding':
      return <Cake size={size} color={color} weight="fill" />;
    case 'Camps & Retreats':
      return <Tent size={size} color={color} weight="fill" />;
    case 'Team Building':
      return <Users size={size} color={color} weight="fill" />;
    case 'Workshops':
      return <BookOpen size={size} color={color} weight="fill" />;
    default:
      return <CalendarBlank size={size} color={color} weight="fill" />;
  }
}

export function EventTypeChips({
  eventTypes,
  selectedId,
  onSelect,
  allLabel = 'All',
  showIcons = true,
  style,
  testID,
}: EventTypeChipsProps) {
  const handleSelect = (id: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
      testID={testID}
    >
      {/* All option */}
      <EventTypeChipItem
        key="all"
        id={null}
        name={allLabel}
        isSelected={selectedId === null}
        onPress={() => handleSelect(null)}
        showIcon={false}
      />

      {/* Event type options */}
      {eventTypes.map((eventType) => (
        <EventTypeChipItem
          key={eventType.id}
          id={eventType.id}
          name={eventType.name}
          isSelected={selectedId === eventType.id}
          onPress={() => handleSelect(eventType.id)}
          showIcon={showIcons}
        />
      ))}
    </ScrollView>
  );
}

interface EventTypeChipItemProps {
  id: number | null;
  name: string;
  isSelected: boolean;
  onPress: () => void;
  showIcon?: boolean;
}

function EventTypeChipItem({
  id,
  name,
  isSelected,
  onPress,
  showIcon = true,
}: EventTypeChipItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipDefault,
        animatedStyle,
      ]}
    >
      {showIcon && id !== null && (
        <View style={styles.iconContainer}>
          {getEventTypeIcon(name, isSelected)}
        </View>
      )}
      <Text
        style={[
          styles.chipText,
          isSelected ? styles.chipTextSelected : styles.chipTextDefault,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    height: 32,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.neutral[200],
  },
  chipSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  chipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
  },
  chipTextDefault: {
    color: theme.colors.neutral[700],
  },
  chipTextSelected: {
    color: theme.colors.surface,
  },
  iconContainer: {
    marginRight: theme.spacing.xxs,
  },
});

export default EventTypeChips;
