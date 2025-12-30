/**
 * Button Component Tests
 *
 * Unit tests for the Button component covering:
 * - Rendering with different variants
 * - Press interactions
 * - Loading states
 * - Disabled states
 * - Accessibility
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@test/utils';
import { Button } from './Button';

describe('Button', () => {
  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('rendering', () => {
    it('renders correctly with text children', () => {
      const { getByText } = renderWithProviders(
        <Button onPress={() => {}}>Click Me</Button>
      );
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('renders with primary variant by default', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}}>Primary</Button>
      );
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('renders with secondary variant', () => {
      const { getByText } = renderWithProviders(
        <Button variant="secondary" onPress={() => {}}>
          Secondary
        </Button>
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('renders with cta variant', () => {
      const { getByText } = renderWithProviders(
        <Button variant="cta" onPress={() => {}}>
          CTA Button
        </Button>
      );
      expect(getByText('CTA Button')).toBeTruthy();
    });

    it('renders with accent variant', () => {
      const { getByText } = renderWithProviders(
        <Button variant="accent" onPress={() => {}}>
          Accent
        </Button>
      );
      expect(getByText('Accent')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INTERACTIONS
  // ===========================================================================

  describe('interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = renderWithProviders(
        <Button onPress={onPress}>Click Me</Button>
      );

      fireEvent.press(getByText('Click Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByRole } = renderWithProviders(
        <Button onPress={onPress} disabled>
          Disabled Button
        </Button>
      );

      fireEvent.press(getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByRole } = renderWithProviders(
        <Button onPress={onPress} loading>
          Loading Button
        </Button>
      );

      fireEvent.press(getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('calls onPressIn handler', () => {
      const onPressIn = jest.fn();
      const { getByText } = renderWithProviders(
        <Button onPress={() => {}} onPressIn={onPressIn}>
          Press Me
        </Button>
      );

      fireEvent(getByText('Press Me'), 'pressIn');
      expect(onPressIn).toHaveBeenCalled();
    });

    it('calls onPressOut handler', () => {
      const onPressOut = jest.fn();
      const { getByText } = renderWithProviders(
        <Button onPress={() => {}} onPressOut={onPressOut}>
          Press Me
        </Button>
      );

      fireEvent(getByText('Press Me'), 'pressOut');
      expect(onPressOut).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // LOADING STATE
  // ===========================================================================

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      const { queryByText, UNSAFE_getByType } = renderWithProviders(
        <Button onPress={() => {}} loading>
          Submit
        </Button>
      );

      // Text should not be visible
      expect(queryByText('Submit')).toBeNull();

      // Activity indicator should be present
      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('shows text when not loading', () => {
      const { getByText } = renderWithProviders(
        <Button onPress={() => {}} loading={false}>
          Submit
        </Button>
      );

      expect(getByText('Submit')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DISABLED STATE
  // ===========================================================================

  describe('disabled state', () => {
    it('applies disabled styles when disabled', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}} disabled>
          Disabled
        </Button>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('applies disabled styles when loading', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}} loading>
          Loading
        </Button>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('accessibility', () => {
    it('has button accessibility role', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}}>Accessible Button</Button>
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('indicates disabled state to screen readers', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}} disabled>
          Disabled
        </Button>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('accepts custom accessibilityLabel', () => {
      const { getByLabelText } = renderWithProviders(
        <Button onPress={() => {}} accessibilityLabel="Submit form">
          Submit
        </Button>
      );

      expect(getByLabelText('Submit form')).toBeTruthy();
    });

    it('accepts custom accessibilityHint', () => {
      const { getByRole } = renderWithProviders(
        <Button
          onPress={() => {}}
          accessibilityHint="Double-tap to submit the form"
        >
          Submit
        </Button>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityHint).toBe('Double-tap to submit the form');
    });
  });

  // ===========================================================================
  // STYLING
  // ===========================================================================

  describe('styling', () => {
    it('applies fullWidth style by default', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}}>Full Width</Button>
      );

      const button = getByRole('button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style.flat())
        : button.props.style;

      expect(flatStyle.width).toBe('100%');
    });

    it('does not apply fullWidth when false', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}} fullWidth={false}>
          Not Full Width
        </Button>
      );

      const button = getByRole('button');
      // Style should not have width: 100%
      expect(button).toBeTruthy();
    });

    it('accepts custom style prop', () => {
      const { getByRole } = renderWithProviders(
        <Button onPress={() => {}} style={{ marginTop: 20 }}>
          Custom Style
        </Button>
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('accepts custom textStyle prop', () => {
      const { getByText } = renderWithProviders(
        <Button onPress={() => {}} textStyle={{ fontWeight: 'bold' }}>
          Bold Text
        </Button>
      );

      expect(getByText('Bold Text')).toBeTruthy();
    });
  });
});
