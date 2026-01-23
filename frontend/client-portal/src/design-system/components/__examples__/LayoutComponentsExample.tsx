// design-system/components/__examples__/LayoutComponentsExample.tsx
/**
 * Example usage of layout components
 *
 * This file demonstrates how to use Section, Container, and ImageWithOverlay
 * components together to create consistent, responsive page layouts.
 */

import { Typography } from '@mui/material';
import { Section } from '../Section';
import { Container } from '../Container';
import { ImageWithOverlay } from '../ImageWithOverlay';

/**
 * Example 1: Basic Section with Container
 */
export const BasicSectionExample = () => (
  <Section background="cream" spacing="large">
    <Container maxWidth="content">
      <Typography variant="h1" gutterBottom>
        Welcome to LifePlace
      </Typography>
      <Typography variant="body1">
        Create unforgettable celebrations in our beautiful venues.
      </Typography>
    </Container>
  </Section>
);

/**
 * Example 2: Hero Section with Image Overlay
 */
export const HeroSectionExample = () => (
  <Section background="white" spacing="medium" fullWidth>
    <Container maxWidth="wide">
      <ImageWithOverlay
        image="/path/to/hero-image.jpg"
        alt="Beautiful venue celebration"
        overlay="gradient"
        height={{ xs: '400px', md: '600px', lg: '700px' }}
      >
        <Typography variant="h1" color="white" textAlign="center">
          Your Dream Event Starts Here
        </Typography>
        <Typography variant="h4" color="white" textAlign="center" sx={{ mt: 2 }}>
          Experience luxury, nature, and celebration
        </Typography>
      </ImageWithOverlay>
    </Container>
  </Section>
);

/**
 * Example 3: Multiple Sections with Different Backgrounds
 */
export const MultiSectionExample = () => (
  <>
    {/* Hero Section */}
    <Section background="gradient" spacing="xlarge">
      <Container maxWidth="content">
        <Typography variant="h1" textAlign="center">
          Premium Event Spaces
        </Typography>
      </Container>
    </Section>

    {/* Features Section */}
    <Section background="cream" spacing="large">
      <Container maxWidth="content">
        <Typography variant="h2" gutterBottom>
          Why Choose LifePlace?
        </Typography>
        <Typography variant="body1">
          Our venues combine natural beauty with modern amenities.
        </Typography>
      </Container>
    </Section>

    {/* Gallery Section */}
    <Section background="sage" spacing="large">
      <Container maxWidth="wide">
        <Typography variant="h2" gutterBottom>
          Explore Our Venues
        </Typography>
        {/* Gallery content here */}
      </Container>
    </Section>

    {/* CTA Section */}
    <Section background="terracotta" spacing="medium">
      <Container maxWidth="narrow">
        <Typography variant="h2" color="white" textAlign="center">
          Ready to Book?
        </Typography>
      </Container>
    </Section>
  </>
);

/**
 * Example 4: Image Gallery with Different Overlays
 */
export const ImageGalleryExample = () => (
  <Section background="white" spacing="large">
    <Container maxWidth="wide">
      <Typography variant="h2" gutterBottom>
        Our Venues
      </Typography>

      {/* Dark overlay for light images */}
      <ImageWithOverlay
        image="/path/to/bright-venue.jpg"
        alt="Outdoor venue in sunlight"
        overlay="dark"
        height="400px"
        sx={{ mb: 3 }}
      >
        <Typography variant="h3" color="white">
          Garden Pavilion
        </Typography>
      </ImageWithOverlay>

      {/* Light overlay for dark images */}
      <ImageWithOverlay
        image="/path/to/evening-venue.jpg"
        alt="Evening celebration"
        overlay="light"
        height="400px"
        sx={{ mb: 3 }}
      >
        <Typography variant="h3" color="primary.dark">
          Evening Terrace
        </Typography>
      </ImageWithOverlay>

      {/* No overlay */}
      <ImageWithOverlay
        image="/path/to/interior-venue.jpg"
        alt="Interior ballroom"
        overlay="none"
        height="400px"
      />
    </Container>
  </Section>
);

/**
 * Example 5: Responsive Layout with Custom Sizing
 */
export const ResponsiveLayoutExample = () => (
  <Section
    background="cream"
    spacing="large"
    sx={{
      // Custom responsive overrides if needed
      py: { xs: 4, md: 8, lg: 12 }
    }}
  >
    <Container
      maxWidth="content"
      sx={{
        // Custom container styles if needed
        px: { xs: 2, sm: 4, md: 6 }
      }}
    >
      <ImageWithOverlay
        image="/path/to/responsive-image.jpg"
        alt="Responsive venue image"
        overlay="gradient"
        height={{
          xs: '300px',    // Mobile
          sm: '400px',    // Tablet
          md: '500px',    // Desktop
          lg: '600px',    // Large desktop
        }}
        objectFit="cover"
      >
        <Container maxWidth="narrow">
          <Typography
            variant="h1"
            color="white"
            textAlign="center"
            sx={{
              fontSize: { xs: '2rem', md: '3rem', lg: '4rem' }
            }}
          >
            Responsive Hero
          </Typography>
        </Container>
      </ImageWithOverlay>
    </Container>
  </Section>
);
