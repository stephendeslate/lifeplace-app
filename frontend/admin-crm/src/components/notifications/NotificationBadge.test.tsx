import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { NotificationBadge } from './NotificationBadge';

describe('NotificationBadge', () => {
  it('renders the notification bell icon button', () => {
    renderWithProviders(<NotificationBadge />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('shows badge count when there are unread notifications from MSW', async () => {
    renderWithProviders(<NotificationBadge />);
    // MSW returns mock notification counts; wait for data to load
    await waitFor(
      () => {
        // Badge is visible and shows a count (not invisible)
        const badge = document.querySelector('.MuiBadge-badge:not(.MuiBadge-invisible)');
        expect(badge).not.toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it('opens notification menu when icon button is clicked', async () => {
    renderWithProviders(<NotificationBadge />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('shows View All Notifications button when menu is opened', async () => {
    renderWithProviders(<NotificationBadge />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view all notifications/i })).toBeInTheDocument();
    });
  });

  it('shows unread notification count in the menu header', async () => {
    renderWithProviders(<NotificationBadge />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      // The menu shows "X unread of Y total"
      expect(screen.getByText(/unread of/i)).toBeInTheDocument();
    });
  });

  it('shows Mark All Read button when there are unread notifications', async () => {
    renderWithProviders(<NotificationBadge />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
    });
  });
});
