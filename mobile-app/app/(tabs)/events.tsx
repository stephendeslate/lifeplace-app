/**
 * My Events Screen
 *
 * Shows user's booked events.
 * Full implementation in Phase 4.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarBlank } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout } from '@/theme';

export default function EventsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.emptyState}>
          <CalendarBlank size={64} color={colors.neutral.gray} weight="thin" />
          <Text style={styles.emptyTitle}>No Events Yet</Text>
          <Text style={styles.emptyText}>
            Your booked events will appear here.{'\n'}
            Full implementation coming in Phase 4.
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
