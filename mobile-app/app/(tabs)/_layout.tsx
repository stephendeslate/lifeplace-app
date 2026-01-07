/**
 * Tabs Layout
 *
 * Bottom tab navigation for the main app.
 *
 * TABS:
 * 1. Home (index) - Event management for users with bookings
 * 2. My Events - User's booked events
 * 3. Explore - Venue/package discovery and booking
 * 4. Profile - User settings and preferences
 *
 * EXPO ROUTER CONCEPTS:
 * - Tabs component from expo-router provides tab navigation
 * - Each Tabs.Screen corresponds to a file in this folder
 * - Tab icons use Phosphor icons with fill/regular variants
 *
 * NOTE: We use useAuthStore directly here instead of useAuth/useAuthContext
 * because expo-router initializes all layouts upfront, before the AuthProvider
 * in _layout.tsx wraps them. The Zustand store is available immediately.
 */

import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { HouseIcon, CalendarBlankIcon, CompassIcon, UserIcon } from 'phosphor-react-native';

import { useAuthStore } from '@/stores/authStore';
import { neutralColors, layout } from '@/theme';

export default function TabLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Show loading while hydrating auth state
  if (!isHydrated || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: neutralColors[25], // Off-white background
        }}
      >
        <ActivityIndicator size="large" color={neutralColors[900]} />
      </View>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: neutralColors[0], // White
          height: layout.bottomNavHeight,
          paddingTop: 8,
          paddingBottom: 20,
          position: 'absolute',
          // Minimal line style - subtle top border instead of heavy shadow
          borderTopWidth: 0.5,
          borderTopColor: neutralColors[200],
          // Very subtle shadow
          shadowColor: neutralColors[900],
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 4,
        },
        tabBarActiveTintColor: neutralColors[900],
        tabBarInactiveTintColor: neutralColors[400],
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HouseIcon
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'My Events',
          tabBarIcon: ({ color, focused }) => (
            <CalendarBlankIcon
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <CompassIcon
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <UserIcon
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
