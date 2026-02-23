import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { NotificationsPage } from './NotificationsPage';

describe('NotificationsPage', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<NotificationsPage />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('renders Notifications heading', async () => {
    renderWithProviders(<NotificationsPage />);
    await waitFor(
      () => {
        // Multiple elements may have text "Notifications" (heading + tabs)
        const matches = screen.getAllByText(/^notifications$/i);
        expect(matches.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  });

  it('renders tab navigation', async () => {
    renderWithProviders(<NotificationsPage />);
    await waitFor(
      () => {
        const tabs = document.querySelector('[role="tablist"]');
        expect(tabs).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders Mark All Read button', async () => {
    renderWithProviders(<NotificationsPage />);
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
