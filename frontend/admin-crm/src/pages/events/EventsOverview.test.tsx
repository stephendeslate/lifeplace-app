import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { EventsOverview } from './EventsOverview';

describe('EventsOverview', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<EventsOverview />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('renders Events page heading', async () => {
    renderWithProviders(<EventsOverview />);
    await waitFor(
      () => {
        expect(screen.getByText(/^events$/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders New Event button', async () => {
    renderWithProviders(<EventsOverview />);
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /add event/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders search input', async () => {
    renderWithProviders(<EventsOverview />);
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
