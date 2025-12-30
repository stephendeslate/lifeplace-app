/**
 * Help & Support Screen
 *
 * Help and support options placeholder.
 * Phase 10: Profile & Settings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import {
  Question,
  Envelope,
  Phone,
  ChatCircle,
  FileText,
  CaretRight,
  ArrowSquareOut,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';

// Contact methods
const CONTACT_OPTIONS = [
  {
    icon: Envelope,
    label: 'Email Support',
    description: 'Get help via email',
    action: () => Linking.openURL('mailto:support@lifeplace.com'),
  },
  {
    icon: Phone,
    label: 'Call Us',
    description: '+63 2 8888 1234',
    action: () => Linking.openURL('tel:+6328881234'),
  },
  {
    icon: ChatCircle,
    label: 'Live Chat',
    description: 'Chat with our support team',
    action: () => Linking.openURL('https://lifeplace.com/chat'),
  },
];

// Help articles
const FAQ_TOPICS = [
  'How do I book an event?',
  'How do I make a payment?',
  'How do I change my event date?',
  'How do I cancel my booking?',
  'How do I contact the venue?',
];

export default function HelpScreen() {
  const openFAQ = () => {
    Linking.openURL('https://lifeplace.com/help');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <Question size={40} color={colors.accent.wood} weight="duotone" />
        </View>
        <Text style={styles.headerTitle}>How can we help?</Text>
        <Text style={styles.headerDescription}>
          Get support with your account, bookings, payments, and more.
        </Text>
      </View>

      {/* Contact Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.card}>
          {CONTACT_OPTIONS.map((option, index) => (
            <Pressable
              key={option.label}
              style={[
                styles.contactItem,
                index < CONTACT_OPTIONS.length - 1 && styles.itemBorder,
              ]}
              onPress={option.action}
            >
              <View style={styles.contactIconContainer}>
                <option.icon size={22} color={colors.primary.black} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>{option.label}</Text>
                <Text style={styles.contactDescription}>{option.description}</Text>
              </View>
              <ArrowSquareOut size={18} color={colors.neutral.gray} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* FAQ Topics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Pressable onPress={openFAQ}>
            <Text style={styles.viewAllLink}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          {FAQ_TOPICS.map((topic, index) => (
            <Pressable
              key={topic}
              style={[
                styles.faqItem,
                index < FAQ_TOPICS.length - 1 && styles.itemBorder,
              ]}
              onPress={() => Linking.openURL(`https://lifeplace.com/help?q=${encodeURIComponent(topic)}`)}
            >
              <FileText size={18} color={colors.neutral.gray} />
              <Text style={styles.faqText}>{topic}</Text>
              <CaretRight size={16} color={colors.neutral.gray} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Business Hours */}
      <View style={styles.hoursCard}>
        <Text style={styles.hoursTitle}>Business Hours</Text>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursDay}>Monday - Friday</Text>
          <Text style={styles.hoursTime}>9:00 AM - 6:00 PM</Text>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursDay}>Saturday</Text>
          <Text style={styles.hoursTime}>9:00 AM - 12:00 PM</Text>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursDay}>Sunday</Text>
          <Text style={styles.hoursTime}>Closed</Text>
        </View>
        <Text style={styles.hoursNote}>Philippine Standard Time (GMT+8)</Text>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>
          LifePlace Mobile App • Support available 24/7 via email
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.woodSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  headerDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllLink: {
    ...typeScale.labelMedium,
    color: colors.accent.wood,
    marginRight: spacing.xs,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    fontWeight: '500',
  },
  contactDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  faqText: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  hoursCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  hoursTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  hoursDay: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  hoursTime: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
  },
  hoursNote: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  appInfo: {
    alignItems: 'center',
  },
  appInfoText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
});
