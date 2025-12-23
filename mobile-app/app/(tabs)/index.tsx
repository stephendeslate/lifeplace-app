/**
 * Explore/Dashboard Screen
 *
 * Main home screen - will show venue discovery, featured packages, etc.
 * Full implementation in Phase 4.
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MagnifyingGlass, Bell } from 'phosphor-react-native';

import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, typeScale, layout } from '@/theme';

export default function ExploreScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Welcome{user?.first_name ? `, ${user.first_name}` : ''}!
            </Text>
            <Text style={styles.subGreeting}>Find your perfect venue</Text>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={24} color={colors.primary.black} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <Pressable style={styles.searchBar}>
          <MagnifyingGlass size={20} color={colors.neutral.gray} />
          <Text style={styles.searchPlaceholder}>
            Search venues, packages...
          </Text>
        </Pressable>

        {/* Placeholder Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Venues</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Venue cards coming in Phase 4
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Packages</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Package cards coming in Phase 4
            </Text>
          </View>
        </View>

        {/* Temporary logout button for testing */}
        <View style={styles.section}>
          <Pressable style={styles.logoutButton} onPress={() => logout()}>
            <Text style={styles.logoutText}>Logout (Test)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomNavHeight + spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
  },
  subGreeting: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  searchPlaceholder: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  placeholder: {
    backgroundColor: colors.neutral.white,
    padding: spacing.xxl,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  placeholderText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
  },
  logoutButton: {
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.semantic.error,
  },
  logoutText: {
    ...typeScale.labelLarge,
    color: colors.semantic.error,
  },
});
