/**
 * Booking Flow Layout
 *
 * Layout for individual booking flow screens.
 * Provides navigation configuration for step-based routing.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function BookingFlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.neutral.sand,
        },
        gestureEnabled: false, // Prevent swipe back during booking
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Booking',
        }}
      />
      <Stack.Screen
        name="venue"
        options={{
          title: 'Select Venue',
        }}
      />
      <Stack.Screen
        name="datetime"
        options={{
          title: 'Select Date & Time',
        }}
      />
      <Stack.Screen
        name="package"
        options={{
          title: 'Select Package',
        }}
      />
      <Stack.Screen
        name="addons"
        options={{
          title: 'Add-ons',
        }}
      />
      <Stack.Screen
        name="questionnaire"
        options={{
          title: 'Event Details',
        }}
      />
      <Stack.Screen
        name="summary"
        options={{
          title: 'Review',
        }}
      />
      <Stack.Screen
        name="contact"
        options={{
          title: 'Contact Info',
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          title: 'Payment',
        }}
      />
      <Stack.Screen
        name="confirmation"
        options={{
          title: 'Confirmation',
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}
