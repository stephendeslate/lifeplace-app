import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { TasksPage } from './TasksPage';

describe('TasksPage', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<TasksPage />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('renders Tasks heading', async () => {
    renderWithProviders(<TasksPage />);
    await waitFor(
      () => {
        expect(screen.getByText(/^tasks$/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders tab navigation', async () => {
    renderWithProviders(<TasksPage />);
    await waitFor(
      () => {
        const tabs = document.querySelector('[role="tablist"]');
        expect(tabs).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders All Tasks tab', async () => {
    renderWithProviders(<TasksPage />);
    await waitFor(
      () => {
        // Tab for all tasks or a specific domain
        const allTab =
          screen.queryByRole('tab', { name: /all/i }) ||
          screen.queryByRole('tab', { name: /quotes/i }) ||
          screen.queryByRole('tab', { name: /contracts/i });
        expect(allTab).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
