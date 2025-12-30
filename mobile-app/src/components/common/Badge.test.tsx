/**
 * Badge Component Tests
 */

import React from 'react';
import { View } from 'react-native';
import { renderWithProviders } from '@test/utils';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      const { getByText } = renderWithProviders(<Badge label="Active" />);
      expect(getByText('Active')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = renderWithProviders(
        <Badge label="Status" testID="status-badge" />
      );
      expect(getByTestId('status-badge')).toBeTruthy();
    });

    it('renders with icon', () => {
      const Icon = () => <View testID="badge-icon" />;
      const { getByTestId } = renderWithProviders(
        <Badge label="With Icon" icon={<Icon />} />
      );
      expect(getByTestId('badge-icon')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Default" variant="default" />
      );
      expect(getByText('Default')).toBeTruthy();
    });

    it('renders primary variant', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Primary" variant="primary" />
      );
      expect(getByText('Primary')).toBeTruthy();
    });

    it('renders success variant', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Success" variant="success" />
      );
      expect(getByText('Success')).toBeTruthy();
    });

    it('renders warning variant', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Warning" variant="warning" />
      );
      expect(getByText('Warning')).toBeTruthy();
    });

    it('renders error variant', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Error" variant="error" />
      );
      expect(getByText('Error')).toBeTruthy();
    });

    it('renders info variant', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Info" variant="info" />
      );
      expect(getByText('Info')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Small" size="small" />
      );
      expect(getByText('Small')).toBeTruthy();
    });

    it('renders medium size (default)', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Medium" size="medium" />
      );
      expect(getByText('Medium')).toBeTruthy();
    });

    it('renders large size', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Large" size="large" />
      );
      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('accepts custom style prop', () => {
      const { getByTestId } = renderWithProviders(
        <Badge label="Custom" style={{ margin: 10 }} testID="badge" />
      );
      expect(getByTestId('badge')).toBeTruthy();
    });
  });
});
