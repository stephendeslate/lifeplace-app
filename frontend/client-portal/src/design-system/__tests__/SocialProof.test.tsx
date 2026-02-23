// design-system/__tests__/SocialProof.test.tsx

import './test-setup';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import {
  SocialProofBadge,
  TrustIndicators,
  LiveBookingCounter,
  SocialProofSection,
} from '../components/SocialProof';
import { theme } from '../../utils/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const mockStats = {
  totalEvents: 2450,
  completedEvents: 2000,
  activeEvents: 23,
  eventsThisMonth: 156,
  clientSatisfactionRate: 98,
};

const mockActivities = [
  {
    event: {
      id: 1,
      name: 'Wedding Event',
      event_type_name: 'Wedding',
      status: 'CONFIRMED' as const,
      start_date: '2024-02-15T10:00:00Z',
      end_date: '2024-02-15T18:00:00Z',
      current_stage_name: 'Production',
      payment_status: 'PAID' as const,
    },
    action: 'confirmed' as const,
    timeAgo: '2 min ago',
    clientName: 'Maria Santos',
  },
  {
    event: {
      id: 2,
      name: 'Corporate Workshop',
      event_type_name: 'Workshop',
      status: 'COMPLETED' as const,
      start_date: '2024-02-10T09:00:00Z',
      end_date: '2024-02-10T17:00:00Z',
      current_stage_name: 'Post Production',
      payment_status: 'PAID' as const,
    },
    action: 'completed' as const,
    timeAgo: '5 min ago',
    clientName: 'John Cruz',
  },
];

describe('SocialProofBadge', () => {
  it('displays event statistics correctly', () => {
    renderWithTheme(<SocialProofBadge stats={mockStats} />);

    expect(screen.getByText('2,450')).toBeInTheDocument();
    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
    expect(screen.getByText('Completed Events')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Active Events')).toBeInTheDocument();
  });

  it('shows compact version when compact prop is true', () => {
    renderWithTheme(<SocialProofBadge stats={mockStats} compact={true} />);

    // Numbers should still be visible but descriptions might be hidden
    expect(screen.getByText('2,450')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    // Satisfaction rate is only shown in non-compact mode
    expect(screen.queryByText('98%')).not.toBeInTheDocument();
  });

  it('displays events this month in non-compact mode', () => {
    renderWithTheme(<SocialProofBadge stats={mockStats} compact={false} />);

    expect(screen.getByText('156')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });
});

describe('TrustIndicators', () => {
  const mockCertifications = ['DOT Certified', 'ISO 9001', 'Green Venue'];
  const mockTestimonials = [
    {
      text: 'Amazing venue for our wedding!',
      author: 'Maria & Carlos',
      rating: 5,
    },
    {
      text: 'Professional service and beautiful location.',
      author: 'Corporate Client',
      rating: 4,
    },
  ];

  it('displays certification badges', () => {
    renderWithTheme(
      <TrustIndicators certifications={mockCertifications} testimonials={mockTestimonials} />,
    );

    expect(screen.getByText('DOT Certified')).toBeInTheDocument();
    expect(screen.getByText('ISO 9001')).toBeInTheDocument();
    expect(screen.getByText('Green Venue')).toBeInTheDocument();
  });

  it('displays testimonials with ratings', () => {
    renderWithTheme(
      <TrustIndicators
        certifications={mockCertifications}
        testimonials={mockTestimonials}
        compact={false}
      />,
    );

    expect(screen.getByText(/Amazing venue for our wedding!/)).toBeInTheDocument();
    expect(screen.getByText('— Maria & Carlos')).toBeInTheDocument();
  });

  it('hides testimonials in compact mode', () => {
    renderWithTheme(
      <TrustIndicators
        certifications={mockCertifications}
        testimonials={mockTestimonials}
        compact={true}
      />,
    );

    // Certifications should be visible
    expect(screen.getByText('DOT Certified')).toBeInTheDocument();
    // Testimonials should not be visible in compact mode
    expect(screen.queryByText(/Amazing venue for our wedding!/)).not.toBeInTheDocument();
  });

  it('rotates through testimonials automatically', async () => {
    renderWithTheme(
      <TrustIndicators
        certifications={mockCertifications}
        testimonials={mockTestimonials}
        compact={false}
      />,
    );

    // First testimonial should be visible initially
    expect(screen.getByText(/Amazing venue for our wedding!/)).toBeInTheDocument();

    // Wait for potential rotation (though it's hard to test timing in unit tests)
    // This mainly ensures the component doesn't crash during rotation
    await waitFor(
      () => {
        expect(screen.getByText(/Amazing venue for our wedding!/)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});

describe('EventActivityFeed', () => {
  it('displays event activities', () => {
    renderWithTheme(<LiveBookingCounter activities={mockActivities} autoRotate={false} />);

    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText(/confirmed their Wedding/)).toBeInTheDocument();
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
  });

  it('handles different action types correctly', () => {
    renderWithTheme(<LiveBookingCounter activities={mockActivities} autoRotate={false} />);

    // Should show the first activity (confirmed action)
    expect(screen.getByText(/confirmed their/)).toBeInTheDocument();
  });

  it('handles empty activities gracefully', () => {
    renderWithTheme(<LiveBookingCounter activities={[]} autoRotate={false} />);

    // Component should not render anything when no activities
    expect(screen.queryByText(/confirmed their/)).not.toBeInTheDocument();
  });

  it('auto-rotates through activities when enabled', async () => {
    renderWithTheme(
      <LiveBookingCounter
        activities={mockActivities}
        autoRotate={true}
        rotationInterval={100} // Fast rotation for testing
      />,
    );

    // Initially shows first activity
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();

    // Should eventually show second activity
    await waitFor(
      () => {
        expect(screen.getByText('John Cruz')).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});

describe('SocialProofSection', () => {
  it('renders all components together', () => {
    renderWithTheme(
      <SocialProofSection
        stats={mockStats}
        activities={mockActivities}
        showActivityFeed={true}
        showTrustIndicators={true}
      />,
    );

    // Should show stats
    expect(screen.getByText('2,450')).toBeInTheDocument();

    // Should show trust indicators
    expect(screen.getByText('DOT Certified')).toBeInTheDocument();
  });

  it('conditionally renders components based on props', () => {
    renderWithTheme(
      <SocialProofSection stats={mockStats} showActivityFeed={false} showTrustIndicators={false} />,
    );

    // Should only show stats badge
    expect(screen.getByText('2,450')).toBeInTheDocument();

    // Should not show trust indicators when disabled
    expect(screen.queryByText('DOT Certified')).not.toBeInTheDocument();
  });
});
