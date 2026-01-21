/**
 * EventTypeQuickCard Component
 *
 * A compact card for quick event type navigation on the home screen.
 * Displays event type icon, name, and navigates to explore with pre-selection.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Cake, Tent, Users, BookOpen, CalendarCheck } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, brandColors } from '@/theme';
import type { EventType } from '@/types/explore.types';

export interface EventTypeQuickCardProps {
  eventType: EventType;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const getEventTypeIcon = (eventTypeName: string) => {
  switch (eventTypeName) {
    case 'Wedding':
    case 'Weddings':
      return Cake;
    case 'Camps & Retreats':
      return Tent;
    case 'Team Building':
      return Users;
    case 'Workshops':
      return BookOpen;
    default:
      return CalendarCheck;
  }
};

const getEventTypeColor = (eventTypeName: string) => {
  switch (eventTypeName) {
    case 'Wedding':
    case 'Weddings':
      return { bg: '#FDF2F8', icon: '#EC4899' }; // Pink
    case 'Camps & Retreats':
      return { bg: brandColors.green[50], icon: brandColors.green[500] };
    case 'Team Building':
      return { bg: '#EFF6FF', icon: '#3B82F6' }; // Blue
    case 'Workshops':
      return { bg: '#FEF3C7', icon: '#F59E0B' }; // Amber
    default:
      return { bg: colors.neutral.sand, icon: colors.neutral.gray };
  }
};

export function EventTypeQuickCard({
  eventType,
  onPress,
  style,
}: EventTypeQuickCardProps) {
  const IconComponent = getEventTypeIcon(eventType.name);
  const colorScheme = getEventTypeColor(eventType.name);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colorScheme.bg }]}>
        <IconComponent size={24} color={colorScheme.icon} weight="fill" />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {eventType.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typeScale.labelSmall,
    color: colors.primary.black,
    textAlign: 'center',
  },
});

export default EventTypeQuickCard;
