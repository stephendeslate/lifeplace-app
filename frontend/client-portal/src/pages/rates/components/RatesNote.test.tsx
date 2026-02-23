// pages/rates/components/RatesNote.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RatesNote } from './RatesNote';

describe('RatesNote', () => {
  it('renders the component', () => {
    render(<RatesNote />);
    expect(screen.getByText('Important Notes')).toBeInTheDocument();
  });

  it('displays all important note items', () => {
    render(<RatesNote />);

    // Check for all note labels
    expect(screen.getByText(/VAT:/)).toBeInTheDocument();
    expect(screen.getByText(/Minimum Participants:/)).toBeInTheDocument();
    expect(screen.getByText(/Cabanas & Function Halls:/)).toBeInTheDocument();
    expect(screen.getByText(/Custom Packages:/)).toBeInTheDocument();
  });

  it('displays VAT information correctly', () => {
    render(<RatesNote />);
    expect(screen.getByText(/12% VAT is not included in the quoted prices/)).toBeInTheDocument();
  });

  it('displays minimum participants information', () => {
    render(<RatesNote />);
    expect(
      screen.getByText(/Most packages require a minimum of 80 participants/),
    ).toBeInTheDocument();
  });

  it('displays cabanas and function halls information', () => {
    render(<RatesNote />);
    expect(
      screen.getByText(/These are excluded from base package rates and can be added as upgrades/),
    ).toBeInTheDocument();
  });

  it('displays custom packages information', () => {
    render(<RatesNote />);
    expect(
      screen.getByText(/Contact us for customized packages tailored to your specific needs/),
    ).toBeInTheDocument();
  });

  it('displays contact email', () => {
    render(<RatesNote />);
    expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
  });

  it('displays contact phone number', () => {
    render(<RatesNote />);
    expect(screen.getByText('+63 993 526 0943')).toBeInTheDocument();
  });

  it('renders the info icon', () => {
    const { container } = render(<RatesNote />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('has proper structure with Section, Container, and ModernCard', () => {
    const { container } = render(<RatesNote />);
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
  });

  it('displays contact information section with proper styling', () => {
    render(<RatesNote />);
    const contactText = screen.getByText(/For inquiries and reservations/);
    expect(contactText).toBeInTheDocument();
  });
});
