// frontend/client-portal/src/test/mocks/stripe.ts
import { vi } from 'vitest';

/**
 * Mock Stripe Element for testing
 */
export const mockElement = {
  mount: vi.fn(),
  unmount: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  update: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  clear: vi.fn(),
};

/**
 * Mock Stripe Elements instance
 */
export const mockElements = {
  create: vi.fn(() => mockElement),
  getElement: vi.fn(() => mockElement),
  update: vi.fn(),
  fetchUpdates: vi.fn(() => Promise.resolve({ error: undefined })),
};

/**
 * Mock Stripe instance
 */
export const mockStripe = {
  elements: vi.fn(() => mockElements),
  createToken: vi.fn(() => Promise.resolve({ token: { id: 'tok_test' } })),
  createSource: vi.fn(() => Promise.resolve({ source: { id: 'src_test' } })),
  createPaymentMethod: vi.fn(() =>
    Promise.resolve({ paymentMethod: { id: 'pm_test' } })
  ),
  confirmCardPayment: vi.fn(() =>
    Promise.resolve({ paymentIntent: { status: 'succeeded', id: 'pi_test' } })
  ),
  confirmPayment: vi.fn(() =>
    Promise.resolve({ paymentIntent: { status: 'succeeded', id: 'pi_test' } })
  ),
  confirmCardSetup: vi.fn(() =>
    Promise.resolve({ setupIntent: { status: 'succeeded', id: 'seti_test' } })
  ),
  confirmSetup: vi.fn(() =>
    Promise.resolve({ setupIntent: { status: 'succeeded', id: 'seti_test' } })
  ),
  retrievePaymentIntent: vi.fn(() =>
    Promise.resolve({ paymentIntent: { status: 'succeeded', id: 'pi_test' } })
  ),
  handleCardAction: vi.fn(() =>
    Promise.resolve({ paymentIntent: { status: 'succeeded', id: 'pi_test' } })
  ),
};

/**
 * Reset all Stripe mocks
 */
export const resetStripeMocks = () => {
  mockElement.mount.mockClear();
  mockElement.unmount.mockClear();
  mockElement.destroy.mockClear();
  mockElement.on.mockClear();
  mockElement.off.mockClear();
  mockElement.update.mockClear();

  mockElements.create.mockClear();
  mockElements.getElement.mockClear();
  mockElements.update.mockClear();

  mockStripe.elements.mockClear();
  mockStripe.createToken.mockClear();
  mockStripe.createPaymentMethod.mockClear();
  mockStripe.confirmCardPayment.mockClear();
  mockStripe.confirmPayment.mockClear();
  mockStripe.confirmCardSetup.mockClear();
  mockStripe.confirmSetup.mockClear();
  mockStripe.retrievePaymentIntent.mockClear();
  mockStripe.handleCardAction.mockClear();
};

/**
 * Configure Stripe to return an error
 */
export const mockStripeError = (errorMessage: string) => {
  const errorResponse = {
    error: { message: errorMessage, type: 'card_error' },
    paymentIntent: undefined,
  };
  mockStripe.confirmPayment.mockResolvedValueOnce(errorResponse as never);
  mockStripe.confirmCardPayment.mockResolvedValueOnce(errorResponse as never);
};

/**
 * Configure Stripe to require additional action (3D Secure)
 */
export const mockStripeRequiresAction = () => {
  mockStripe.confirmPayment.mockResolvedValueOnce({
    paymentIntent: { status: 'requires_action', id: 'pi_test' },
  });
  mockStripe.confirmCardPayment.mockResolvedValueOnce({
    paymentIntent: { status: 'requires_action', id: 'pi_test' },
  });
};
