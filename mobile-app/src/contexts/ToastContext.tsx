/**
 * Toast Context
 *
 * Global toast notification system for the app.
 *
 * KEY CONCEPTS:
 * - Animated toasts slide in from top
 * - Auto-dismiss after a configurable duration
 * - Different styles for success, error, warning, info
 * - Uses react-native-reanimated for smooth animations
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle,
  XCircle,
  Warning,
  Info,
  X,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows, colorScales } from '@/theme';

// =============================================================================
// TYPES
// =============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_DURATION = 4000; // 4 seconds

const TOAST_COLORS: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: colors.secondary.forestSubtle, icon: colors.secondary.forest },
  error: { bg: colorScales.error[50], icon: colors.semantic.error },
  warning: { bg: colorScales.warning[50], icon: colors.semantic.warning },
  info: { bg: colors.tertiary.tealSubtle, icon: colors.semantic.info },
};

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: Warning,
  info: Info,
};

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// =============================================================================
// TOAST COMPONENT
// =============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const Icon = TOAST_ICONS[toast.type];
  const toastColors = TOAST_COLORS[toast.type];

  // Animate in on mount
  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 200 });

    // Auto dismiss
    const timer = setTimeout(() => {
      dismissToast();
    }, toast.duration || DEFAULT_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const dismissToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)(toast.id);
    });
  }, [toast.id, onDismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        { marginTop: insets.top + spacing.sm, backgroundColor: toastColors.bg },
        animatedStyle,
      ]}
    >
      <Icon size={24} color={toastColors.icon} weight="fill" />
      <Text style={styles.toastMessage} numberOfLines={2}>
        {toast.message}
      </Text>
      <Pressable
        onPress={dismissToast}
        style={styles.dismissButton}
        hitSlop={8}
      >
        <X size={18} color={colors.neutral.darkGray} />
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// PROVIDER
// =============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = Date.now().toString();
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, hideToast }),
    [showToast, hideToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Use this hook to show toast notifications.
 *
 * USAGE:
 * const { showToast } = useToast();
 * showToast('Operation successful!', 'success');
 * showToast('Something went wrong', 'error');
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  } as ViewStyle,
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
    maxWidth: 400,
    width: '90%',
  } as ViewStyle,
  toastMessage: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  dismissButton: {
    padding: spacing.xxs,
  },
});
