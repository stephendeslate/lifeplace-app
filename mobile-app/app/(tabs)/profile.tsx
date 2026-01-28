/**
 * Profile Screen
 *
 * Shows user profile and settings navigation.
 * Phase 10: Enhanced Profile & Settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { format } from 'date-fns';
import {
  User,
  UserCircle,
  Lock,
  Bell,
  Shield,
  Question,
  SignOut,
  CaretRight,
  FileText,
  Calendar,
  Star,
} from 'phosphor-react-native';
import Constants from 'expo-constants';

import { useAuth } from '@/hooks/useAuth';
import { useVIPStatus } from '@/hooks/useVIP';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

// External URLs
const PRIVACY_POLICY_URL = 'https://lifeplace.com/privacy';
const TERMS_URL = 'https://lifeplace.com/terms';

// Menu section type
interface MenuItem {
  icon: typeof User;
  label: string;
  description?: string;
  route?: Href;
  onPress?: () => void;
  external?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { data: vipStatus } = useVIPStatus();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get app version
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return '?';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  // Format member since date
  const getMemberSince = () => {
    if (!user?.date_joined) return null;
    try {
      return format(new Date(user.date_joined), 'MMMM yyyy');
    } catch {
      return null;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setIsRefreshing(false);
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
            setIsLoggingOut(false);
          },
        },
      ]
    );
  };

  // Menu sections
  const menuSections: MenuSection[] = [
    {
      title: 'Rewards',
      items: [
        {
          icon: Star,
          label: 'LifePlace Rewards',
          description: vipStatus?.current_tier?.name
            ? `${vipStatus.current_tier.name} Member`
            : 'View your rewards',
          route: '/rewards' as Href,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: UserCircle,
          label: 'Edit Profile',
          description: 'Update your personal information',
          route: '/settings/edit-profile' as Href,
        },
        {
          icon: Lock,
          label: 'Change Password',
          description: 'Update your password',
          route: '/settings/change-password' as Href,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Manage notification settings',
          route: '/settings/notifications' as Href,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Shield,
          label: 'Privacy & Data',
          description: 'Manage consents, download data',
          route: '/settings/privacy' as Href,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: Question,
          label: 'Help & Support',
          description: 'Get help with your account',
          route: '/settings/help' as Href,
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: FileText,
          label: 'Privacy Policy',
          onPress: () => Linking.openURL(PRIVACY_POLICY_URL),
          external: true,
        },
        {
          icon: FileText,
          label: 'Terms of Service',
          onPress: () => Linking.openURL(TERMS_URL),
          external: true,
        },
      ],
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  const memberSince = getMemberSince();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.wood}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {memberSince && (
              <View style={styles.memberSince}>
                <Calendar size={12} color={colors.neutral.gray} />
                <Text style={styles.memberSinceText}>
                  Member since {memberSince}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <Pressable
                  key={item.label}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => handleMenuPress(item)}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <item.icon size={22} color={colors.primary.black} />
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      {item.description && (
                        <Text style={styles.menuDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <CaretRight size={18} color={colors.neutral.gray} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <Pressable
          style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <SignOut size={22} color={colors.semantic.error} />
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>LifePlace v{appVersion}</Text>
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent.wood,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typeScale.headlineSmall,
    color: colors.neutral.white,
    fontWeight: '600',
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
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  memberSinceText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  menuSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuLabel: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
  },
  menuDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
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
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  logoutText: {
    ...typeScale.labelLarge,
    color: colors.semantic.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  footerText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
});
