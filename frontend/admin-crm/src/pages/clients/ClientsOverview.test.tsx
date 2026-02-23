import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { ClientsOverview } from './ClientsOverview';

describe('ClientsOverview', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<ClientsOverview />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('renders Clients page heading', async () => {
    renderWithProviders(<ClientsOverview />);
    await waitFor(
      () => {
        expect(screen.getByText(/^clients$/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders New Client button', async () => {
    renderWithProviders(<ClientsOverview />);
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /add client/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders search input', async () => {
    renderWithProviders(<ClientsOverview />);
    await waitFor(
      () => {
        const searchInput =
          screen.queryByPlaceholderText(/search/i) || document.querySelector('input[type="text"]');
        expect(searchInput).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
