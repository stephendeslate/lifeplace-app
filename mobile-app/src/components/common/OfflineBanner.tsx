/**
 * Offline Banner Component
 *
 * Displays a banner when the device is offline to inform users
 * that some features may be unavailable.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiSlash } from 'phosphor-react-native';

import { useNetworkState } from '@/hooks/useNetworkState';
import { colors, spacing, typeScale } from '@/theme';

export const OfflineBanner = () => {
  const { isOffline } = useNetworkState();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (isOffline) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isOffline, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }, animatedStyle]}
    >
      <WifiSlash size={20} color={colors.neutral.white} />
      <Text style={styles.text}>You're offline. Some features may be unavailable.</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.warning,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    zIndex: 9998,
  },
  text: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
  },
});
