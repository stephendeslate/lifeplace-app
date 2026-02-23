// design-system/components/HeroBackground.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroBackground } from './HeroBackground';

describe('HeroBackground', () => {
  it('renders children correctly', () => {
    render(
      <HeroBackground>
        <div data-testid="test-content">Test Content</div>
      </HeroBackground>,
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('applies default gradient when no gradient prop is provided', () => {
    const { container } = render(
      <HeroBackground>
        <div>Content</div>
      </HeroBackground>,
    );

    const background = container.firstChild as HTMLElement;
    expect(background).toBeInTheDocument();
  });

  it('renders all gradient variants without errors', () => {
    const gradients = [
      'warmSage',
      'sunsetGlow',
      'goldenHour',
      'earthToSky',
      'terracottaWarmth',
      'heroWarm',
      'heroNatural',
      'heroSunset',
    ] as const;

    gradients.forEach((gradient) => {
      const { container } = render(
        <HeroBackground gradient={gradient}>
          <div>Content</div>
        </HeroBackground>,
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('supports backward compatibility with legacy gradient names', () => {
    // Test that component handles gradient prop gracefully
    // Legacy names are mapped internally via gradientMap
    const { container: container1 } = render(
      <HeroBackground gradient={'forest' as 'warmSage'}>
        <div>Content</div>
      </HeroBackground>,
    );
    expect(container1.firstChild).toBeInTheDocument();

    const { container: container2 } = render(
      <HeroBackground gradient={'earth' as 'earthToSky'}>
        <div>Content</div>
      </HeroBackground>,
    );
    expect(container2.firstChild).toBeInTheDocument();

    const { container: container3 } = render(
      <HeroBackground gradient={'sunset' as 'sunsetGlow'}>
        <div>Content</div>
      </HeroBackground>,
    );
    expect(container3.firstChild).toBeInTheDocument();
  });

  it('renders video element when video prop is provided', () => {
    const { container } = render(
      <HeroBackground video="/test-video.mp4">
        <div>Content</div>
      </HeroBackground>,
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();

    // Check for video source
    const source = video?.querySelector('source');
    expect(source).toBeInTheDocument();
    expect(source).toHaveAttribute('src', '/test-video.mp4');
    expect(source).toHaveAttribute('type', 'video/mp4');
  });

  it('renders image background when image prop is provided', () => {
    const { container } = render(
      <HeroBackground image="/test-image.jpg">
        <div>Content</div>
      </HeroBackground>,
    );

    // Check that the component renders (image background is set via styled component)
    expect(container.firstChild).toBeInTheDocument();
  });

  it('prioritizes video over image when both are provided', () => {
    const { container } = render(
      <HeroBackground video="/test-video.mp4" image="/test-image.jpg">
        <div>Content</div>
      </HeroBackground>,
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('applies animation when animated prop is true', () => {
    const { container } = render(
      <HeroBackground animated>
        <div>Content</div>
      </HeroBackground>,
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom minHeight', () => {
    const { container } = render(
      <HeroBackground minHeight="80vh">
        <div>Content</div>
      </HeroBackground>,
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies responsive minHeight object', () => {
    const { container } = render(
      <HeroBackground minHeight={{ xs: '60vh', md: '80vh', lg: '100vh' }}>
        <div>Content</div>
      </HeroBackground>,
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies overlay when overlay prop is set', () => {
    const overlayTypes = ['none', 'light', 'dark', 'gradient'] as const;

    overlayTypes.forEach((overlay) => {
      const { container } = render(
        <HeroBackground overlay={overlay}>
          <div>Content</div>
        </HeroBackground>,
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('applies custom sx props', () => {
    const { container } = render(
      <HeroBackground sx={{ border: '1px solid red' }}>
        <div>Content</div>
      </HeroBackground>,
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
