/**
 * Profile Screen
 *
 * Shows user profile and settings.
 * Full implementation in Phase 10.
 */

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Gear,
  Bell,
  Shield,
  Question,
  SignOut,
  CaretRight,
} from 'phosphor-react-native';

import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: User, label: 'Edit Profile', onPress: () => {} },
    { icon: Bell, label: 'Notifications', onPress: () => {} },
    { icon: Shield, label: 'Privacy & Security', onPress: () => {} },
    { icon: Question, label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <User size={32} color={colors.neutral.white} weight="fill" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <Pressable style={styles.settingsButton}>
            <Gear size={24} color={colors.primary.black} />
          </Pressable>
        </View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
            >
              <item.icon size={22} color={colors.primary.black} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <CaretRight size={18} color={colors.neutral.gray} />
            </Pressable>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={() => logout()}>
          <SignOut size={22} color={colors.semantic.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>LifePlace v1.0.0</Text>
          <Text style={styles.footerText}>Full profile coming in Phase 10</Text>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.wood,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  userEmail: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  menuLabel: {
    flex: 1,
    ...typeScale.bodyLarge,
    color: colors.primary.black,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    marginBottom: spacing.xl,
  },
  logoutText: {
    ...typeScale.labelLarge,
    color: colors.semantic.error,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  footerText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
});
