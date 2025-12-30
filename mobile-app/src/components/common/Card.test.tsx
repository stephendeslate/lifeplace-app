/**
 * Card Component Tests
 */

import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@test/utils';
import { Card } from './Card';

describe('Card', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = renderWithProviders(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = renderWithProviders(
        <Card testID="test-card">
          <Text>Content</Text>
        </Card>
      );
      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('renders with default variant', () => {
      const { getByTestId } = renderWithProviders(
        <Card testID="card">
          <Text>Default Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('renders with elevated variant', () => {
      const { getByTestId } = renderWithProviders(
        <Card variant="elevated" testID="card">
          <Text>Elevated Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('renders with outlined variant', () => {
      const { getByTestId } = renderWithProviders(
        <Card variant="outlined" testID="card">
          <Text>Outlined Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('renders with filled variant', () => {
      const { getByTestId } = renderWithProviders(
        <Card variant="filled" testID="card">
          <Text>Filled Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProviders(
        <Card onPress={onPress} testID="card">
          <Text>Pressable Card</Text>
        </Card>
      );

      fireEvent.press(getByTestId('card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProviders(
        <Card onPress={onPress} disabled testID="card">
          <Text>Disabled Card</Text>
        </Card>
      );

      fireEvent.press(getByTestId('card'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('renders as non-pressable View when no onPress', () => {
      const { getByTestId } = renderWithProviders(
        <Card testID="card">
          <Text>Static Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('accepts custom style prop', () => {
      const { getByTestId } = renderWithProviders(
        <Card style={{ margin: 10 }} testID="card">
          <Text>Styled Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('accepts custom contentStyle prop', () => {
      const { getByTestId } = renderWithProviders(
        <Card contentStyle={{ padding: 20 }} testID="card">
          <Text>Content Styled Card</Text>
        </Card>
      );
      expect(getByTestId('card')).toBeTruthy();
    });
  });
});
