import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { PaymentsOverview } from './PaymentsOverview';

describe('PaymentsOverview', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<PaymentsOverview />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('renders Payments page heading', async () => {
    renderWithProviders(<PaymentsOverview />);
    await waitFor(
      () => {
        expect(screen.getByText(/^payments$/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders New Payment button', async () => {
    renderWithProviders(<PaymentsOverview />);
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /add payment/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
