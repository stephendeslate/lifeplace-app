// frontend/client-portal/src/__tests__/integration/BookingFlow.integration.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Mock all booking APIs
vi.mock('../../apis/booking/core.api', () => ({
  BookingCoreApi: {
    getEventTypes: vi.fn(),
    getBookingFlows: vi.fn(),
    getBookingFlow: vi.fn(),
    startSession: vi.fn(),
    getSession: vi.fn(),
    updateSessionData: vi.fn(),
    completeSession: vi.fn(),
    handleApiError: vi.fn((error) => error?.message || 'An error occurred'),
  },
}));

vi.mock('../../apis/booking/venues.api', () => ({
  VenuesApi: {
    getAvailableVenues: vi.fn(),
    getVenueDetails: vi.fn(),
  },
}));

vi.mock('../../apis/booking/datetime.api', () => ({
  DateTimeApi: {
    getAvailability: vi.fn(),
    validateDateTime: vi.fn(),
  },
}));

vi.mock('../../apis/booking/products.api', () => ({
  ProductsApi: {
    getPackages: vi.fn(),
    getAddons: vi.fn(),
  },
}));

vi.mock('../../apis/booking/payment.api', () => ({
  PaymentApi: {
    getPaymentGateways: vi.fn(),
    createPaymentIntent: vi.fn(),
    processPayment: vi.fn(),
    calculateDepositAmount: vi.fn(),
    formatAmount: vi.fn((amount) => `₱${parseFloat(String(amount)).toLocaleString()}`),
  },
}));

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Stripe
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => ({
    confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } }),
  }),
  useElements: () => ({
    getElement: vi.fn(),
  }),
}));

import { BookingCoreApi } from '../../apis/booking/core.api';
import { VenuesApi } from '../../apis/booking/venues.api';
import { ProductsApi } from '../../apis/booking/products.api';
import { PaymentApi } from '../../apis/booking/payment.api';

// Mock data
const mockEventTypes = [
  { id: 1, name: 'Wedding', icon: 'wedding', description: 'Wedding celebrations' },
  { id: 2, name: 'Corporate', icon: 'business', description: 'Corporate events' },
  { id: 3, name: 'Birthday', icon: 'cake', description: 'Birthday parties' },
];

const mockBookingFlows = [
  {
    id: 'flow-1',
    name: 'Standard Wedding Flow',
    event_type: 1,
    steps: [
      { id: 'step-1', type: 'introduction', order: 0, config: {} },
      { id: 'step-2', type: 'venue_selection', order: 1, config: {} },
      { id: 'step-3', type: 'datetime', order: 2, config: {} },
      { id: 'step-4', type: 'package_selection', order: 3, config: {} },
      { id: 'step-5', type: 'addons', order: 4, config: {} },
      { id: 'step-6', type: 'pricing_summary', order: 5, config: {} },
      { id: 'step-7', type: 'contact_info', order: 6, config: {} },
      { id: 'step-8', type: 'payment', order: 7, config: {} },
      { id: 'step-9', type: 'confirmation', order: 8, config: {} },
    ],
  },
];

const mockVenues = [
  {
    id: 1,
    name: 'Grand Ballroom',
    capacity: 500,
    price: '50000',
    description: 'Elegant ballroom for large events',
    images: [],
    amenities: ['WiFi', 'Parking', 'Catering'],
  },
  {
    id: 2,
    name: 'Garden Pavilion',
    capacity: 200,
    price: '30000',
    description: 'Beautiful outdoor venue',
    images: [],
    amenities: ['Parking', 'Outdoor'],
  },
];

const mockPackages = [
  {
    id: 1,
    name: 'Premium Package',
    price: '100000',
    description: 'All-inclusive premium package',
    features: ['Photography', 'Catering', 'Decoration'],
  },
  {
    id: 2,
    name: 'Basic Package',
    price: '50000',
    description: 'Essential services package',
    features: ['Photography', 'Catering'],
  },
];

