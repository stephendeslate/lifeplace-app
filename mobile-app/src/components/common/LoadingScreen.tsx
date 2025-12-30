import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typeScale } from '@/theme';

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.black} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});

export default LoadingScreen;
