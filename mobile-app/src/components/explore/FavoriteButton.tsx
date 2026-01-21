/**
 * FavoriteButton Component
 *
 * A heart icon button for toggling favorites with haptic feedback
 * and animated fill/outline transition.
 */

import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Heart } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useFavorite } from '@/stores/favoritesStore';
import { colors } from '@/theme';
import type { FavoriteType } from '@/types/explore.types';

export interface FavoriteButtonProps {
  type: FavoriteType;
  itemId: number;
  size?: number;
  style?: ViewStyle;
  showBackground?: boolean;
}

export function FavoriteButton({
  type,
  itemId,
  size = 24,
  style,
  showBackground = true,
}: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorite(type, itemId);
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.8, {}, () => {
      scale.value = withSpring(1);
    });

    Haptics.impactAsync(
      isFavorite
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    toggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      style={[showBackground && styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      accessibilityState={{ selected: isFavorite }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={size}
          weight={isFavorite ? 'fill' : 'regular'}
          color={isFavorite ? colors.semantic.error : colors.neutral.white}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
