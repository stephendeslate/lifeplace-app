import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Use direct relative import to avoid potential path alias issues on initial load
import { colors, spacing, typeScale } from '../src/theme/index';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Hello LifePlace</Text>
        <Text style={styles.subtitle}>Mobile App</Text>
        <Text style={styles.body}>
          Your theme is working correctly!
        </Text>
        <View style={styles.colorSwatch}>
          <View style={[styles.colorBox, { backgroundColor: colors.primary.charcoal }]} />
          <View style={[styles.colorBox, { backgroundColor: colors.accent.lavender }]} />
          <View style={[styles.colorBox, { backgroundColor: colors.secondary.sage }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: typeScale.displayLarge.fontSize,
    lineHeight: typeScale.displayLarge.lineHeight,
    fontWeight: typeScale.displayLarge.fontWeight,
    color: colors.primary.charcoal,
  },
  subtitle: {
    fontSize: typeScale.headlineMedium.fontSize,
    lineHeight: typeScale.headlineMedium.lineHeight,
    fontWeight: typeScale.headlineMedium.fontWeight,
    color: colors.accent.lavender,
    marginTop: spacing.sm,
  },
  body: {
    fontSize: typeScale.bodyLarge.fontSize,
    lineHeight: typeScale.bodyLarge.lineHeight,
    color: colors.neutral.darkGray,
    marginTop: spacing.xl,
  },
  colorSwatch: {
    flexDirection: 'row',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  colorBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
});
