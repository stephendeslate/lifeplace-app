/**
 * Test Utilities Index
 *
 * Central export point for all testing utilities.
 */

// Render utilities
export {
  renderWithProviders,
  renderWithProviders as render,
  createHookWrapper,
  waitForQueryToSettle,
} from './renderWithProviders';

// Re-export React Native Testing Library
export * from '@testing-library/react-native';

// Mock data
export * from './mockData';

// Test IDs
export { TEST_IDS, testId, type TestId } from './testIds';

// Accessibility helpers
export {
  checkA11y,
  checkTouchTargetSize,
  assertNoA11yViolations,
  assertInteractiveA11y,
  isFocusable,
  getAccessibleName,
  A11Y_REQUIREMENTS,
  A11Y_MIN_TOUCH_TARGET,
  A11Y_MIN_CONTRAST_NORMAL,
  A11Y_MIN_CONTRAST_LARGE,
  getRelativeLuminance,
  getContrastRatio,
  meetsContrastRequirements,
  type A11yCheckResult,
  type TouchTargetResult,
} from './a11yHelpers';
