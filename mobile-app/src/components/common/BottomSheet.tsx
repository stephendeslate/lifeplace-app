/**
 * BottomSheet Component
 *
 * A reusable bottom sheet component built on @gorhom/bottom-sheet.
 * Provides a consistent modal experience across the app with native
 * gesture handling, snap points, and backdrop support.
 *
 * Features:
 * - Native swipe-to-dismiss gesture
 * - Configurable snap points
 * - Backdrop with tap-to-close
 * - Keyboard avoidance
 * - Consistent theming
 */

import React, { useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface BottomSheetProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback when the bottom sheet should close */
  onClose: () => void;
  /** Title displayed in the header */
  title?: string;
  /** Snap points as percentages or pixel values (default: ['50%', '90%']) */
  snapPoints?: (string | number)[];
  /** Initial snap point index (default: 0) */
  initialSnapIndex?: number;
  /** Whether to enable the backdrop (default: true) */
  enableBackdrop?: boolean;
  /** Whether to close on backdrop press (default: true) */
  closeOnBackdropPress?: boolean;
  /** Whether to show the close button in header (default: true) */
  showCloseButton?: boolean;
  /** Content to render inside the bottom sheet */
  children: React.ReactNode;
}

export interface BottomSheetRef {
  /** Expand the bottom sheet to the maximum snap point */
  expand: () => void;
  /** Collapse the bottom sheet to the minimum snap point */
  collapse: () => void;
  /** Close the bottom sheet */
  close: () => void;
  /** Snap to a specific index */
  snapToIndex: (index: number) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      isOpen,
      onClose,
      title,
      snapPoints: customSnapPoints,
      initialSnapIndex = 0,
      enableBackdrop = true,
      closeOnBackdropPress = true,
      showCloseButton = true,
      children,
    },
    ref
  ) => {
    const bottomSheetRef = useRef<GorhomBottomSheet>(null);

    // Default snap points
    const snapPoints = useMemo(
      () => customSnapPoints || ['50%', '90%'],
      [customSnapPoints]
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      expand: () => bottomSheetRef.current?.expand(),
      collapse: () => bottomSheetRef.current?.collapse(),
      close: () => bottomSheetRef.current?.close(),
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
    }));

    // Handle sheet changes
    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose();
        }
      },
      [onClose]
    );

    // Render backdrop
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => {
        if (!enableBackdrop) return null;

        return (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
            pressBehavior={closeOnBackdropPress ? 'close' : 'none'}
          />
        );
      },
      [enableBackdrop, closeOnBackdropPress]
    );

    // Handle close button press
    const handleClosePress = useCallback(() => {
      bottomSheetRef.current?.close();
    }, []);

    // Don't render if not open
    if (!isOpen) {
      return null;
    }

    return (
      <GorhomBottomSheet
        ref={bottomSheetRef}
        index={initialSnapIndex}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.background}
        style={styles.container}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {showCloseButton && (
              <Pressable
                onPress={handleClosePress}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.neutral.darkGray} weight="bold" />
              </Pressable>
            )}
          </View>
        )}

        {/* Content */}
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    ...shadows.lg,
  },
  background: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: colors.neutral.warmGray,
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  title: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    flex: 1,
    marginRight: spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.neutral.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
