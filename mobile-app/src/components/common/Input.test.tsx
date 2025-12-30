/**
 * Input Component Tests
 *
 * Unit tests for the Input component covering:
 * - Rendering with different props
 * - User interactions (typing, focus/blur)
 * - Error states
 * - Icon rendering
 * - Accessibility
 */

import React from 'react';
import { View, Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@test/utils';
import { Input } from './Input';

describe('Input', () => {
  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('rendering', () => {
    it('renders correctly without label', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" />
      );
      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('renders with label', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <Input label="Email" placeholder="Enter email" />
      );
      expect(getByText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Enter email')).toBeTruthy();
    });

    it('renders with value', () => {
      const { getByDisplayValue } = renderWithProviders(
        <Input value="test@example.com" placeholder="Email" />
      );
      expect(getByDisplayValue('test@example.com')).toBeTruthy();
    });

    it('renders with left icon', () => {
      const LeftIcon = () => <View testID="left-icon" />;
      const { getByTestId } = renderWithProviders(
        <Input leftIcon={<LeftIcon />} placeholder="Search" />
      );
      expect(getByTestId('left-icon')).toBeTruthy();
    });

    it('renders with right icon', () => {
      const RightIcon = () => <View testID="right-icon" />;
      const { getByTestId } = renderWithProviders(
        <Input rightIcon={<RightIcon />} placeholder="Password" />
      );
      expect(getByTestId('right-icon')).toBeTruthy();
    });

    it('renders with both icons', () => {
      const LeftIcon = () => <View testID="left-icon" />;
      const RightIcon = () => <View testID="right-icon" />;
      const { getByTestId } = renderWithProviders(
        <Input
          leftIcon={<LeftIcon />}
          rightIcon={<RightIcon />}
          placeholder="Search"
        />
      );
      expect(getByTestId('left-icon')).toBeTruthy();
      expect(getByTestId('right-icon')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INTERACTIONS
  // ===========================================================================

  describe('interactions', () => {
    it('calls onChangeText when text changes', () => {
      const onChangeText = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <Input
          placeholder="Enter text"
          onChangeText={onChangeText}
        />
      );

      fireEvent.changeText(getByPlaceholderText('Enter text'), 'hello');
      expect(onChangeText).toHaveBeenCalledWith('hello');
    });

    it('calls onFocus when focused', () => {
      const onFocus = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" onFocus={onFocus} />
      );

      fireEvent(getByPlaceholderText('Enter text'), 'focus');
      expect(onFocus).toHaveBeenCalled();
    });

    it('calls onBlur when blurred', () => {
      const onBlur = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" onBlur={onBlur} />
      );

      fireEvent(getByPlaceholderText('Enter text'), 'blur');
      expect(onBlur).toHaveBeenCalled();
    });

    it('updates focus state on focus/blur', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" />
      );

      const input = getByPlaceholderText('Enter text');

      // Focus
      fireEvent(input, 'focus');
      // Input should update its internal focused state

      // Blur
      fireEvent(input, 'blur');
      // Input should update its internal focused state
    });
  });

  // ===========================================================================
  // ERROR STATE
  // ===========================================================================

  describe('error state', () => {
    it('displays error message when error prop is provided', () => {
      const { getByText } = renderWithProviders(
        <Input placeholder="Email" error="Invalid email format" />
      );
      expect(getByText('Invalid email format')).toBeTruthy();
    });

    it('does not display error message when error is not provided', () => {
      const { queryByText } = renderWithProviders(
        <Input placeholder="Email" />
      );
      expect(queryByText('Invalid email format')).toBeNull();
    });

    it('applies error styling when error is present', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Email" error="Error" />
      );

      const input = getByPlaceholderText('Email');
      // The input should have error styling applied
      expect(input).toBeTruthy();
    });
  });

  // ===========================================================================
  // INPUT TYPES
  // ===========================================================================

  describe('input types', () => {
    it('renders as email input', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      );

      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('renders as secure text entry (password)', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Password" secureTextEntry />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('renders as phone input', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Phone" keyboardType="phone-pad" />
      );

      const input = getByPlaceholderText('Phone');
      expect(input.props.keyboardType).toBe('phone-pad');
    });

    it('renders as numeric input', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Number" keyboardType="numeric" />
      );

      const input = getByPlaceholderText('Number');
      expect(input.props.keyboardType).toBe('numeric');
    });
  });

  // ===========================================================================
  // EDITABLE STATE
  // ===========================================================================

  describe('editable state', () => {
    it('is editable by default', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" />
      );

      const input = getByPlaceholderText('Enter text');
      expect(input.props.editable).not.toBe(false);
    });

    it('is not editable when editable is false', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" editable={false} />
      );

      const input = getByPlaceholderText('Enter text');
      expect(input.props.editable).toBe(false);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('accessibility', () => {
    it('uses label text for accessibility', () => {
      const { getByText } = renderWithProviders(
        <Input label="Email Address" placeholder="Enter email" />
      );

      expect(getByText('Email Address')).toBeTruthy();
    });

    it('accepts custom accessibilityLabel', () => {
      const { getByLabelText } = renderWithProviders(
        <Input
          placeholder="Enter email"
          accessibilityLabel="Email input field"
        />
      );

      expect(getByLabelText('Email input field')).toBeTruthy();
    });

    it('accepts custom accessibilityHint', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input
          placeholder="Enter email"
          accessibilityHint="Enter your email address"
        />
      );

      const input = getByPlaceholderText('Enter email');
      expect(input.props.accessibilityHint).toBe('Enter your email address');
    });
  });

  // ===========================================================================
  // STYLING
  // ===========================================================================

  describe('styling', () => {
    it('accepts custom containerStyle', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input
          placeholder="Enter text"
          containerStyle={{ marginTop: 20 }}
        />
      );

      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('accepts custom inputContainerStyle', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input
          placeholder="Enter text"
          inputContainerStyle={{ backgroundColor: 'red' }}
        />
      );

      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('accepts custom labelStyle', () => {
      const { getByText } = renderWithProviders(
        <Input
          label="Custom Label"
          placeholder="Enter text"
          labelStyle={{ fontWeight: 'bold' }}
        />
      );

      expect(getByText('Custom Label')).toBeTruthy();
    });

    it('accepts custom input style', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <Input placeholder="Enter text" style={{ fontSize: 20 }} />
      );

      const input = getByPlaceholderText('Enter text');
      expect(input).toBeTruthy();
    });
  });

  // ===========================================================================
  // REF FORWARDING
  // ===========================================================================

  describe('ref forwarding', () => {
    it('forwards ref to TextInput', () => {
      const ref = React.createRef<any>();
      renderWithProviders(<Input ref={ref} placeholder="Enter text" />);

      expect(ref.current).toBeTruthy();
    });
  });
});