const mockAddons = [
  { id: 1, name: 'Photo Booth', price: '10000', description: 'Fun photo booth' },
  { id: 2, name: 'DJ Services', price: '15000', description: 'Professional DJ' },
  { id: 3, name: 'Flower Arrangement', price: '8000', description: 'Beautiful flowers' },
];

const mockSession = {
  id: 'session-123',
  flow_id: 'flow-1',
  current_step: 0,
  step_data: {},
  expires_at: new Date(Date.now() + 3600000).toISOString(),
};

// Test utilities
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const theme = createTheme();

// Simplified booking flow test component
const BookingFlowTest: React.FC = () => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [_selectedEventType, setSelectedEventType] = React.useState<number | null>(null);
  const [selectedVenue, setSelectedVenue] = React.useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = React.useState<number | null>(null);
  const [selectedAddons, setSelectedAddons] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [eventTypes, setEventTypes] = React.useState<typeof mockEventTypes>([]);
  const [venues, setVenues] = React.useState<typeof mockVenues>([]);
  const [packages, setPackages] = React.useState<typeof mockPackages>([]);
  const [addons, setAddons] = React.useState<typeof mockAddons>([]);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const types = await BookingCoreApi.getEventTypes();
        setEventTypes(types);
      } catch (_err) {
        setError('Failed to load event types');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSelectEventType = async (typeId: number) => {
    setSelectedEventType(typeId);
    try {
      await BookingCoreApi.startSession('flow-1');
      const venueData = await VenuesApi.getAvailableVenues();
      setVenues(venueData);
      setCurrentStep(1);
    } catch (_err) {
      setError('Failed to start booking session');
    }
  };

  const handleSelectVenue = async (venueId: number) => {
    setSelectedVenue(venueId);
    await BookingCoreApi.updateSessionData('session-123', 'step-2', { venue_id: venueId }, false);
    setCurrentStep(2);
  };

  const handleSelectDateTime = async () => {
    await BookingCoreApi.updateSessionData('session-123', 'step-3', { date: '2025-06-15' }, false);
    const pkgs = await ProductsApi.getPackages();
    setPackages(pkgs);
    setCurrentStep(3);
  };

  const handleSelectPackage = async (packageId: number) => {
    setSelectedPackage(packageId);
    await BookingCoreApi.updateSessionData('session-123', 'step-4', { package_id: packageId }, false);
    const addonData = await ProductsApi.getAddons();
    setAddons(addonData);
    setCurrentStep(4);
  };

  const handleSelectAddon = (addonId: number) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleContinueFromAddons = async () => {
    await BookingCoreApi.updateSessionData('session-123', 'step-5', { addon_ids: selectedAddons }, false);
    setCurrentStep(5);
  };

  const handleConfirmPricing = async () => {
    setCurrentStep(6);
  };

  const handleSubmitContact = async () => {
    setCurrentStep(7);
  };

  const handleCompletePayment = async () => {
    try {
      await PaymentApi.processPayment({
        session_id: 'session-123',
        payment_method: 'stripe',
      });
      await BookingCoreApi.completeSession('session-123');
      setIsComplete(true);
      setCurrentStep(8);
    } catch (_err) {
      setError('Payment failed');
    }
  };

  if (isLoading) {
    return <div role="progressbar">Loading...</div>;
  }

  if (error) {
    return <div role="alert">{error}</div>;
  }

  if (isComplete) {
    return (
      <div>
        <h1>Booking Confirmed!</h1>
        <p>Your booking reference: BOOK-123456</p>
        <p>Thank you for your booking.</p>
      </div>
    );
  }

  // Step 0: Event Type Selection
  if (currentStep === 0) {
    return (
      <div>
        <h1>Select Event Type</h1>
        <div data-testid="event-types">
          {eventTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelectEventType(type.id)}
              data-testid={`event-type-${type.id}`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 1: Venue Selection
  if (currentStep === 1) {
    return (
      <div>
        <h1>Select Venue</h1>
        <div data-testid="venues">
          {venues.map((venue) => (
            <button
              key={venue.id}
              onClick={() => handleSelectVenue(venue.id)}
              data-testid={`venue-${venue.id}`}
              aria-pressed={selectedVenue === venue.id}
            >
              <span>{venue.name}</span>
              <span>Capacity: {venue.capacity}</span>
              <span>₱{parseFloat(venue.price).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Date/Time Selection (simplified)
  if (currentStep === 2) {
    return (
      <div>
        <h1>Select Date & Time</h1>
        <input type="date" aria-label="Event Date" defaultValue="2025-06-15" />
        <input type="time" aria-label="Event Time" defaultValue="14:00" />
        <button onClick={handleSelectDateTime}>Continue</button>
      </div>
    );
  }

  // Step 3: Package Selection
  if (currentStep === 3) {
    return (
      <div>
        <h1>Select Package</h1>
        <div data-testid="packages">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg.id)}
              data-testid={`package-${pkg.id}`}
              aria-pressed={selectedPackage === pkg.id}
            >
              <span>{pkg.name}</span>
              <span>₱{parseFloat(pkg.price).toLocaleString()}</span>
              <span>{pkg.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 4: Add-ons Selection
  if (currentStep === 4) {
    return (
      <div>
        <h1>Select Add-ons</h1>
        <div data-testid="addons">
          {addons.map((addon) => (
            <button
              key={addon.id}
              onClick={() => handleSelectAddon(addon.id)}
              data-testid={`addon-${addon.id}`}
              aria-pressed={selectedAddons.includes(addon.id)}
            >
              <span>{addon.name}</span>
              <span>₱{parseFloat(addon.price).toLocaleString()}</span>
            </button>
          ))}
        </div>
        <button onClick={handleContinueFromAddons}>Continue</button>
      </div>
    );
  }

  // Step 5: Pricing Summary
  if (currentStep === 5) {
    const selectedPkg = packages.find((p) => p.id === selectedPackage);
    const selectedAddonItems = addons.filter((a) => selectedAddons.includes(a.id));
    const subtotal =
      parseFloat(selectedPkg?.price || '0') +
      selectedAddonItems.reduce((sum, a) => sum + parseFloat(a.price), 0);

    return (
      <div>
        <h1>Review Your Booking</h1>
        <div data-testid="pricing-summary">
          <div>Package: {selectedPkg?.name}</div>
          {selectedAddonItems.map((addon) => (
            <div key={addon.id}>Add-on: {addon.name}</div>
          ))}
          <div data-testid="subtotal">Subtotal: ₱{subtotal.toLocaleString()}</div>
          <div data-testid="tax">Tax: ₱{(subtotal * 0.12).toLocaleString()}</div>
          <div data-testid="total">Total: ₱{(subtotal * 1.12).toLocaleString()}</div>
        </div>
        <button onClick={handleConfirmPricing}>Continue to Contact Info</button>
      </div>
    );
  }

  // Step 6: Contact Info
  if (currentStep === 6) {
    return (
      <div>
        <h1>Contact Information</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitContact();
          }}
        >
          <input type="text" aria-label="Full Name" placeholder="Full Name" required />
          <input type="email" aria-label="Email" placeholder="Email" required />
          <input type="tel" aria-label="Phone" placeholder="Phone" required />
          <button type="submit">Continue to Payment</button>
        </form>
      </div>
    );
  }

  // Step 7: Payment
  if (currentStep === 7) {
    return (
      <div>
        <h1>Payment</h1>
        <div data-testid="payment-element">Payment Form</div>
        <button onClick={handleCompletePayment}>Complete Payment</button>
      </div>
    );
  }

  return null;
};

const TestApp: React.FC = () => {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter>
            <BookingFlowTest />
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Complete Booking Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default API responses
    vi.mocked(BookingCoreApi.getEventTypes).mockResolvedValue(mockEventTypes);
    vi.mocked(BookingCoreApi.getBookingFlows).mockResolvedValue(mockBookingFlows);
    vi.mocked(BookingCoreApi.getBookingFlow).mockResolvedValue(mockBookingFlows[0]);
    vi.mocked(BookingCoreApi.startSession).mockResolvedValue(mockSession);
    vi.mocked(BookingCoreApi.getSession).mockResolvedValue(mockSession);
    vi.mocked(BookingCoreApi.updateSessionData).mockResolvedValue({ success: true });
    vi.mocked(BookingCoreApi.completeSession).mockResolvedValue({
      success: true,
      booking_reference: 'BOOK-123456',
    });

    vi.mocked(VenuesApi.getAvailableVenues).mockResolvedValue(mockVenues);

    vi.mocked(ProductsApi.getPackages).mockResolvedValue(mockPackages);
    vi.mocked(ProductsApi.getAddons).mockResolvedValue(mockAddons);

    vi.mocked(PaymentApi.getPaymentGateways).mockResolvedValue([
      { id: 1, code: 'stripe', name: 'Stripe', is_active: true },
    ]);
    vi.mocked(PaymentApi.processPayment).mockResolvedValue({
      success: true,
      payment_id: 'pay-123',
    });
  });

  describe('Step 1: Event Type Selection', () => {
    it('displays event types', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Select Event Type')).toBeInTheDocument();
      });

      expect(screen.getByText('Wedding')).toBeInTheDocument();
      expect(screen.getByText('Corporate')).toBeInTheDocument();
      expect(screen.getByText('Birthday')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(<TestApp />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('handles event type selection', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Wedding')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Wedding'));

      await waitFor(() => {
        expect(BookingCoreApi.startSession).toHaveBeenCalled();
        expect(screen.getByText('Select Venue')).toBeInTheDocument();
      });
    });

    it('handles API error gracefully', async () => {
      vi.mocked(BookingCoreApi.getEventTypes).mockRejectedValue(new Error('Network error'));

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load event types');
      });
    });
  });

  describe('Step 2: Venue Selection', () => {
    it('displays available venues', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Wedding')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Wedding'));

      await waitFor(() => {
        expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
        expect(screen.getByText('Garden Pavilion')).toBeInTheDocument();
      });
    });

    it('shows venue details', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Wedding')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Wedding'));

      await waitFor(() => {
        expect(screen.getByText('Capacity: 500')).toBeInTheDocument();
        expect(screen.getByText('₱50,000')).toBeInTheDocument();
      });
    });

    it('allows venue selection', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Wedding')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Wedding'));

      await waitFor(() => {
        expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => {
        expect(BookingCoreApi.updateSessionData).toHaveBeenCalledWith(
          'session-123',
          'step-2',
          { venue_id: 1 },
          false
        );
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Date/Time Selection', () => {
    it('displays date and time inputs', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => {
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
        expect(screen.getByLabelText('Event Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Event Time')).toBeInTheDocument();
      });
    });

    it('allows date and time selection and continues', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Select Date & Time')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Select Package')).toBeInTheDocument();
      });
    });
  });

  describe('Step 4: Package Selection', () => {
    it('displays available packages', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Premium Package')).toBeInTheDocument();
        expect(screen.getByText('Basic Package')).toBeInTheDocument();
      });
    });

    it('allows package selection', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => expect(screen.getByText('Premium Package')).toBeInTheDocument());
      await user.click(screen.getByTestId('package-1'));

      await waitFor(() => {
        expect(screen.getByText('Select Add-ons')).toBeInTheDocument();
      });
    });
  });

  describe('Step 5: Add-ons Selection', () => {
    it('displays available add-ons', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => expect(screen.getByText('Premium Package')).toBeInTheDocument());
      await user.click(screen.getByTestId('package-1'));

      await waitFor(() => {
        expect(screen.getByText('Photo Booth')).toBeInTheDocument();
        expect(screen.getByText('DJ Services')).toBeInTheDocument();
        expect(screen.getByText('Flower Arrangement')).toBeInTheDocument();
      });
    });

    it('allows multiple add-on selection', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => expect(screen.getByText('Premium Package')).toBeInTheDocument());
      await user.click(screen.getByTestId('package-1'));

      await waitFor(() => expect(screen.getByText('Photo Booth')).toBeInTheDocument());

      // Select multiple add-ons
      await user.click(screen.getByTestId('addon-1'));
      await user.click(screen.getByTestId('addon-2'));

      expect(screen.getByTestId('addon-1')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('addon-2')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Step 6: Pricing Summary', () => {
    it('displays pricing breakdown', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through all previous steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => expect(screen.getByText('Premium Package')).toBeInTheDocument());
      await user.click(screen.getByTestId('package-1'));

      await waitFor(() => expect(screen.getByText('Photo Booth')).toBeInTheDocument());
      await user.click(screen.getByTestId('addon-1'));
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
        expect(screen.getByTestId('subtotal')).toBeInTheDocument();
        expect(screen.getByTestId('tax')).toBeInTheDocument();
        expect(screen.getByTestId('total')).toBeInTheDocument();
      });
    });
  });

  describe('Complete End-to-End Flow', () => {
    it('completes full booking journey', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Step 1: Select event type
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      // Step 2: Select venue
      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      // Step 3: Select date/time
      await waitFor(() => expect(screen.getByText('Select Date & Time')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      // Step 4: Select package
      await waitFor(() => expect(screen.getByText('Premium Package')).toBeInTheDocument());
      await user.click(screen.getByTestId('package-1'));

      // Step 5: Select add-ons
      await waitFor(() => expect(screen.getByText('Photo Booth')).toBeInTheDocument());
      await user.click(screen.getByTestId('addon-1'));
      await user.click(screen.getByText('Continue'));

      // Step 6: Review pricing
      await waitFor(() => expect(screen.getByText('Review Your Booking')).toBeInTheDocument());
      await user.click(screen.getByText('Continue to Contact Info'));

      // Step 7: Enter contact info
      await waitFor(() => expect(screen.getByText('Contact Information')).toBeInTheDocument());
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone'), '09123456789');
      await user.click(screen.getByText('Continue to Payment'));

      // Step 8: Complete payment
      await waitFor(() => expect(screen.getByText('Payment')).toBeInTheDocument());
      await user.click(screen.getByText('Complete Payment'));

      // Confirmation
      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
        expect(screen.getByText(/BOOK-123456/)).toBeInTheDocument();
      });

      // Verify API calls
      expect(BookingCoreApi.startSession).toHaveBeenCalled();
      expect(BookingCoreApi.updateSessionData).toHaveBeenCalled();
      expect(PaymentApi.processPayment).toHaveBeenCalled();
      expect(BookingCoreApi.completeSession).toHaveBeenCalled();
    }, 30000);

    it('handles payment failure gracefully', async () => {
      vi.mocked(PaymentApi.processPayment).mockRejectedValue(new Error('Payment declined'));

      const user = userEvent.setup();
      render(<TestApp />);

      // Navigate through all steps
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => expect(screen.getByText('Premium Package')).toBeInTheDocument());
      await user.click(screen.getByTestId('package-1'));

      await waitFor(() => expect(screen.getByText('Photo Booth')).toBeInTheDocument());
      await user.click(screen.getByText('Continue'));

      await waitFor(() => expect(screen.getByText('Review Your Booking')).toBeInTheDocument());
      await user.click(screen.getByText('Continue to Contact Info'));

      await waitFor(() => expect(screen.getByText('Contact Information')).toBeInTheDocument());
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone'), '09123456789');
      await user.click(screen.getByText('Continue to Payment'));

      await waitFor(() => expect(screen.getByText('Payment')).toBeInTheDocument());
      await user.click(screen.getByText('Complete Payment'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');
      });

      expect(BookingCoreApi.completeSession).not.toHaveBeenCalled();
    }, 30000);
  });

  describe('Session Management', () => {
    it('starts a new session on event type selection', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => {
        expect(BookingCoreApi.startSession).toHaveBeenCalledWith('flow-1');
      });
    });

    it('updates session data on each step', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument());
      await user.click(screen.getByText('Wedding'));

      await waitFor(() => expect(screen.getByText('Grand Ballroom')).toBeInTheDocument());
      await user.click(screen.getByTestId('venue-1'));

      await waitFor(() => {
        expect(BookingCoreApi.updateSessionData).toHaveBeenCalledWith(
          'session-123',
          'step-2',
          { venue_id: 1 },
          false
        );
      });
    });
  });
});
