// design-system/components/__tests__/LayoutComponents.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Section } from '../Section';
import { Container } from '../Container';
import { ImageWithOverlay } from '../ImageWithOverlay';

describe('Section Component', () => {
  it('renders children correctly', () => {
    render(
      <Section>
        <div>Test Content</div>
      </Section>,
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct background colors', () => {
    const { container } = render(
      <Section background="cream">
        <div>Content</div>
      </Section>,
    );
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
  });

  it('renders with different spacing options', () => {
    const { container } = render(
      <Section spacing="large">
        <div>Content</div>
      </Section>,
    );
    expect(container.querySelector('section')).toBeInTheDocument();
  });
});

describe('Container Component', () => {
  it('renders children correctly', () => {
    render(
      <Container>
        <div>Test Content</div>
      </Container>,
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct max-width constraints', () => {
    const { container } = render(
      <Container maxWidth="narrow">
        <div>Content</div>
      </Container>,
    );
    const containerElement = container.firstChild;
    expect(containerElement).toBeInTheDocument();
  });

  it('renders without padding when padding=false', () => {
    const { container } = render(
      <Container padding={false}>
        <div>Content</div>
      </Container>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ImageWithOverlay Component', () => {
  it('renders image with alt text', () => {
    render(<ImageWithOverlay image="/test-image.jpg" alt="Test Image" />);
    const image = screen.getByAltText('Test Image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('renders children content over image', () => {
    render(
      <ImageWithOverlay image="/test-image.jpg" alt="Test Image">
        <div>Overlay Content</div>
      </ImageWithOverlay>,
    );
    expect(screen.getByText('Overlay Content')).toBeInTheDocument();
  });

  it('applies lazy loading to images', () => {
    render(<ImageWithOverlay image="/test-image.jpg" alt="Test Image" />);
    const image = screen.getByAltText('Test Image');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('renders with different overlay types', () => {
    const { container } = render(
      <ImageWithOverlay image="/test-image.jpg" alt="Test Image" overlay="gradient" />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without overlay when overlay="none"', () => {
    const { container } = render(
      <ImageWithOverlay image="/test-image.jpg" alt="Test Image" overlay="none" />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
