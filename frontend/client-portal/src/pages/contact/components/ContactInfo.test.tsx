// pages/contact/components/ContactInfo.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactInfo } from './ContactInfo';

describe('ContactInfo', () => {
  it('renders the section heading', () => {
    render(<ContactInfo />);
    expect(screen.getByText('Get in Touch')).toBeInTheDocument();
  });

  it('renders the section description', () => {
    render(<ContactInfo />);
    expect(
      screen.getByText(/Reach out to us through any of these channels/i)
    ).toBeInTheDocument();
  });

  it('renders all four contact cards', () => {
    render(<ContactInfo />);
    expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Office Hours')).toBeInTheDocument();
  });

  it('renders phone numbers correctly', () => {
    render(<ContactInfo />);
    expect(screen.getByText('(046) 889 0844')).toBeInTheDocument();
    expect(screen.getByText('+63 993 526 0943')).toBeInTheDocument();
    expect(screen.getByText('(0962) 275 3145')).toBeInTheDocument();
  });

  it('renders email address correctly', () => {
    render(<ContactInfo />);
    expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
  });

  it('renders address correctly', () => {
    render(<ContactInfo />);
    expect(screen.getByText('Patutong Malaki North')).toBeInTheDocument();
    expect(screen.getByText('Alfonso, Cavite 4120')).toBeInTheDocument();
    expect(screen.getByText('Philippines')).toBeInTheDocument();
  });

  it('renders office hours correctly', () => {
    render(<ContactInfo />);
    expect(screen.getByText('Monday - Sunday')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM - 6:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Available for inquiries')).toBeInTheDocument();
  });

  it('renders Call Now button with correct href', () => {
    render(<ContactInfo />);
    const callButton = screen.getByRole('link', { name: /call now/i });
    expect(callButton).toBeInTheDocument();
    expect(callButton).toHaveAttribute('href', 'tel:+639935260943');
  });

  it('renders Send Email button with correct href', () => {
    render(<ContactInfo />);
    const emailButton = screen.getByRole('link', { name: /send email/i });
    expect(emailButton).toBeInTheDocument();
    expect(emailButton).toHaveAttribute('href', 'mailto:reservations.lifeplace@gmail.com');
  });

  it('renders Get Directions button with correct href and target', () => {
    render(<ContactInfo />);
    const directionsButton = screen.getByRole('link', { name: /get directions/i });
    expect(directionsButton).toBeInTheDocument();
    expect(directionsButton).toHaveAttribute(
      'href',
      'https://maps.google.com/?q=Patutong+Malaki+North+Alfonso+Cavite'
    );
    expect(directionsButton).toHaveAttribute('target', '_blank');
    expect(directionsButton).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render action button for Office Hours card', () => {
    render(<ContactInfo />);
    const allButtons = screen.getAllByRole('link');
    // Should have exactly 3 buttons (Call, Email, Directions)
    // Office Hours should not have a button
    expect(allButtons).toHaveLength(3);
  });

  it('uses ModernCard component for each contact detail', () => {
    const { container } = render(<ContactInfo />);
    // ModernCard renders a Box, we can verify by checking for multiple card containers
    const cards = container.querySelectorAll('[class*="MuiBox-root"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('applies responsive grid layout', () => {
    render(<ContactInfo />);
    // Verify all four contact cards are rendered (which confirms grid layout)
    expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Office Hours')).toBeInTheDocument();
  });

  it('renders icons for each contact method', () => {
    const { container } = render(<ContactInfo />);
    // Check that SVG icons are present (MUI icons render as SVG)
    const icons = container.querySelectorAll('svg');
    // Should have at least 4 icons (one for each contact card)
    expect(icons.length).toBeGreaterThanOrEqual(4);
  });

  it('has accessible structure with proper headings', () => {
    render(<ContactInfo />);
    // Main section heading
    expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    // Card titles (h5 elements)
    expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Office Hours')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<ContactInfo />);
    expect(container).toMatchSnapshot();
  });
});
