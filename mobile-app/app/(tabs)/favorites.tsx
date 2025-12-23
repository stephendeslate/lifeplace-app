/**
 * Favorites/Saved Screen
 *
 * Shows user's saved venues and packages.
 * Full implementation in Phase 11.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout } from '@/theme';

export default function FavoritesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Heart size={64} color={colors.neutral.gray} weight="thin" />
          <Text style={styles.emptyTitle}>No Saved Items</Text>
          <Text style={styles.emptyText}>
            Save your favorite venues and packages{'\n'}
            for quick access later.{'\n'}
            Full implementation coming in Phase 11.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomNavHeight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxxxl,
  },
  emptyTitle: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
});
