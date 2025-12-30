/**
 * Notification Preferences Screen
 *
 * Allows users to manage their push notification preferences.
 * Includes toggles for different notification categories and a test notification button.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Calendar,
  CreditCard,
  ChatCircle,
  CheckCircle,
  FileText,
  Megaphone,
  DeviceMobile,
  PaperPlaneTilt,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import {
  useNotificationPreferences,
  useRegisteredDevices,
} from '@/hooks/useNotificationPreferences';
import { NotificationService } from '@/services/notifications';

// =============================================================================
// TYPES
// =============================================================================

interface PreferenceRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENTS
// =============================================================================

function PreferenceRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled,
}: PreferenceRowProps) {
  return (
    <View style={[styles.preferenceRow, disabled && styles.preferenceRowDisabled]}>
      <View style={styles.preferenceIcon}>{icon}</View>
      <View style={styles.preferenceContent}>
        <Text style={[styles.preferenceTitle, disabled && styles.textDisabled]}>
          {title}
        </Text>
        <Text style={[styles.preferenceDescription, disabled && styles.textDisabled]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.neutral.warmGray,
          true: colors.secondary.forest,
        }}
        thumbColor={colors.neutral.white}
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    preferences,
    isLoading,
    updatePreference,
    isUpdating,
    refetch,
  } = useNotificationPreferences();

  const {
    devices,
    deviceCount,
    sendTestNotification,
    isSendingTest,
    refetch: refetchDevices,
  } = useRegisteredDevices();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchDevices()]);
    setIsRefreshing(false);
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleSendTestNotification = () => {
    sendTestNotification({
      title: 'Test Notification',
      body: 'Push notifications are working correctly!',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
      </View>
    );
  }

  const isPushDisabled = !preferences.push_enabled;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary.black}
        />
      }
    >
      {/* Master Toggle Section */}
      <SectionHeader title="Push Notifications" />
      <View style={styles.section}>
        <PreferenceRow
          icon={<Bell size={24} color={colors.secondary.forest} weight="fill" />}
          title="Enable Notifications"
          description="Receive push notifications from LifePlace"
          value={preferences.push_enabled}
          onValueChange={(value) => updatePreference('push_enabled', value)}
        />
      </View>

      {/* Category Toggles */}
      <SectionHeader title="Notification Categories" />
      <View style={styles.section}>
        <PreferenceRow
          icon={<Calendar size={24} color={colors.secondary.forest} />}
          title="Event Updates"
          description="Changes to your booked events"
          value={preferences.event_push}
          onValueChange={(value) => updatePreference('event_push', value)}
          disabled={isPushDisabled}
        />

        <View style={styles.divider} />

        <PreferenceRow
          icon={<CreditCard size={24} color={colors.secondary.forest} />}
          title="Payment Reminders"
          description="Upcoming payments and confirmations"
          value={preferences.payment_push}
          onValueChange={(value) => updatePreference('payment_push', value)}
          disabled={isPushDisabled}
        />

        <View style={styles.divider} />

        <PreferenceRow
          icon={<FileText size={24} color={colors.secondary.forest} />}
          title="Contract Updates"
          description="Contract signing requests and updates"
          value={preferences.contract_push}
          onValueChange={(value) => updatePreference('contract_push', value)}
          disabled={isPushDisabled}
        />

        <View style={styles.divider} />

        <PreferenceRow
          icon={<CheckCircle size={24} color={colors.secondary.forest} />}
          title="Task Reminders"
          description="Tasks that need your attention"
          value={preferences.task_push}
          onValueChange={(value) => updatePreference('task_push', value)}
          disabled={isPushDisabled}
        />

        <View style={styles.divider} />

        <PreferenceRow
          icon={<ChatCircle size={24} color={colors.secondary.forest} />}
          title="Messages"
          description="New messages from LifePlace staff"
          value={preferences.communication_push}
          onValueChange={(value) => updatePreference('communication_push', value)}
          disabled={isPushDisabled}
        />
      </View>

      {/* Marketing Section */}
      <SectionHeader title="Marketing" />
      <View style={styles.section}>
        <PreferenceRow
          icon={<Megaphone size={24} color={colors.accent.wood} />}
          title="Promotions & Offers"
          description="Special offers and promotional content"
          value={preferences.marketing_push}
          onValueChange={(value) => updatePreference('marketing_push', value)}
          disabled={isPushDisabled}
        />
      </View>

      {/* Device Info */}
      <SectionHeader title="Registered Devices" />
      <View style={styles.section}>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceIcon}>
            <DeviceMobile size={24} color={colors.tertiary.teal} />
          </View>
          <View style={styles.deviceContent}>
            <Text style={styles.deviceTitle}>
              {deviceCount === 0
                ? 'No devices registered'
                : deviceCount === 1
                  ? '1 device registered'
                  : `${deviceCount} devices registered`}
            </Text>
            <Text style={styles.deviceDescription}>
              {deviceCount > 0
                ? 'Notifications will be sent to all registered devices'
                : 'Register this device to receive notifications'}
            </Text>
          </View>
        </View>

        {/* Test Notification Button */}
        {deviceCount > 0 && (
          <>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.testButtonPressed,
              ]}
              onPress={handleSendTestNotification}
              disabled={isSendingTest || isPushDisabled}
            >
              {isSendingTest ? (
                <ActivityIndicator size="small" color={colors.primary.black} />
              ) : (
                <>
                  <PaperPlaneTilt
                    size={20}
                    color={isPushDisabled ? colors.neutral.gray : colors.primary.black}
                  />
                  <Text
                    style={[
                      styles.testButtonText,
                      isPushDisabled && styles.textDisabled,
                    ]}
                  >
                    Send Test Notification
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>

      {/* System Settings Link */}
      <View style={styles.systemSettingsCard}>
        <Text style={styles.systemSettingsText}>
          To completely disable notifications, you can adjust the settings in your
          device's system preferences.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.settingsLink,
            pressed && styles.settingsLinkPressed,
          ]}
          onPress={handleOpenSettings}
        >
          <Text style={styles.settingsLinkText}>Open System Settings</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.cream,
  },
  sectionTitle: {
    ...typeScale.labelLarge,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  preferenceRowDisabled: {
    opacity: 0.5,
  },
  preferenceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary.forestSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  preferenceContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  preferenceDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  textDisabled: {
    color: colors.neutral.gray,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.sand,
    marginLeft: spacing.md + 44 + spacing.md, // Align with text
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tertiary.tealSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  deviceContent: {
    flex: 1,
  },
  deviceTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  deviceDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  testButtonPressed: {
    backgroundColor: colors.neutral.sand,
  },
  testButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  systemSettingsCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
  },
  systemSettingsText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  settingsLink: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  settingsLinkPressed: {
    opacity: 0.7,
  },
  settingsLinkText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
});
