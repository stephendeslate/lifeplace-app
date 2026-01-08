/**
 * Home Screen (Dashboard)
 *
 * State-dependent home screen that renders different layouts based on user activity:
 * - ManagementLayout: For users with active bookings (event management focus)
 * - DiscoveryLayout: For new/browsing users (venue discovery focus)
 *
 * The layout is determined automatically based on:
 * - Presence of upcoming events
 * - Pending quotes, contracts, or payments
 * - Active tasks
 */

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useActionCount } from '@/hooks/useActionCenter';
import { getUserState } from '@/utils/userState';
import { ManagementLayout, DiscoveryLayout } from '@/components/home';
import { theme } from '@/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, refetch, isRefetching } = useDashboard();
  const { count: unreadCount } = useActionCount();

  // Determine user state and layout type
  const userState = useMemo(
    () => getUserState(user, dashboardData),
    [user, dashboardData]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {userState.layoutType === 'management' ? (
        <ManagementLayout
          user={user}
          dashboardData={dashboardData}
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRefresh={refetch}
          unreadCount={unreadCount}
        />
      ) : (
        <DiscoveryLayout
          user={user}
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRefresh={refetch}
          unreadCount={unreadCount}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
