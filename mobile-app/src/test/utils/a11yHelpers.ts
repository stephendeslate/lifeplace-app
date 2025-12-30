/**
 * Accessibility Testing Helpers
 *
 * Utilities for testing accessibility compliance in React Native components.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum touch target size per WCAG 2.5.5 (44x44 points) */
export const A11Y_MIN_TOUCH_TARGET = 44;

/** Minimum contrast ratio for normal text (WCAG AA) */
export const A11Y_MIN_CONTRAST_NORMAL = 4.5;

/** Minimum contrast ratio for large text (WCAG AA) */
export const A11Y_MIN_CONTRAST_LARGE = 3;

// =============================================================================
// TYPES
// =============================================================================

export interface A11yCheckResult {
  hasAccessibilityLabel: boolean;
  hasAccessibilityRole: boolean;
  hasAccessibilityHint: boolean;
  isAccessible: boolean;
  issues: string[];
}

export interface TouchTargetResult {
  meetsMinimumSize: boolean;
  actualWidth: number;
  actualHeight: number;
  issues: string[];
}

// =============================================================================
// ELEMENT CHECKS
// =============================================================================

/**
 * Check accessibility properties of a React Native element.
 */
export function checkA11y(element: {
  props?: {
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityHint?: string;
    accessible?: boolean;
    role?: string;
    'aria-label'?: string;
    onPress?: () => void;
    onLongPress?: () => void;
    children?: React.ReactNode;
  };
}): A11yCheckResult {
  const props = element.props || {};
  const issues: string[] = [];

  const hasAccessibilityLabel = !!(
    props.accessibilityLabel || props['aria-label']
  );
  const hasAccessibilityRole = !!(props.accessibilityRole || props.role);
  const hasAccessibilityHint = !!props.accessibilityHint;
  const isAccessible = props.accessible !== false;

  // Check for missing accessibility label on non-text elements
  if (
    !hasAccessibilityLabel &&
    props.children &&
    typeof props.children !== 'string'
  ) {
    issues.push('Missing accessibilityLabel for non-text element');
  }

  // Check for missing role on interactive elements
  if (!hasAccessibilityRole && (props.onPress || props.onLongPress)) {
    issues.push('Interactive element missing accessibilityRole');
  }

  return {
    hasAccessibilityLabel,
    hasAccessibilityRole,
    hasAccessibilityHint,
    isAccessible,
    issues,
  };
}

/**
 * Check if touch target meets minimum size requirements.
 */
export function checkTouchTargetSize(
  width: number,
  height: number
): TouchTargetResult {
  const issues: string[] = [];
  const meetsMinimumSize =
    width >= A11Y_MIN_TOUCH_TARGET && height >= A11Y_MIN_TOUCH_TARGET;

  if (width < A11Y_MIN_TOUCH_TARGET) {
    issues.push(
      `Touch target width (${width}px) is below minimum (${A11Y_MIN_TOUCH_TARGET}px)`
    );
  }

  if (height < A11Y_MIN_TOUCH_TARGET) {
    issues.push(
      `Touch target height (${height}px) is below minimum (${A11Y_MIN_TOUCH_TARGET}px)`
    );
  }

  return {
    meetsMinimumSize,
    actualWidth: width,
    actualHeight: height,
    issues,
  };
}

// =============================================================================
// TEST ASSERTIONS
// =============================================================================

/**
 * Assert that an element has no accessibility violations.
 * Throws an error if violations are found.
 */
export function assertNoA11yViolations(element: {
  props?: Record<string, unknown>;
}): void {
  const result = checkA11y(element as Parameters<typeof checkA11y>[0]);

  if (result.issues.length > 0) {
    throw new Error(`Accessibility violations found:\n${result.issues.join('\n')}`);
  }
}

/**
 * Assert that an interactive element has proper accessibility setup.
 */
export function assertInteractiveA11y(element: {
  props?: Record<string, unknown>;
}): void {
  const props = element.props || {};

  if (!props.accessibilityLabel && !props['aria-label']) {
    throw new Error('Interactive element must have an accessibility label');
  }

  if (!props.accessibilityRole && !props.role) {
    throw new Error('Interactive element must have an accessibility role');
  }
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Check if an element is focusable (has accessibility properties).
 */
export function isFocusable(element: {
  props?: {
    accessible?: boolean;
    focusable?: boolean;
    onPress?: () => void;
    accessibilityRole?: string;
  };
}): boolean {
  const props = element.props || {};

  // Explicitly not accessible
  if (props.accessible === false) {
    return false;
  }

  // Has interactive role
  const interactiveRoles = [
    'button',
    'link',
    'checkbox',
    'radio',
    'switch',
    'slider',
    'spinbutton',
    'combobox',
    'textbox',
  ];

  if (
    props.accessibilityRole &&
    interactiveRoles.includes(props.accessibilityRole)
  ) {
    return true;
  }

  // Has onPress handler
  if (props.onPress) {
    return true;
  }

  // Explicitly focusable
  if (props.focusable === true) {
    return true;
  }

  return false;
}

/**
 * Get the accessible name of an element (label + hint).
 */
export function getAccessibleName(element: {
  props?: {
    accessibilityLabel?: string;
    accessibilityHint?: string;
    'aria-label'?: string;
    children?: React.ReactNode;
  };
}): string {
  const props = element.props || {};

  let name = props.accessibilityLabel || props['aria-label'] || '';

  // If no explicit label, try to get text content
  if (!name && typeof props.children === 'string') {
    name = props.children;
  }

  // Append hint if available
  if (props.accessibilityHint) {
    name = name ? `${name}, ${props.accessibilityHint}` : props.accessibilityHint;
  }

  return name;
}

// =============================================================================
// ACCESSIBILITY CHECKLIST
// =============================================================================

/**
 * Common accessibility requirements for different component types.
 */
export const A11Y_REQUIREMENTS = {
  button: {
    requiredProps: ['accessibilityRole', 'accessibilityLabel'],
    role: 'button',
    minTouchTarget: A11Y_MIN_TOUCH_TARGET,
  },
  textInput: {
    requiredProps: ['accessibilityLabel'],
    role: 'textbox',
    shouldHaveLabel: true,
  },
  image: {
    requiredProps: ['accessibilityLabel'],
    decorativeAllowed: true, // can use accessible={false}
  },
  link: {
    requiredProps: ['accessibilityRole', 'accessibilityLabel'],
    role: 'link',
    shouldHaveHint: true, // hint about where link goes
  },
  checkbox: {
    requiredProps: ['accessibilityRole', 'accessibilityLabel', 'accessibilityState'],
    role: 'checkbox',
    stateRequired: ['checked'],
  },
  switch: {
    requiredProps: ['accessibilityRole', 'accessibilityLabel', 'accessibilityValue'],
    role: 'switch',
    valueRequired: true,
  },
} as const;

// =============================================================================
// COLOR CONTRAST (BASIC)
// =============================================================================

/**
 * Calculate relative luminance of a color (simplified).
 * For production, use a proper color library.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLum =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLum =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLum =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * Calculate contrast ratio between two colors.
 */
export function getContrastRatio(
  lum1: number,
  lum2: number
): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA requirements.
 */
export function meetsContrastRequirements(
  ratio: number,
  isLargeText: boolean = false
): boolean {
  const minimumRatio = isLargeText ? A11Y_MIN_CONTRAST_LARGE : A11Y_MIN_CONTRAST_NORMAL;
  return ratio >= minimumRatio;
}
